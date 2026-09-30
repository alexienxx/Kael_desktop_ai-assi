import { useState, KeyboardEvent } from 'react'
import { PaperPlaneRight, Paperclip, Microphone } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ComposerProps {
  onSendMessage: (text: string) => void
  onVoiceToggle?: () => void
  voiceState?: 'idle' | 'recording' | 'submitting'
  disabled?: boolean
}

export function Composer({
  onSendMessage,
  onVoiceToggle,
  voiceState = 'idle',
  disabled = false,
}: ComposerProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border/50 glass-strong p-4">
      <div className="flex items-end gap-3 max-w-5xl mx-auto">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full hover:bg-accent/30 transition-all shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceState === 'recording' ? 'Sto ascoltando…' : 'Message Arrakis...'}
            disabled={disabled || voiceState !== 'idle'}
            className="min-h-[52px] max-h-32 resize-none glass-panel border-white/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 font-message text-[15px]"
          />
        </div>

        <Button
          size="icon"
          variant={voiceState === 'recording' ? 'destructive' : 'ghost'}
          className={`h-10 w-10 rounded-full hover:bg-accent/30 transition-all shrink-0 ${
            voiceState === 'recording' ? 'animate-pulse' : ''
          }`}
          disabled={!onVoiceToggle || voiceState === 'submitting' || (disabled && voiceState === 'idle')}
          onClick={onVoiceToggle}
          aria-label={voiceState === 'recording' ? 'Ferma e invia messaggio vocale' : 'Registra messaggio vocale'}
          aria-pressed={voiceState === 'recording'}
          title={voiceState === 'recording' ? 'Ferma e invia' : 'Parla con Arrakis'}
        >
          <Microphone className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="h-12 w-12 rounded-full glow-accent shrink-0 transition-all duration-200 hover:scale-105"
        >
          <PaperPlaneRight weight="fill" className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${disabled ? 'bg-destructive' : 'bg-primary glow-accent'}`} />
          <span>{
            voiceState === 'recording' ? 'Registrazione in corso' :
            voiceState === 'submitting' ? 'Elaborazione vocale…' :
            disabled ? 'Offline' : 'Connected'
          }</span>
        </div>
      </div>
    </div>
  )
}
