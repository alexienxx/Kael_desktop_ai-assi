/**
 * GitHubServiceCard Component
 *
 * Service card specifically for GitHub integration.
 * Shows connection status, capabilities, and quick actions.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GithubLogo, CaretDown, CaretUp } from '@phosphor-icons/react'
import { RepoPickerDialog } from './RepoPickerDialog'
import type { Service, ServiceContextChip, GitHubActionMode } from '@/lib/types'

interface GitHubServiceCardProps {
  service: Service
  onContextChange?: (context: ServiceContextChip) => void
}

export function GitHubServiceCard({ service, onContextChange }: GitHubServiceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<GitHubActionMode | null>(null)

  const isConnected = service.connectionStatus === 'connected'

  const handleQuickAction = (mode: GitHubActionMode) => {
    setSelectedMode(mode)
    setRepoPickerOpen(true)
  }

  const handleRepoSelected = (repoFullName: string, repoType: 'generic' | 'self-repo', mode: GitHubActionMode) => {
    // Create context chip
    const context: ServiceContextChip = {
      id: `chip-${Date.now()}`,
      provider: 'github',
      repoLabel: repoFullName,
      repoType,
      modeLabel: getModeLabel(mode),
      selfRepo: repoType === 'self-repo',
      timestamp: new Date(),
    }

    onContextChange?.(context)
    setRepoPickerOpen(false)
  }

  const getModeLabel = (mode: GitHubActionMode): string => {
    const labels: Record<GitHubActionMode, string> = {
      repo_scan: 'Repo scan',
      pr_review: 'PR review',
      issue_review: 'Issue review',
      self_repo_scan: 'Self-repo scan',
      self_repo_diagnostics_correlation: 'Self-repo diagnostics',
      issue_draft: 'Issue draft',
    }
    return labels[mode] || mode
  }

  return (
    <>
      <div className="glass-panel rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#24292e] text-white">
            <GithubLogo size={24} weight="fill" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">{service.displayName}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 w-6 p-0"
              >
                {expanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </Button>
            </div>

            {service.accountLabel && (
              <p className="text-sm text-muted-foreground mb-2">@{service.accountLabel}</p>
            )}

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            {/* Capabilities */}
            {service.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {service.capabilities.map(cap => (
                  <Badge
                    key={cap.id}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-0"
                  >
                    {cap.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick Actions - shown when expanded */}
            {expanded && isConnected && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Quick Actions
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('repo_scan')}
                    className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    Repo scan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('pr_review')}
                    className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    PR review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('self_repo_scan')}
                    className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    Self-repo scan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('issue_draft')}
                    className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    Draft issue
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RepoPickerDialog
        open={repoPickerOpen}
        onOpenChange={setRepoPickerOpen}
        onRepoSelected={handleRepoSelected}
        selectedMode={selectedMode}
      />
    </>
  )
}
