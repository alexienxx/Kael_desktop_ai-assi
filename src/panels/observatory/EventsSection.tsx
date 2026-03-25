/**
 * EventsSection — Observatory
 * Event tape with severity indicators, counters.
 */

import { motion } from 'framer-motion'
import { Lightning, Info, Warning, XCircle } from '@phosphor-icons/react'
import type { ObservatoryResponse, RecentEvents, InternalEvent } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, GlassCard } from './shared'

interface Props {
  data: ObservatoryResponse<RecentEvents>
}

function severityIcon(severity: InternalEvent['severity']) {
  switch (severity) {
    case 'info': return <Info className="h-3 w-3 text-blue-400" />
    case 'warning': return <Warning className="h-3 w-3 text-amber-400" />
    case 'error': return <XCircle className="h-3 w-3 text-red-400" />
    case 'critical': return <XCircle className="h-3 w-3 text-red-500" weight="fill" />
  }
}

function severityColor(severity: InternalEvent['severity']) {
  switch (severity) {
    case 'info': return 'border-l-blue-400'
    case 'warning': return 'border-l-amber-400'
    case 'error': return 'border-l-red-400'
    case 'critical': return 'border-l-red-500'
  }
}

export function EventsSection({ data }: Props) {
  const { data: d, meta } = data

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Recent Events" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lightning className="h-3 w-3" /> {d.total_emitted} emitted
          </span>
          {d.callback_errors > 0 && (
            <span className="text-red-400">{d.callback_errors} errors</span>
          )}
        </div>
      </div>

      {/* Event tape */}
      {d.events.length > 0 ? (
        <div className="space-y-1">
          {d.events.map((ev, i) => (
            <motion.div
              key={`${ev.timestamp}-${ev.type}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex items-start gap-2 rounded-lg bg-background/30 px-3 py-2 border-l-2 ${severityColor(ev.severity)}`}
            >
              <div className="mt-0.5 shrink-0">{severityIcon(ev.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium">{ev.type}</span>
                  <span className="text-[10px] text-muted-foreground">{ev.source}</span>
                </div>
                {ev.message && (
                  <span className="text-[10px] text-muted-foreground truncate block">{ev.message}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Lightning className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
          <span className="text-[11px] text-muted-foreground">No recent events</span>
        </div>
      )}
    </div>
  )
}
