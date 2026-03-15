/**
 * ServiceCard Component
 *
 * Generic service card component for displaying service information.
 * Used for placeholder/future services.
 */

interface ServiceCardProps {
  icon: string
  name: string
  status: string
  description?: string
}

export function ServiceCard({ icon, name, status, description }: ServiceCardProps) {
  return (
    <div className="glass-panel rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">{name}</h4>
          {description && (
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
