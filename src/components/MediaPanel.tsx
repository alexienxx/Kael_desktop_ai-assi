import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DownloadedMedia } from '@/lib/types'
import { Image, MusicNote, File } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'

interface MediaPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  media: DownloadedMedia[]
}

export function MediaPanel({ open, onOpenChange, media }: MediaPanelProps) {
  const images = media.filter(m => m.type === 'image')
  const audio = media.filter(m => m.type === 'audio')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] glass-strong">
        <SheetHeader>
          <SheetTitle className="text-xl">Downloaded Media</SheetTitle>
          <SheetDescription>
            All media saved from your conversations
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="images" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">
              <Image className="h-4 w-4 mr-2" />
              Images ({images.length})
            </TabsTrigger>
            <TabsTrigger value="audio">
              <MusicNote className="h-4 w-4 mr-2" />
              Audio ({audio.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="h-16 w-16 text-muted-foreground mb-4" weight="duotone" />
                  <p className="text-sm text-muted-foreground">No images downloaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-2">
                  {images.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-lg overflow-hidden glass-panel border border-border/50 hover:border-primary/50 transition-all"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                          <div className="text-xs text-white font-medium truncate">{item.filename}</div>
                          <div className="text-xs text-white/70">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {audio.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MusicNote className="h-16 w-16 text-muted-foreground mb-4" weight="duotone" />
                  <p className="text-sm text-muted-foreground">No audio files downloaded yet</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {audio.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg glass-panel border border-border/50 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <File className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
