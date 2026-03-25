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

  // Track the previous connection status so we can detect reconnects
  const prevConnectionStatus = useRef<ConnectionStatus>('disconnected')
  // Keep a ref to the current messages so connection/reconnect handlers can
  // seed the sync service with the latest local state without a stale closure.
  const messagesRef = useRef<Message[]>(messages || [])
  useEffect(() => {
    messagesRef.current = messages || []
  }, [messages])

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
                  lastMessage: msg.content.text?.substring(0, 50),
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
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      timestamp: new Date(),
      messageCount: 0
    }
    setConversations((current) => [newConv, ...(current || [])])
    setActiveConversationId(newConv.id)
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
      id: `msg-${Date.now()}`,
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
        const response = await backendService.sendMessage(text)

        // Create assistant message from backend response
        const assistantMessage: Message = {
          id: response.messageId,
          role: 'assistant',
          content: { type: 'text', text: response.content },
          timestamp: new Date(response.timestamp),
          conversationId: response.conversationId
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
          onOpenServices={() => setServicesOpen(true)}
          serviceContextChips={serviceContextChips}
          onRemoveContextChip={handleRemoveContextChip}
        />

        <Composer
          onSendMessage={handleSendMessage}
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
          <ObservatoryPage onClose={() => setObservatoryOpen(false)} />
        )}
      </AnimatePresence>

      <Toaster position="top-right" />
    </div>
  )
}

export default App