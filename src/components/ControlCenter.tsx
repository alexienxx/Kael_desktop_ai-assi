import { motion } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ArrowsClockwise, WifiSlash, ArrowsOut } from '@phosphor-icons/react'
import { useObservatoryData } from '@/hooks/useObservatoryData'
import { OverviewSection } from '@/panels/observatory/OverviewSection'
import { EmotionalSection } from '@/panels/observatory/EmotionalSection'
import { ModulesSection } from '@/panels/observatory/ModulesSection'
import {
  SectionLoading,
  SectionError,
  SectionUnconfigured,
  GlassCard,
} from '@/panels/observatory/shared'

interface ControlCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExpandObservatory?: () => void
}

export function ControlCenter({ open, onOpenChange, onExpandObservatory }: ControlCenterProps) {
  const { data, status, lastUpdate, refresh } = useObservatoryData(open)

  const handleExpand = () => {
    onOpenChange(false)
    onExpandObservatory?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-3xl glass-strong overflow-hidden flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-lg font-semibold">Arrakis Control Center</SheetTitle>
            <div className="flex items-center gap-1.5">
              {status === 'live' ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-emerald-400"
                  />
                  <span className="text-xs text-emerald-400">Live</span>
                </>
              ) : (
                <>
                  <WifiSlash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {status === 'unconfigured' ? 'Not configured' : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={refresh}
              title={lastUpdate ? `Last: ${lastUpdate.toLocaleTimeString()}` : 'Refresh'}
            >
              <ArrowsClockwise className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={handleExpand}
              title="Open full Observatory"
            >
              <ArrowsOut className="h-3.5 w-3.5 mr-1" />
              Expand
            </Button>
          </div>
        </SheetHeader>

        {/* Body — Quick view: Overview + Emotional + Modules */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {status === 'unconfigured' ? (
              <SectionUnconfigured />
            ) : status === 'loading' && !data ? (
              <SectionLoading />
            ) : status === 'error' && !data ? (
              <SectionError />
            ) : data ? (
              <>
                {/* Overview */}
                {data.overview && (
                  <GlassCard>
                    <OverviewSection data={data.overview} />
                  </GlassCard>
                )}

                {/* Emotional mini */}
                {data.emotional && (
                  <GlassCard>
                    <EmotionalSection data={data.emotional} />
                  </GlassCard>
                )}

                {/* Modules */}
                {data.modules && (
                  <GlassCard>
                    <ModulesSection data={data.modules} />
                  </GlassCard>
                )}

                {/* Expand hint */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleExpand}
                  >
                    <ArrowsOut className="h-3.5 w-3.5 mr-1.5" />
                    Open full Observatory (10 sections)
                  </Button>
                </div>
              </>
            ) : (
              <SectionLoading />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
