/**
 * RepoPickerDialog Component
 *
 * Dialog for selecting a GitHub repository and action mode.
 * Shows available repos with type badges and allows mode selection.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { GithubLogo, MagnifyingGlass } from '@phosphor-icons/react'
import { useGitHubService } from '@/hooks/useGitHubService'
import type { GitHubActionMode, GitHubRepo } from '@/lib/types'

interface RepoPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRepoSelected: (repoFullName: string, repoType: 'generic' | 'self-repo', mode: GitHubActionMode) => void
  selectedMode: GitHubActionMode | null
}

export function RepoPickerDialog({
  open,
  onOpenChange,
  onRepoSelected,
  selectedMode,
}: RepoPickerDialogProps) {
  const { repos, loading } = useGitHubService()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedRepo(null)
    }
  }, [open])

  const filteredRepos = repos.filter(repo =>
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const handleRepoClick = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
  }

  const handleConfirm = () => {
    if (selectedRepo && selectedMode) {
      onRepoSelected(selectedRepo.fullName, selectedRepo.type, selectedMode)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-w-2xl max-h-[80vh] p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GithubLogo size={24} weight="duotone" className="text-primary" />
              Select Repository
            </DialogTitle>
            <DialogDescription>
              Choose a repository for {selectedMode ? getModeLabel(selectedMode) : 'analysis'}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative mt-4">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Repos List */}
        <ScrollArea className="h-[400px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading repositories...</p>
              </div>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-12">
              <GithubLogo size={48} weight="duotone" className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No repositories found</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredRepos.map(repo => (
                <button
                  key={repo.fullName}
                  onClick={() => handleRepoClick(repo)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRepo?.fullName === repo.fullName
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{repo.fullName}</h4>
                        {repo.isPrivate && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            Private
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {repo.description}
                        </p>
                      )}
                      <Badge
                        variant={repo.type === 'self-repo' ? 'default' : 'outline'}
                        className="text-xs px-2 py-0.5"
                      >
                        {repo.type === 'self-repo' ? 'Repository di Arrakis' : 'Repository generico'}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="p-6 pt-4 border-t border-white/10 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/5 border-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedRepo}
            className="bg-primary text-primary-foreground"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getModeLabel(mode: GitHubActionMode): string {
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
