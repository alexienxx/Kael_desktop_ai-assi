import { Message } from '@/lib/types'
import { AudioMessageCard } from './AudioMessageCard'
import { ImageMessageCard } from './ImageMessageCard'
import { formatDistanceToNow } from 'date-fns'
import { SpeakerHigh, StopCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface MessageBubbleProps {
  message: Message
  bubbleClasses: string
  showTimestamp: boolean
  onMediaDownload: (messageId: string, type: 'image' | 'audio') => void
  onSpeak: (message: Message) => void
  speaking: boolean
}

export function MessageBubble({ message, bubbleClasses, showTimestamp, onMediaDownload,
  onSpeak, speaking }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isExternalAgent = message.role === 'external_agent'

  const renderContent = () => {
    if (message.deliveryMode === 'voice_note') {
      const canPlay = !isUser && !isExternalAgent && Boolean(message.assistantTurnId)
      return (
        <div className={bubbleClasses}>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label={canPlay
                ? (speaking ? 'Interrompi la voce di Arrakis' : 'Ascolta Arrakis')
                : 'Messaggio vocale'}
              disabled={!canPlay}
              onClick={() => canPlay && onSpeak(message)}
            >
              {speaking
                ? <StopCircle weight="fill" className="h-5 w-5" />
                : <SpeakerHigh weight="fill" className="h-5 w-5" />}
            </Button>
            <span className="font-message text-[15px] leading-relaxed">
              {isUser ? 'Messaggio vocale' : 'Messaggio vocale di Arrakis'}
            </span>
          </div>
        </div>
      )
    }

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

  const agentLabel = isExternalAgent
    ? (message.externalAgentName ?? message.externalAgentId ?? 'External Agent')
    : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl`}>
        {isExternalAgent && agentLabel && (
          <span className="text-xs font-medium text-purple-500 mb-1 px-2">
            {agentLabel}
          </span>
        )}
        {renderContent()}
        {!isUser && !isExternalAgent && message.deliveryMode !== 'voice_note'
          && message.content.type === 'text'
          && message.assistantTurnId && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="mt-1 h-8 w-8 rounded-full"
            aria-label={speaking ? 'Interrompi la voce di Arrakis' : 'Ascolta Arrakis'}
            onClick={() => onSpeak(message)}
          >
            {speaking
              ? <StopCircle weight="fill" className="h-4 w-4" />
              : <SpeakerHigh weight="fill" className="h-4 w-4" />}
          </Button>
        )}
        
        {showTimestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-2">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  )
}
