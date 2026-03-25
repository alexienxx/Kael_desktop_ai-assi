/**
 * WeightsSection — Observatory
 * Weight health: category filters, sparklines, impact tooltips.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gauge, FunnelSimple } from '@phosphor-icons/react'
import type { ObservatoryResponse, WeightsHealth } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, TrendArrow, Sparkline, ValueBar, GlassCard } from './shared'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface Props {
  data: ObservatoryResponse<WeightsHealth>
}

const categoryColors: Record<string, string> = {
  emotion: '#f472b6',
  drive: '#60a5fa',
  system: '#a78bfa',
}

export function WeightsSection({ data }: Props) {
  const { data: d, meta } = data
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory
    ? d.weights.filter((w) => w.category === activeCategory)
    : d.weights

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Weights Health" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.overall_risk} />
        <div className="flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{d.total_weights} weights</span>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5">
        <Button
          variant={activeCategory === null ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Button>
        {d.categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setActiveCategory(cat)}
          >
            <FunnelSimple className="h-3 w-3 mr-1" />
            {cat}
          </Button>
        ))}
      </div>

      {/* Weight list */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {filtered.map((w) => (
            <TooltipProvider key={w.name} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: categoryColors[w.category] ?? '#6b7280' }}
                    />
                    <span className="text-[11px] flex-1 truncate">{w.name}</span>
                    <Sparkline data={w.history} color={categoryColors[w.category]} height={20} width={48} />
                    <TrendArrow trend={w.trend} />
                    <span className="text-[11px] font-mono w-10 text-right">{w.value.toFixed(2)}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-48">
                  {w.impact}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
