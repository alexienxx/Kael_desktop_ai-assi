import { RuntimeData, ServiceStatus } from '@/lib/types'
import { CheckCircle, Warning, XCircle, Circle, Timer } from '@phosphor-icons/react'

interface SystemPanelProps {
  data: RuntimeData | null
}

function statusIndicator(status: ServiceStatus) {
  switch (status) {
    case 'running':
      return { icon: CheckCircle, color: 'text-emerald-500', label: 'Running' }
    case 'active':
      return { icon: CheckCircle, color: 'text-emerald-400', label: 'Active' }
    case 'idle':
      return { icon: Circle, color: 'text-amber-400', label: 'Idle' }
    case 'error':
      return { icon: XCircle, color: 'text-rose-500', label: 'Error' }
    default:
      return { icon: Warning, color: 'text-muted-foreground', label: status }
  }
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function SystemPanel({ data }: SystemPanelProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        No runtime data available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">System Observatory</h3>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg glass-panel border border-border/30 flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary shrink-0" weight="fill" />
          <div>
            <div className="text-xs text-muted-foreground">Uptime</div>
            <div className="text-sm font-semibold">{formatUptime(data.uptime)}</div>
          </div>
        </div>
        <div className="p-2.5 rounded-lg glass-panel border border-border/30">
          <div className="text-xs text-muted-foreground">Modules</div>
          <div className="text-sm font-semibold">{data.modules_registered}</div>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-1.5">
        {Object.entries(data.services).map(([name, status]) => {
          const { icon: Icon, color, label } = statusIndicator(status)
          return (
            <div
              key={name}
              className="flex items-center gap-2 p-2 rounded-lg glass-panel border border-border/20"
            >
              <Icon className={`h-4 w-4 shrink-0 ${color}`} weight="fill" />
              <span className="flex-1 text-xs font-medium">{name.replace(/_/g, ' ')}</span>
              <span className={`text-xs ${color}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
