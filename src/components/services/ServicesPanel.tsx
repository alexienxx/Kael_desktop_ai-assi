/**
 * ServicesPanel Component
 *
 * Main Services hub panel that displays connected services,
 * available services, and quick actions.
 */

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useServices } from '@/hooks/useServices'
import { GitHubServiceCard } from './GitHubServiceCard'
import { ServiceCard } from './ServiceCard'
import { Sparkle } from '@phosphor-icons/react'

interface ServicesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServiceContextChange?: (context: any) => void
}

export function ServicesPanel({ open, onOpenChange, onServiceContextChange }: ServicesPanelProps) {
  const { services, loading, error } = useServices()

  const connectedServices = services.filter(s => s.connectionStatus === 'connected')
  const availableServices = services.filter(s => s.connectionStatus !== 'connected')

  // Get GitHub service if available
  const githubService = services.find(s => s.provider === 'github')

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

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 mb-6">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-8">
                {/* Connected Services Section */}
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

                {/* Empty state if no services */}
                {connectedServices.length === 0 && (
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
