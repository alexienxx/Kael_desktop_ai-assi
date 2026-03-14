import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Sidebar } from '@/components/Sidebar'
import { ChatWindow } from '@/components/ChatWindow'
import { Composer } from '@/components/Composer'
import { SettingsPanel } from '@/components/SettingsPanel'
import { MediaPanel } from '@/components/MediaPanel'
import { Message, Conversation, ThemeSettings, DownloadedMedia } from '@/lib/types'
import { defaultThemeSettings, applyThemeSettings, getBubbleClasses } from '@/lib/theme-config'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [conversations, setConversations] = useKV<Conversation[]>('kael-conversations', [])
  const [messages, setMessages] = useKV<Message[]>('kael-messages', [])
  const [downloadedMedia, setDownloadedMedia] = useKV<DownloadedMedia[]>('kael-downloaded-media', [])
  const [themeSettings, setThemeSettings] = useKV<ThemeSettings>('kael-theme-settings', defaultThemeSettings)
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)

  useEffect(() => {
    applyThemeSettings(themeSettings || defaultThemeSettings)
  }, [themeSettings])

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

  const handleSendMessage = (text: string) => {
    if (!activeConversationId) {
      handleNewChat()
      return
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: { type: 'text', text },
      timestamp: new Date(),
      conversationId: activeConversationId
    }

    setMessages((current) => [...(current || []), userMessage])

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
  }

  const handleMediaDownload = (messageId: string, type: 'image' | 'audio') => {
    const message = (messages || []).find(m => m.id === messageId)
    if (!message) return

    const url = type === 'image' ? message.content.imageUrl : message.content.audioUrl
    if (!url) return

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
          disabled={false}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        themeSettings={themeSettings || defaultThemeSettings}
        onThemeSettingsChange={setThemeSettings}
      />

      <MediaPanel
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        media={downloadedMedia || []}
      />

      <Toaster position="top-right" />
    </div>
  )
}

export default App