/**
 * EmotionalSection — Observatory
 * Emotional axes with risk badges, sparklines, primary mood.
 */

import { motion } from 'framer-motion'
import { HeartStraight } from '@phosphor-icons/react'
import type { ObservatoryResponse, EmotionalState } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, TrendArrow, Sparkline, GlassCard } from './shared'

interface Props {
  data: ObservatoryResponse<EmotionalState>
}

const axisColors: Record<string, string> = {
  valence: '#34d399',
  arousal: '#f472b6',
  dominance: '#60a5fa',
  stability: '#a78bfa',
  tension: '#f87171',
  attachment_bond: '#fbbf24',
  attachment_trust: '#38bdf8',
}

export function EmotionalSection({ data }: Props) {
  const { data: d, meta } = data

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Emotional State" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-1.5">
          <HeartStraight className="h-3.5 w-3.5 text-pink-400" weight="fill" />
          <span className="text-[11px] capitalize">{d.primary_mood}</span>
        </div>
      </div>

      {/* Stability gauge */}
      <GlassCard className="flex items-center justify-between py-2.5 px-3">
        <span className="text-[11px] text-muted-foreground">Stability</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-background/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-red-400 via-amber-400 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(d.stability * 100)}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="text-[11px] font-mono">{Math.round(d.stability * 100)}%</span>
        </div>
      </GlassCard>

      {/* Axes */}
      <div className="space-y-1.5">
        {d.axes.map((axis) => (
          <motion.div
            key={axis.name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-2"
          >
            <RiskBadge risk={axis.risk} label="" />
            <span className="text-[11px] flex-1 capitalize">{axis.name.replace(/_/g, ' ')}</span>
            <Sparkline
              data={axis.history}
              color={axisColors[axis.name] ?? '#6b7280'}
              height={20}
              width={48}
            />
            <TrendArrow trend={axis.trend} />
            <span className="text-[11px] font-mono w-10 text-right">{axis.value.toFixed(2)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
