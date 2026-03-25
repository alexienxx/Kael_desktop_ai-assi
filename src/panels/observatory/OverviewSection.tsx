/**
 * OverviewSection — Observatory
 * Core status: model, uptime, heartbeat, modules, flags, subsystem grid.
 */

import { motion } from 'framer-motion'
import { Pulse, Timer, Package, Gear } from '@phosphor-icons/react'
import type { ObservatoryResponse, CoreOverview } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, SubsystemStatusDot, GlassCard } from './shared'

interface Props {
  data: ObservatoryResponse<CoreOverview>
}

export function OverviewSection({ data }: Props) {
  const { data: d, meta } = data

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Core Overview" />
      <RiskBadge risk={d.risk} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="flex flex-col items-center gap-1 py-3">
          <Gear className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Model</span>
          <span className="text-xs font-medium truncate max-w-full">{d.model}</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center gap-1 py-3">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Uptime</span>
          <span className="text-xs font-medium">{formatUptime(d.uptime_seconds)}</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center gap-1 py-3">
          <Pulse className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Heartbeat</span>
          <span className="text-xs font-medium">{d.heartbeat_age_s.toFixed(1)}s</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center gap-1 py-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Modules</span>
          <span className="text-xs font-medium">{d.modules_active}/{d.modules_total}</span>
        </GlassCard>
      </div>

      {/* Flags */}
      {Object.keys(d.flags).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(d.flags).map(([key, val]) => (
            <span
              key={key}
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                val ? 'bg-emerald-400/10 text-emerald-400' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {key.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Subsystem grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {d.subsystems.map((sub) => (
          <motion.div
            key={sub.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-lg bg-background/30 px-2.5 py-1.5"
          >
            <SubsystemStatusDot status={sub.status} />
            <span className="text-[11px] truncate">{sub.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
