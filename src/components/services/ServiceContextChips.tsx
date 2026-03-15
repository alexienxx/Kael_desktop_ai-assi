/**
 * ServiceContextChips Component
 *
 * Displays active service context chips in the chat interface.
 * Shows which service, repo, and mode are currently selected.
 */

import { X, GithubLogo } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ServiceContextChip } from '@/lib/types'

interface ServiceContextChipsProps {
  chips: ServiceContextChip[]
  onRemoveChip: (chipId: string) => void
}

export function ServiceContextChips({ chips, onRemoveChip }: ServiceContextChipsProps) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 mb-3 px-4">
      {chips.map(chip => (
        <div
          key={chip.id}
          className="glass-panel rounded-lg px-3 py-2 border border-white/10 flex items-center gap-2 text-sm"
        >
          {/* Provider Icon */}
          {chip.provider === 'github' && (
            <GithubLogo size={16} weight="fill" className="text-primary" />
          )}

          {/* Chip Content */}
          <div className="flex items-center gap-2">
            {chip.repoLabel && (
              <>
                <span className="font-medium">{chip.repoLabel}</span>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <span className="text-muted-foreground">{chip.modeLabel}</span>
            {chip.selfRepo && (
              <>
                <span className="text-muted-foreground">·</span>
                <Badge
                  variant="default"
                  className="text-xs px-1.5 py-0 bg-primary/20 text-primary border-0"
                >
                  self-repo
                </Badge>
              </>
            )}
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveChip(chip.id)}
            className="h-5 w-5 p-0 hover:bg-white/10 ml-1"
          >
            <X size={12} />
          </Button>
        </div>
      ))}
    </div>
  )
}
