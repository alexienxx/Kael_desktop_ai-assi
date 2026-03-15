import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IdentityData, DriftData, MemoryData, RuntimeData, AutonomyEvent, CognitiveEvent } from '@/lib/types'
import {
  fetchIdentity, fetchDrift, fetchMemory, fetchRuntime, fetchAutonomy,
  MOCK_IDENTITY, MOCK_DRIFT, MOCK_MEMORY, MOCK_RUNTIME, MOCK_AUTONOMY, MOCK_COGNITIVE_EVENTS,
} from '@/services/controlCenterService'
import { backendConfigStore } from '@/services/backendConfigStore'
import { CognitiveFlowPanel } from '@/panels/CognitiveFlowPanel'
import { IdentityPanel } from '@/panels/IdentityPanel'
import { DriftPanel } from '@/panels/DriftPanel'
import { MemoryPanel } from '@/panels/MemoryPanel'
import { SystemPanel } from '@/panels/SystemPanel'
import { AutonomyPanel } from '@/panels/AutonomyPanel'
import { ArrowsClockwise, WifiSlash } from '@phosphor-icons/react'

interface ControlCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const POLL_INTERVAL_MS = 5000

export function ControlCenter({ open, onOpenChange }: ControlCenterProps) {
  // Read backend config from the canonical store instead of KV directly.
  // This ensures Control Center and the chat service share the same config.
  const [hasBackend, setHasBackend] = useState(() => backendConfigStore.isConfigured())

  useEffect(() => {
    // Keep hasBackend in sync when config is updated via SettingsPanel
    const unsubscribe = backendConfigStore.subscribe((config) => {
      setHasBackend(Boolean(config?.baseUrl?.trim()))
    })
    return unsubscribe
  }, [])

  const [identity, setIdentity] = useState<IdentityData | null>(MOCK_IDENTITY)
  const [drift, setDrift] = useState<DriftData | null>(MOCK_DRIFT)
  const [memory, setMemory] = useState<MemoryData | null>(MOCK_MEMORY)
  const [runtime, setRuntime] = useState<RuntimeData | null>(MOCK_RUNTIME)
  const [autonomyEvents, setAutonomyEvents] = useState<AutonomyEvent[]>(MOCK_AUTONOMY)
  const [cognitiveEvents, setCognitiveEvents] = useState<CognitiveEvent[]>(MOCK_COGNITIVE_EVENTS)
  const [isLive, setIsLive] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refresh = useCallback(async () => {
    if (!backendConfigStore.isConfigured()) return

    try {
      const [id, dr, mem, rt, auto] = await Promise.allSettled([
        fetchIdentity(),
        fetchDrift(),
        fetchMemory(),
        fetchRuntime(),
        fetchAutonomy(),
      ])

      if (id.status === 'fulfilled') setIdentity(id.value)
      if (dr.status === 'fulfilled') setDrift(dr.value)
      if (mem.status === 'fulfilled') setMemory(mem.value)
      if (rt.status === 'fulfilled') setRuntime(rt.value)
      if (auto.status === 'fulfilled') {
        setAutonomyEvents(
          (auto.value as AutonomyEvent[]).map((e, i) => ({
            ...e,
            id: e.id ?? `${e.timestamp}-${e.reason}-${i}`,
          }))
        )
      }

      setIsLive(true)
      setLastRefresh(new Date())
    } catch {
      setIsLive(false)
    }
  }, [])

  // Rotate cognitive events for demo when offline
  useEffect(() => {
    if (isLive) return
    const stages = MOCK_COGNITIVE_EVENTS.map(e => e.stage)
    let idx = 0
    const timer = setInterval(() => {
      idx = (idx + 1) % stages.length
      setCognitiveEvents(
        MOCK_COGNITIVE_EVENTS.slice(0, idx + 1).map(e => ({ ...e, timestamp: Date.now() }))
      )
    }, 1200)
    return () => clearInterval(timer)
  }, [isLive])

  // Poll when open and backend is configured
  useEffect(() => {
    if (!open) return
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [open, refresh])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-3xl glass-strong overflow-hidden flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-lg font-semibold">Kael Control Center</SheetTitle>
            <div className="flex items-center gap-1.5">
              {isLive ? (
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
                    {hasBackend ? 'Offline — showing preview' : 'Demo mode'}
                  </span>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={refresh}
            title={`Last refresh: ${lastRefresh.toLocaleTimeString()}`}
          >
            <ArrowsClockwise className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="p-5">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3 mb-5">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="identity-drift" className="text-xs">Identity &amp; Drift</TabsTrigger>
                <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
              </TabsList>

              {/* ── Overview tab ── */}
              <TabsContent value="overview">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="col-span-2 p-4 rounded-xl glass-panel border border-border/40">
                      <CognitiveFlowPanel events={cognitiveEvents} />
                    </div>
                    <div className="p-4 rounded-xl glass-panel border border-border/40">
                      <MemoryPanel data={memory} />
                    </div>
                    <div className="p-4 rounded-xl glass-panel border border-border/40">
                      <AutonomyPanel events={autonomyEvents} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* ── Identity & Drift tab ── */}
              <TabsContent value="identity-drift">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="id-drift"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="p-4 rounded-xl glass-panel border border-border/40">
                      <IdentityPanel data={identity} />
                    </div>
                    <div className="p-4 rounded-xl glass-panel border border-border/40">
                      <DriftPanel data={drift} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* ── System tab ── */}
              <TabsContent value="system">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="system"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="p-4 rounded-xl glass-panel border border-border/40">
                      <SystemPanel data={runtime} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
