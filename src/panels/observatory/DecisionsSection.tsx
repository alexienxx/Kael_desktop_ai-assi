/**
 * DecisionsSection — Observatory
 * Action distribution, decision paths, top factors.
 */

import { motion } from 'framer-motion'
import { TreeStructure, Path } from '@phosphor-icons/react'
import type { ObservatoryResponse, DecisionPreferences } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, GlassCard } from './shared'
import { Progress } from '@/components/ui/progress'

interface Props {
  data: ObservatoryResponse<DecisionPreferences>
}

const actionColors = ['#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#38bdf8', '#c084fc']

export function DecisionsSection({ data }: Props) {
  const { data: d, meta } = data

  const maxCount = Math.max(...Object.values(d.action_distribution), 1)
  const entries = Object.entries(d.action_distribution).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Decision Preferences" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-1">
          <TreeStructure className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{d.total_decisions} total decisions</span>
        </div>
      </div>

      {/* Action distribution */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Action Distribution</span>
          {entries.map(([action, count], i) => (
            <motion.div
              key={action}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] truncate max-w-[60%]">{action}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
              </div>
              <Progress value={Math.round((count / maxCount) * 100)} className="h-1" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent decision paths */}
      {d.recent_paths.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Recent Paths</span>
          {d.recent_paths.slice(0, 6).map((p, i) => (
            <motion.div
              key={`${p.action}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-1.5"
            >
              <Path className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] flex-1 truncate">{p.action}</span>
              <span className="text-[10px] font-mono text-muted-foreground">×{p.count}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Top factors */}
      {d.top_factors.length > 0 && (
        <div>
          <span className="text-[11px] text-muted-foreground font-medium mb-1.5 block">Top Factors</span>
          <div className="flex flex-wrap gap-1">
            {d.top_factors.map((f, i) => (
              <span
                key={f}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border/40"
                style={{ borderColor: actionColors[i % actionColors.length] + '40', color: actionColors[i % actionColors.length] }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
