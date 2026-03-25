/**
 * ObservatoryPage — Full-screen deep-dive Observatory
 *
 * 10 scrollable tabs matching the mobile Observatory layout.
 * Opened from ControlCenter "Expand" button or sidebar.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { X, ArrowsClockwise, Pulse } from '@phosphor-icons/react'
import { useObservatoryData } from '@/hooks/useObservatoryData'
import {
  SectionLoading,
  SectionError,
  SectionPending,
  SectionUnconfigured,
  GlassCard,
} from '@/panels/observatory/shared'
import {
  OverviewSection,
  WeightsSection,
  IdentitySection,
  DecisionsSection,
  EmotionalSection,
  MemorySection,
  PersonaSection,
  ModulesSection,
  EventsSection,
  DebugSection,
} from '@/panels/observatory'
import type { ObservatorySectionKey } from '@/lib/observatory-types'

interface ObservatoryPageProps {
  onClose: () => void
}

const TAB_CONFIG: { key: ObservatorySectionKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'weights', label: 'Weights' },
  { key: 'identity', label: 'Identity' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'memory', label: 'Memory' },
  { key: 'persona', label: 'Persona' },
  { key: 'modules', label: 'Modules' },
  { key: 'events', label: 'Events' },
  { key: 'debug', label: 'Debug' },
]

export function ObservatoryPage({ onClose }: ObservatoryPageProps) {
  const [activeTab, setActiveTab] = useState<ObservatorySectionKey>('overview')
  const { data, status, lastUpdate, refresh } = useObservatoryData(true)

  const renderSection = () => {
    if (status === 'unconfigured') return <SectionUnconfigured />
    if (status === 'loading' || (!data && status !== 'error')) return <SectionLoading />
    if (status === 'error' && !data) return <SectionError />
    if (!data) return <SectionPending />

    const section = data[activeTab]
    if (!section) return <SectionPending />

    switch (activeTab) {
      case 'overview': return <OverviewSection data={data.overview!} />
      case 'weights': return <WeightsSection data={data.weights!} />
      case 'identity': return <IdentitySection data={data.identity!} />
      case 'decisions': return <DecisionsSection data={data.decisions!} />
      case 'emotional': return <EmotionalSection data={data.emotional!} />
      case 'memory': return <MemorySection data={data.memory!} />
      case 'persona': return <PersonaSection data={data.persona!} />
      case 'modules': return <ModulesSection data={data.modules!} />
      case 'events': return <EventsSection data={data.events!} />
      case 'debug': return <DebugSection data={data.debug!} />
      default: return <SectionPending />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Kael Cognitive Observatory</h1>
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
              <span className="text-xs text-muted-foreground capitalize">{status}</span>
            )}
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-muted-foreground">
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={refresh}>
            <ArrowsClockwise className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab strip (horizontally scrollable) */}
      <div className="border-b border-border/40 shrink-0">
        <ScrollArea className="w-full">
          <div className="flex gap-1 px-6 py-2">
            {TAB_CONFIG.map(({ key, label }) => {
              const isActive = activeTab === key
              const sectionData = data?.[key]
              const hasData = !!sectionData

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`
                    relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                    }
                  `}
                >
                  {label}
                  {hasData && sectionData?.data && 'risk' in (sectionData.data as object) && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                        (sectionData.data as any).risk === 'critical' ? 'bg-red-400' :
                        (sectionData.data as any).risk === 'attention' ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>
    </motion.div>
  )
}
