import { motion } from 'framer-motion'
import { MemoryData } from '@/lib/types'
import { Database, Tag, ClockCounterClockwise } from '@phosphor-icons/react'

interface MemoryPanelProps {
  data: MemoryData | null
}

export function MemoryPanel({ data }: MemoryPanelProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        No memory data available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Memory Graph</h3>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg glass-panel border border-border/30 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary shrink-0" weight="fill" />
          <div>
            <div className="text-xs text-muted-foreground">Long-term</div>
            <div className="text-sm font-semibold">{data.long_term_count}</div>
          </div>
        </div>
        <div className="p-2.5 rounded-lg glass-panel border border-border/30 flex items-center gap-2">
          <ClockCounterClockwise className="h-4 w-4 text-secondary-foreground shrink-0" weight="fill" />
          <div>
            <div className="text-xs text-muted-foreground">Timeline</div>
            <div className="text-sm font-semibold">{data.timeline_events}</div>
          </div>
        </div>
      </div>

      {/* Recall confidence */}
      <div className="p-2.5 rounded-lg glass-panel border border-border/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Recall Confidence</span>
          <span className="text-xs font-semibold text-primary">
            {Math.round(data.recall_confidence * 100)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${data.recall_confidence * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Symbolic motifs */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Symbolic Motifs</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.symbolic_motifs.map((motif) => (
            <motion.span
              key={motif}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2 py-0.5 rounded-full text-xs glass-panel border border-primary/30 text-primary/90"
            >
              {motif}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}
