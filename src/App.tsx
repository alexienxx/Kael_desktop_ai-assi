import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar'
import { ChatWindow } from '@/components/ChatWindow'
import { Composer } from '@/components/Composer'
import { SettingsPanel } from '@/components/SettingsPanel'
import { MediaPanel } from '@/components/MediaPanel'
import { ControlCenter } from '@/components/ControlCenter'
import { ServicesPanel } from '@/components/services/ServicesPanel'
import { ObservatoryPage } from '@/pages/ObservatoryPage'
import { Message, Conversation, ThemeSettings, DownloadedMedia, BackendConfig, ConnectionStatus, ServiceContextChip } from '@/lib/types'
import { defaultThemeSettings, applyThemeSettings, getBubbleClasses } from '@/lib/theme-config'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { backendService } from '@/services/backendService'
import { mediaService } from '@/services/mediaService'
import { conversationManager } from '@/services/conversationManager'
import { backendConfigStore } from '@/services/backendConfigStore'
import { chatSyncService } from '@/services/chatSyncService'
import { messagePreview } from '@/services/chatHistoryService'
import { nativeVoiceService } from '@/services/nativeVoiceService'
import {
  nativeVoiceInputService,
  type CapturedVoiceNote,
} from '@/services/nativeVoiceInputService'

function App() {
  const [conversations, setConversations] = useKV<Conversation[]>('kael-conversations', [])
  const [messages, setMessages] = useKV<Message[]>('kael-messages', [])
  const [downloadedMedia, setDownloadedMedia] = useKV<DownloadedMedia[]>('kael-downloaded-media', [])
  const [themeSettings, setThemeSettings] = useKV<ThemeSettings>('kael-theme-settings', defaultThemeSettings)
  const [backendConfig, setBackendConfig] = useKV<BackendConfig | null>('kael-backend-config', null)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [controlCenterOpen, setControlCenterOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [serviceContextChips, setServiceContextChips] = useState<ServiceContextChip[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [sending, setSending] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [voiceInputState, setVoiceInputState] = useState<'idle' | 'recording' | 'submitting'>('idle')
  const voiceCaptureContextRef = useRef<{ conversationId: string; clientMessageId: string } | null>(null)

  // Track the previous connection status so we can detect reconnects
  const prevConnectionStatus = useRef<ConnectionStatus>('disconnected')
  // Keep a ref to the current messages so connection/reconnect handlers can
  // seed the sync service with the latest local state without a stale closure.
  const messagesRef = useRef<Message[]>(messages || [])
  useEffect(() => {
    messagesRef.current = messages || []
  }, [messages])

  useEffect(() => () => {
    void nativeVoiceInputService.cancel()
    void nativeVoiceService.stop()
  }, [])

  // Apply theme settings on mount and change
  useEffect(() => {
    applyThemeSettings(themeSettings || defaultThemeSettings)
  }, [themeSettings])

  // Configure backend service when config changes.
  // backendService.configure() calls backendConfigStore.set() internally,
  // propagating the config to all other services (e.g. controlCenterService).
  useEffect(() => {
    if (backendConfig) {
      backendService.configure(backendConfig)
    } else {
      // Ensure the store is cleared when no config is present
      backendConfigStore.set(null)
      chatSyncService.disconnect()
    }
  }, [backendConfig])

  // Subscribe to connection status changes; trigger chat sync on connect/reconnect
  useEffect(() => {
    const unsubscribe = backendService.onConnectionStatusChange((status) => {
      setConnectionStatus(status)

      const wasConnected = prevConnectionStatus.current === 'connected'
      const isNowConnected = status === 'connected'
      prevConnectionStatus.current = status

      if (isNowConnected) {
        const convId = activeConversationId ?? undefined
        if (wasConnected) {
          // Reconnect: only reconcile pending messages (avoid full re-render flash)
          chatSyncService.reconcilePending(convId).catch((err) => {
            console.warn('[App] Pending reconciliation failed:', err)
          })
        } else {
          // Fresh connect: seed local KV messages as known so they are not
          // duplicated when backend history arrives, then restore full history.
          chatSyncService.seedKnownIds(messagesRef.current)
          chatSyncService.connect(convId).catch((err) => {
            console.warn('[App] Chat sync connect failed:', err)
          })
        }
      }
    })

    // Get initial status
    const initial = backendService.getConnectionStatus()
    setConnectionStatus(initial)
    prevConnectionStatus.current = initial

    return unsubscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register chat sync observers (history restore + individual messages from SSE/pending)
  useEffect(() => {
    const unsubHistory = chatSyncService.onHistoryRestore((backendMessages) => {
      // Replace KV messages for conversations we now have backend truth for
      setMessages((current) => {
        const currentMsgs = current || []
        // Collect conversation IDs covered by backend history
        const coveredConvIds = new Set(backendMessages.map((m) => m.conversationId))
        // Keep local messages for conversations not covered by backend history
        const notCovered = currentMsgs.filter((m) => !coveredConvIds.has(m.conversationId))
        return [...notCovered, ...backendMessages]
      })

      // Rebuild sidebar previews from canonical presentation metadata.  A
      // voice note keeps its recognized/generated surface internal even when
      // an older local KV preview still contains that text.
      const latestByConversation = new Map<string, Message>()
      for (const message of backendMessages) {
        const previous = latestByConversation.get(message.conversationId)
        if (!previous || message.timestamp >= previous.timestamp) {
          latestByConversation.set(message.conversationId, message)
        }
      }
      setConversations((current) => (current || []).map((conversation) => {
        const latest = latestByConversation.get(conversation.id)
        return latest
          ? {
              ...conversation,
              lastMessage: messagePreview(latest),
              timestamp: latest.timestamp,
            }
          : conversation
      }))

      // Seed known IDs so SSE/pending don't re-emit these messages
      chatSyncService.seedKnownIds(backendMessages)
    })

    const unsubMessage = chatSyncService.onMessageArrived((msg) => {
      setMessages((current) => {
        const currentMsgs = current || []
        // Guard against duplicates (belt-and-suspenders beyond service-level dedup)
        if (currentMsgs.some((m) => m.id === msg.id)) return currentMsgs
        return [...currentMsgs, msg]
      })

      // Update conversation metadata when a backend-driven message arrives
      if (msg.conversationId) {
        setConversations((current) =>
          (current || []).map((conv) =>
            conv.id === msg.conversationId
              ? {
                  ...conv,
                  lastMessage: messagePreview(msg),
                  timestamp: msg.timestamp,
                  messageCount: conv.messageCount + 1,
                }
              : conv
          )
        )
      }
    })

    return () => {
      unsubHistory()
      unsubMessage()
    }
  // setMessages and setConversations are stable KV setters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync active conversation with conversation manager
  useEffect(() => {
    if (activeConversationId) {
      conversationManager.setActiveConversationId(activeConversationId)
      // When switching conversations while connected, restore history for the new one
      if (backendService.isConnected()) {
        chatSyncService.seedKnownIds(messagesRef.current)
        chatSyncService.connect(activeConversationId).catch((err) => {
          console.warn('[App] Chat sync on conversation switch failed:', err)
        })
      }
    }
  }, [activeConversationId])
  const activeConversation = (conversations || []).find(c => c.id === activeConversationId)
  const activeMessages = (messages || []).filter(m => m.conversationId === activeConversationId)

  const handleNewChat = () => {
    const id = `conv-${Date.now()}`
    const newConv: Conversation = {
      id,
      title: 'New Conversation',
      timestamp: new Date(),
      messageCount: 0
    }
    setConversations((current) => [newConv, ...(current || [])])
    setActiveConversationId(id)
    return id
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
  }

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId) {
      handleNewChat()
      return
    }

    // Create user message immediately
    const userMessage: Message = {
      id: globalThis.crypto.randomUUID(),
      role: 'user',
      content: { type: 'text', text },
      timestamp: new Date(),
      conversationId: activeConversationId
    }

    setMessages((current) => [...(current || []), userMessage])

    // Update conversation metadata
    setConversations((current) =>
      (current || []).map(conv =>
        conv.id === activeConversationId
          ? {
              ...conv,
              lastMessage: text.substring(0, 50),
              timestamp: new Date(),
              messageCount: conv.messageCount + 1,
              title: conv.messageCount === 0 ? text.substring(0, 30) : conv.title
            }
          : conv
      )
    )

    // If backend is configured and connected, send to backend
    if (backendService.isConnected()) {
      setSending(true)
      try {
        const response = await backendService.sendMessage(text, userMessage.id)

        // Create assistant message from backend response
        const assistantMessage: Message = {
          id: response.messageId,
          role: 'assistant',
          content: { type: 'text', text: response.content },
          timestamp: new Date(response.timestamp),
          conversationId: response.conversationId,
          assistantTurnId: response.assistantTurnId,
        }

        setMessages((current) => [...(current || []), assistantMessage])

        // Update conversation with assistant response
        setConversations((current) =>
          (current || []).map(conv =>
            conv.id === response.conversationId
              ? {
                  ...conv,
                  lastMessage: response.content.substring(0, 50),
                  timestamp: new Date(response.timestamp),
                  messageCount: conv.messageCount + 1
                }
              : conv
          )
        )

        toast.success('Message sent successfully')
      } catch (error) {
        console.error('Failed to send message:', error)
        toast.error(
          error instanceof Error ? error.message : 'Failed to send message'
        )
      } finally {
        setSending(false)
      }
    }
  }

  const submitCapturedVoiceNote = async (
    note: CapturedVoiceNote,
    context: { conversationId: string; clientMessageId: string }
  ) => {
    setVoiceInputState('submitting')
    setSending(true)
    const placeholder: Message = {
      id: context.clientMessageId,
      role: 'user',
      content: { type: 'text', text: '🎙️ Messaggio vocale…' },
      timestamp: new Date(),
      conversationId: context.conversationId,
      deliveryMode: 'voice_note',
    }
    setMessages((current) => [...(current || []), placeholder])
    try {
      const response = await backendService.sendVoiceNote(
        note.audio,
        context.clientMessageId,
        context.conversationId,
      )
      const assistantMessage: Message = {
        id: response.messageId,
        role: 'assistant',
        content: { type: 'text', text: response.content },
        timestamp: new Date(response.timestamp),
        conversationId: response.conversationId,
        assistantTurnId: response.assistantTurnId,
        deliveryMode: 'voice_note',
      }
      setMessages((current) => [...(current || []), assistantMessage])
      setConversations((current) => (current || []).map((conversation) =>
        conversation.id === context.conversationId
          ? {
              ...conversation,
              title: conversation.messageCount === 0
                ? 'Conversazione vocale'
                : conversation.title,
              lastMessage: 'Messaggio vocale di Arrakis',
              timestamp: new Date(response.timestamp),
              messageCount: conversation.messageCount + 2,
            }
          : conversation
      ))
      setVoiceInputState('idle')
      if (response.assistantTurnId) {
        setSpeakingMessageId(assistantMessage.id)
        try {
          await nativeVoiceService.playAssistantTurn(
            response.assistantTurnId,
            response.conversationId,
          )
        } catch (error) {
          console.warn('[App] automatic voice response could not start', error)
          toast.info('Risposta pronta: premi l’altoparlante per ascoltarla.')
        } finally {
          setSpeakingMessageId((current) => current === assistantMessage.id ? null : current)
        }
      }
    } catch (error) {
      setMessages((current) => (current || []).filter(
        (message) => message.id !== context.clientMessageId
      ))
      console.error('Failed to send voice note:', error)
      toast.error(error instanceof Error ? error.message : 'Invio vocale non riuscito')
    } finally {
      voiceCaptureContextRef.current = null
      setSending(false)
      setVoiceInputState('idle')
    }
  }

  const handleVoiceToggle = async () => {
    if (voiceInputState === 'submitting') return
    if (voiceInputState === 'recording') {
      const context = voiceCaptureContextRef.current
      if (!context) return
      setVoiceInputState('submitting')
      try {
        const note = await nativeVoiceInputService.stop()
        await submitCapturedVoiceNote(note, context)
      } catch (error) {
        voiceCaptureContextRef.current = null
        setVoiceInputState('idle')
        toast.error(error instanceof Error ? error.message : 'Registrazione non riuscita')
      }
      return
    }

    if (!backendService.isConnected()) {
      toast.error('Backend non connesso')
      return
    }
    if (speakingMessageId) {
      await nativeVoiceService.stop()
      setSpeakingMessageId(null)
    }
    const conversationId = activeConversationId ?? handleNewChat()
    const context = {
      conversationId,
      clientMessageId: globalThis.crypto.randomUUID(),
    }
    voiceCaptureContextRef.current = context
    try {
      const capabilities = await nativeVoiceInputService.start((note) => {
        if (voiceCaptureContextRef.current !== context) return
        void submitCapturedVoiceNote(note, context)
      })
      setVoiceInputState('recording')
      if (capabilities.echoCancellation !== true) {
        toast.info('Modalità registrazione attiva; AEC del dispositivo non confermata.')
      }
    } catch (error) {
      voiceCaptureContextRef.current = null
      setVoiceInputState('idle')
      toast.error(error instanceof Error ? error.message : 'Microfono non disponibile')
    }
  }

  const handleSpeak = async (message: Message) => {
    if (speakingMessageId === message.id) {
      await nativeVoiceService.stop()
      setSpeakingMessageId(null)
      return
    }
    if (!message.assistantTurnId) return
    if (speakingMessageId) {
      // Releasing the previous AudioContext crosses an async boundary and can
      // consume the browser's transient user activation. This click therefore
      // performs the guaranteed local stop; a fresh click starts the selected
      // turn with a fresh, valid activation.
      await nativeVoiceService.stop()
      setSpeakingMessageId(null)
      return
    }
    setSpeakingMessageId(message.id)
    try {
      await nativeVoiceService.playAssistantTurn(
        message.assistantTurnId, message.conversationId
      )
    } catch (error) {
      console.error('Native voice playback failed:', error)
      toast.error(error instanceof Error ? error.message : 'Voice playback failed')
    } finally {
      setSpeakingMessageId(current => current === message.id ? null : current)
    }
  }

  const handleMediaDownload = async (messageId: string, type: 'image' | 'audio') => {
    const message = (messages || []).find(m => m.id === messageId)
    if (!message) return

    try {
      const ref = type === 'image' ? message.content.imageUrl : message.content.audioUrl
      if (!ref) return

      // Get conversation title for filename
      const conversation = (conversations || []).find(c => c.id === message.conversationId)
      const conversationTitle = conversation?.title

      let result
      if (backendService.isConnected()) {
        // Pass the raw ref (URL, path, or ID) – mediaService resolves it via
        // resolveMediaUrl in backendContract so we never need to parse URLs here.
        if (type === 'image') {
          result = await mediaService.downloadImage(ref, { conversationTitle })
        } else {
          result = await mediaService.downloadAudio(ref, { conversationTitle })
        }

        if (result.success) {
          const media: DownloadedMedia = {
            id: `media-${Date.now()}`,
            type,
            url: result.url || ref,
            filename: result.filename,
            timestamp: new Date(),
            conversationId: message.conversationId,
            messageId: message.id
          }

          setDownloadedMedia((current) => [media, ...(current || [])])
          toast.success(`${type === 'image' ? 'Image' : 'Audio'} downloaded successfully`)
        } else {
          toast.error(result.error || 'Download failed')
        }
      } else {
        // Fallback: just store the URL reference
        const media: DownloadedMedia = {
          id: `media-${Date.now()}`,
          type,
          url: ref,
          filename: type === 'image' ? `image-${Date.now()}.png` : `audio-${Date.now()}.mp3`,
          timestamp: new Date(),
          conversationId: message.conversationId,
          messageId: message.id
        }

        setDownloadedMedia((current) => [media, ...(current || [])])
        toast.info('Backend not connected - media reference saved')
      }
    } catch (error) {
      console.error('Media download error:', error)
      toast.error('Failed to download media')
    }
  }

  const handleBackendConfigChange = (config: BackendConfig) => {
    setBackendConfig(config)
    toast.success('Backend configuration saved')
  }

  const handleTestConnection = async () => {
    if (!backendConfig) {
      toast.error('No backend configuration')
      return
    }

    try {
      backendService.configure(backendConfig)
      toast.success('Connection test successful')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Connection test failed'
      )
    }
  }

  const getBubbleStyleForRole = (role: 'user' | 'assistant') => {
    return getBubbleClasses((themeSettings || defaultThemeSettings).bubbleStyle, role)
  }

  const handleServiceContextChange = (context: ServiceContextChip) => {
    setServiceContextChips((current) => [...current, context])
    setServicesOpen(false)
    toast.success(`Service context added: ${context.repoLabel || context.provider}`)
  }

  const handleRemoveContextChip = (chipId: string) => {
    setServiceContextChips((current) => current.filter(c => c.id !== chipId))
  }

  return (
    <div className="h-screen overflow-hidden gradient-mesh flex">
      <Sidebar
        conversations={conversations || []}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMedia={() => setMediaOpen(true)}
        onOpenControlCenter={() => setControlCenterOpen(true)}
      />

      <div className="flex-1 flex flex-col">
        <ChatWindow
          messages={activeMessages}
          themeSettings={themeSettings || defaultThemeSettings}
          bubbleClasses={getBubbleStyleForRole}
          onMediaDownload={handleMediaDownload}
          onSpeak={handleSpeak}
          speakingMessageId={speakingMessageId}
          onOpenServices={() => setServicesOpen(true)}
          serviceContextChips={serviceContextChips}
          onRemoveContextChip={handleRemoveContextChip}
        />

        <Composer
          onSendMessage={handleSendMessage}
          onVoiceToggle={handleVoiceToggle}
          voiceState={voiceInputState}
          disabled={sending || !backendService.isConfigured()}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        themeSettings={themeSettings || defaultThemeSettings}
        onThemeSettingsChange={setThemeSettings}
        backendConfig={backendConfig ?? null}
        onBackendConfigChange={handleBackendConfigChange}
        connectionStatus={connectionStatus}
        onTestConnection={handleTestConnection}
      />

      <MediaPanel
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        media={downloadedMedia || []}
      />

      <ControlCenter
        open={controlCenterOpen}
        onOpenChange={setControlCenterOpen}
        onExpandObservatory={() => setObservatoryOpen(true)}
      />

      <ServicesPanel
        open={servicesOpen}
        onOpenChange={setServicesOpen}
        onServiceContextChange={handleServiceContextChange}
      />

      {/* Full Observatory overlay */}
      <AnimatePresence>
        {observatoryOpen && (
          <ObservatoryPage
            activeSessionId={activeConversationId}
            onClose={() => setObservatoryOpen(false)}
          />
        )}
      </AnimatePresence>

      <Toaster position="top-right" />
    </div>
  )
}

export default App
