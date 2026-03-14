import { AutonomyEvent } from '@/lib/types'
import { format } from 'date-fns'
import { Lightning } from '@phosphor-icons/react'

interface AutonomyPanelProps {
  events: AutonomyEvent[]
}

function confidenceColor(confidence: number) {
  if (confidence >= 0.75) return 'text-emerald-400'
  if (confidence >= 0.5) return 'text-amber-400'
  return 'text-rose-400'
}

export function AutonomyPanel({ events }: AutonomyPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Autonomy Monitor</h3>

      {events.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No autonomy events recorded
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 p-2.5 rounded-lg glass-panel border border-border/20 hover:border-primary/30 transition-colors"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary/70" />
                <div className="w-px flex-1 bg-border/30" />
              </div>

              {/* Event details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Lightning className="h-3 w-3 text-primary shrink-0" weight="fill" />
                  <span className="text-xs font-medium truncate">{event.action}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  reason: {event.reason}
                </div>
              </div>

              {/* Right column */}
              <div className="text-right shrink-0">
                <div className={`text-xs font-semibold ${confidenceColor(event.confidence)}`}>
                  {Math.round(event.confidence * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(event.timestamp), 'HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
