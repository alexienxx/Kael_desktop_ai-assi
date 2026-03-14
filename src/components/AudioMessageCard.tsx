import { Play, Pause, DownloadSimple } from '@phosphor-icons/react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'

interface AudioMessageCardProps {
  audioUrl: string
  duration: number
  onDownload: () => void
  bubbleStyle: string
}

export function AudioMessageCard({ audioUrl, duration, onDownload, bubbleStyle }: AudioMessageCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    
    audio.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    onDownload()
    toast.success('Audio saved to downloads')
  }

  return (
    <div className={`${bubbleStyle} w-full max-w-sm glow-soft`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlayPause}
          className="h-12 w-12 rounded-full bg-primary/20 hover:bg-primary/30 transition-all duration-200 glow-accent"
        >
          {isPlaying ? <Pause weight="fill" className="h-5 w-5" /> : <Play weight="fill" className="h-5 w-5" />}
        </Button>

        <div className="flex-1 space-y-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleDownload}
          className="h-10 w-10 rounded-full hover:bg-accent/30 transition-all duration-200"
        >
          <DownloadSimple className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-8 flex items-center gap-0.5">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = Math.sin(i * 0.5) * 12 + 12
            const isActive = (currentTime / duration) * 40 > i
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isActive ? 'bg-primary' : 'bg-primary/20'
                }`}
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
