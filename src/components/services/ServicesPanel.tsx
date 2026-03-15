/**
 * ServicesPanel Component
 *
 * Main Services hub panel that displays connected services,
 * available services, and quick actions.
 *
 * Graceful degradation contract:
 * - When the backend is not configured, a setup prompt is shown instead of
 *   any service cards, so the UI never appears "ready" without a backend.
 * - When the backend is configured but the /services endpoint fails, the
 *   error is surfaced clearly and no fake connected-state is displayed.
 * - Service cards are only rendered for services explicitly reported as
 *   connected by the backend.
 */

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useServices } from '@/hooks/useServices'
import { GitHubServiceCard } from './GitHubServiceCard'
import { ServiceCard } from './ServiceCard'
import { Sparkle, WarningCircle, Plugs } from '@phosphor-icons/react'

interface ServicesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServiceContextChange?: (context: any) => void
}

export function ServicesPanel({ open, onOpenChange, onServiceContextChange }: ServicesPanelProps) {
  const { services, loading, error, backendConfigured } = useServices()

  const connectedServices = services.filter(s => s.connectionStatus === 'connected')

  // Get GitHub service only if it is explicitly connected per backend
  const githubService = services.find(
    s => s.provider === 'github' && s.connectionStatus === 'connected'
  )

  // Placeholder services for future implementation
  const futureServices = [
    { id: 'notion', name: 'Notion', icon: '📝', status: 'Available later' },
    { id: 'drive', name: 'Drive', icon: '📁', status: 'Available later' },
    { id: 'slack', name: 'Slack', icon: '💬', status: 'Available later' },
    { id: 'calendar', name: 'Calendar', icon: '📅', status: 'Available later' },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-0 glass-strong border-l border-white/10">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl font-light flex items-center gap-2">
                <Sparkle size={24} weight="duotone" className="text-primary" />
                Servizi
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Connessioni agentiche
              </SheetDescription>
            </SheetHeader>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading services...</p>
                </div>
              </div>
            )}

            {/* Backend not configured – show setup prompt, not fake service state */}
            {!loading && !backendConfigured && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 mb-6 flex gap-3">
                <Plugs size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-300 mb-1">Backend not configured</p>
                  <p className="text-xs text-yellow-400/80">
                    Open Settings and add your backend URL to enable agentic services.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 mb-6 flex gap-3">
                <WarningCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300 mb-1">Services unavailable</p>
                  <p className="text-xs text-red-400/80">{error}</p>
                </div>
              </div>
            )}

            {!loading && (
              <div className="space-y-8">
                {/* Connected Services Section – only shown when backend reports connected */}
                {connectedServices.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                      Collegati
                    </h3>
                    <div className="space-y-3">
                      {githubService && (
                        <GitHubServiceCard
                          service={githubService}
                          onContextChange={onServiceContextChange}
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* Not Connected / Future Services Section */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Altri servizi
                  </h3>
                  <div className="space-y-3">
                    {futureServices.map(service => (
                      <ServiceCard
                        key={service.id}
                        icon={service.icon}
                        name={service.name}
                        status={service.status}
                      />
                    ))}
                  </div>
                </section>

                {/* Empty state – only shown when backend is reachable but nothing is connected */}
                {backendConfigured && !error && connectedServices.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkle size={48} weight="duotone" className="text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No services connected yet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
