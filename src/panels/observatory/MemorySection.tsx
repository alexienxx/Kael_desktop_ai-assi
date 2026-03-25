/**
 * MemorySection — Observatory
 * DB status, counts, saturation, categories.
 */

import { motion } from 'framer-motion'
import { Database, HardDrives } from '@phosphor-icons/react'
import type { ObservatoryResponse, MemoryStats } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, ValueBar, GlassCard } from './shared'
import { Progress } from '@/components/ui/progress'

interface Props {
  data: ObservatoryResponse<MemoryStats>
}

export function MemorySection({ data }: Props) {
  const { data: d, meta } = data

  const stats = [
    { label: 'Conversations', value: d.conversation_turns },
    { label: 'Memory Items', value: d.memory_items },
    { label: 'Embeddings', value: d.memory_embeddings },
    { label: 'System Events', value: d.system_events },
    { label: 'Symbolic', value: d.symbolic_memory },
  ]

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Memory Status" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-1">
          <HardDrives className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{d.db_size_mb.toFixed(1)} MB</span>
        </div>
      </div>

      {/* Saturation */}
      <GlassCard className="py-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-blue-400" />
          <span className="text-[11px] text-muted-foreground">Saturation</span>
          <span className="text-[11px] font-mono ml-auto">{Math.round(d.saturation * 100)}%</span>
        </div>
        <ValueBar value={d.saturation} />
      </GlassCard>

      {/* Stat counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-0.5 rounded-lg bg-background/30 px-2 py-2"
          >
            <span className="text-sm font-bold text-foreground">{s.value.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Category breakdown */}
      {d.categories.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium">Category Breakdown</span>
          {d.categories.filter(c => c.count > 0).map((cat) => (
            <div key={cat.name} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">{cat.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{cat.percentage}%</span>
              </div>
              <Progress value={cat.percentage} className="h-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
