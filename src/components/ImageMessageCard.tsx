import { useState } from 'react'
import { DownloadSimple, MagnifyingGlassPlus } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ImageMessageCardProps {
  imageUrl: string
  alt?: string
  onDownload: () => void
  bubbleStyle: string
}

export function ImageMessageCard({ imageUrl, alt, onDownload, bubbleStyle }: ImageMessageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  const handleDownload = () => {
    onDownload()
    toast.success('Image saved to downloads')
  }

  return (
    <div className={`${bubbleStyle} overflow-hidden p-2 max-w-md glow-soft`}>
      <Dialog>
        <div className="relative group">
          <img
            src={imageUrl}
            alt={alt || 'Message image'}
            className={`w-full h-auto rounded-lg transition-all duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
          />
          
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-lg" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-end justify-center pb-3 gap-2">
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white text-foreground backdrop-blur-sm"
              >
                <MagnifyingGlassPlus className="h-4 w-4 mr-2" />
                View Full Size
              </Button>
            </DialogTrigger>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="bg-white/90 hover:bg-white text-foreground backdrop-blur-sm"
            >
              <DownloadSimple className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden glass-strong border-2">
          <div className="relative">
            <img
              src={imageUrl}
              alt={alt || 'Message image'}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            
            <div className="absolute top-4 right-4">
              <Button
                size="sm"
                onClick={handleDownload}
                className="glow-accent"
              >
                <DownloadSimple className="h-4 w-4 mr-2" />
                Save Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
