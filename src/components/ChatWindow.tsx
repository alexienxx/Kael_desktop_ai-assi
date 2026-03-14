import { useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkle } from '@phosphor-icons/react'
import { getSpacingClasses } from '@/lib/theme-config'
import { ThemeSettings } from '@/lib/types'

interface ChatWindowProps {
  messages: Message[]
  themeSettings: ThemeSettings
  bubbleClasses: (role: 'user' | 'assistant') => string
  onMediaDownload: (messageId: string, type: 'image' | 'audio') => void
}

export function ChatWindow({ messages, themeSettings, bubbleClasses, onMediaDownload }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const spacingClasses = getSpacingClasses(themeSettings.spacingMode)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-panel glow-soft">
            <Sparkle weight="duotone" className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Start a conversation</h2>
          <p className="text-muted-foreground">
            Send a message to begin chatting with Kael
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className={`${spacingClasses.container} max-w-4xl mx-auto`}>
        <div className={`flex flex-col ${spacingClasses.message}`}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              bubbleClasses={bubbleClasses(message.role)}
              showTimestamp={themeSettings.spacingMode !== 'compact'}
              onMediaDownload={onMediaDownload}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
