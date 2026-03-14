import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Sidebar } from '@/components/Sidebar'
import { ChatWindow } from '@/components/ChatWindow'
import { Composer } from '@/components/Composer'
import { SettingsPanel } from '@/components/SettingsPanel'
import { MediaPanel } from '@/components/MediaPanel'
import { ControlCenter } from '@/components/ControlCenter'
import { Message, Conversation, ThemeSettings, DownloadedMedia, BackendConfig, ConnectionStatus } from '@/lib/types'
import { defaultThemeSettings, applyThemeSettings, getBubbleClasses } from '@/lib/theme-config'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { backendService } from '@/services/backendService'
import { mediaService } from '@/services/mediaService'
import { conversationManager } from '@/services/conversationManager'

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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [sending, setSending] = useState(false)

  // Apply theme settings on mount and change
  useEffect(() => {
    applyThemeSettings(themeSettings || defaultThemeSettings)
  }, [themeSettings])

  // Configure backend service when config changes
  useEffect(() => {
    if (backendConfig) {
      backendService.configure(backendConfig)
    }
  }, [backendConfig])

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = backendService.onConnectionStatusChange((status) => {
      setConnectionStatus(status)
    })

    // Get initial status
    setConnectionStatus(backendService.getConnectionStatus())

    return unsubscribe
  }, [])

  // Sync active conversation with conversation manager
  useEffect(() => {
    if (activeConversationId) {
      conversationManager.setActiveConversationId(activeConversationId)
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
      // Extract media ID from URL if backend is configured
      // For now, use the full URL
      const url = type === 'image' ? message.content.imageUrl : message.content.audioUrl
      if (!url) return

      // Get conversation title for filename
      const conversation = (conversations || []).find(c => c.id === message.conversationId)
      const conversationTitle = conversation?.title

      let result
      if (backendService.isConnected()) {
        // Extract ID from URL (assuming format: /media/{type}/{id})
        const urlParts = url.split('/')
        const mediaId = urlParts[urlParts.length - 1]

        if (type === 'image') {
          result = await mediaService.downloadImage(mediaId, { conversationTitle })
        } else {
          result = await mediaService.downloadAudio(mediaId, { conversationTitle })
        }

        if (result.success) {
          const media: DownloadedMedia = {
            id: `media-${Date.now()}`,
            type,
            url: result.url || url,
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
          url,
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
        backendConfig={backendConfig}
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
      />

      <Toaster position="top-right" />
    </div>
  )
}

export default App