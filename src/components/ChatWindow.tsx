import { useRef, useEffect } from 'react'
import { Message, ServiceContextChip } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Sparkle } from '@phosphor-icons/react'
import { getSpacingClasses } from '@/lib/theme-config'
import { ThemeSettings } from '@/lib/types'
import { ServiceContextChips } from './services/ServiceContextChips'

interface ChatWindowProps {
  messages: Message[]
  themeSettings: ThemeSettings
  bubbleClasses: (role: 'user' | 'assistant') => string
  onMediaDownload: (messageId: string, type: 'image' | 'audio') => void
  onSpeak: (message: Message) => void
  speakingMessageId: string | null
  onOpenServices?: () => void
  serviceContextChips?: ServiceContextChip[]
  onRemoveContextChip?: (chipId: string) => void
}

export function ChatWindow({
  messages,
  themeSettings,
  bubbleClasses,
  onMediaDownload,
  onSpeak,
  speakingMessageId,
  onOpenServices,
  serviceContextChips = [],
  onRemoveContextChip
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const spacingClasses = getSpacingClasses(themeSettings.spacingMode)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const emptyState = messages.length === 0

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 glass-panel">
        <div className="flex items-center gap-2">
          <Sparkle weight="duotone" size={20} className="text-primary" />
          <span className="font-medium">Chat</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenServices}
          className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all"
        >
          <Sparkle weight="duotone" size={16} className="mr-2" />
          Servizi
        </Button>
      </div>

      {emptyState ? (
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
      ) : (
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className={`${spacingClasses.container} max-w-4xl mx-auto`}>
            {/* Service Context Chips */}
            {serviceContextChips.length > 0 && onRemoveContextChip && (
              <ServiceContextChips
                chips={serviceContextChips}
                onRemoveChip={onRemoveContextChip}
              />
            )}

            {/* Messages */}
            <div className={`flex flex-col ${spacingClasses.message}`}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  bubbleClasses={bubbleClasses(
                    message.role === 'user' ? 'user' : 'assistant'
                  )}
                  showTimestamp={themeSettings.spacingMode !== 'compact'}
                  onMediaDownload={onMediaDownload}
                  onSpeak={onSpeak}
                  speaking={speakingMessageId === message.id}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
