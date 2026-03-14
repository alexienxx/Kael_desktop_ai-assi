import { Message } from '@/lib/types'
import { AudioMessageCard } from './AudioMessageCard'
import { ImageMessageCard } from './ImageMessageCard'
import { formatDistanceToNow } from 'date-fns'

interface MessageBubbleProps {
  message: Message
  bubbleClasses: string
  showTimestamp: boolean
  onMediaDownload: (messageId: string, type: 'image' | 'audio') => void
}

export function MessageBubble({ message, bubbleClasses, showTimestamp, onMediaDownload }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const renderContent = () => {
    switch (message.content.type) {
      case 'text':
        return (
          <div className={bubbleClasses}>
            <p className="font-message text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content.text}
            </p>
          </div>
        )

      case 'audio':
        return (
          <AudioMessageCard
            audioUrl={message.content.audioUrl!}
            duration={message.content.audioDuration!}
            onDownload={() => onMediaDownload(message.id, 'audio')}
            bubbleStyle={bubbleClasses}
          />
        )

      case 'image':
        return (
          <ImageMessageCard
            imageUrl={message.content.imageUrl!}
            alt={message.content.imageAlt}
            onDownload={() => onMediaDownload(message.id, 'image')}
            bubbleStyle={bubbleClasses}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl`}>
        {renderContent()}
        
        {showTimestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-2">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  )
}
