/**
 * useAgenticActions Hook
 *
 * Provides operations for executing agentic actions.
 * Manages action execution state and history.
 */

import { useState, useCallback } from 'react'
import { githubAgenticService } from '@/services/githubAgenticService'
import type { GitHubActionMode } from '@/lib/types'

export interface AgenticActionState {
  loading: boolean
  error: string | null
  lastActionId: string | null
}

export interface UseAgenticActionsResult {
  state: AgenticActionState
  executeGitHubAction: (
    target: string,
    mode: GitHubActionMode,
    options?: {
      correlateWithDiagnostics?: boolean
      draftIssue?: boolean
      metadata?: Record<string, unknown>
    }
  ) => Promise<{ success: boolean; actionId: string; message?: string }>
  clearError: () => void
}

/**
 * Hook to manage agentic action execution
 */
export function useAgenticActions(): UseAgenticActionsResult {
  const [state, setState] = useState<AgenticActionState>({
    loading: false,
    error: null,
    lastActionId: null,
  })

  const executeGitHubAction = useCallback(
    async (
      target: string,
      mode: GitHubActionMode,
      options?: {
        correlateWithDiagnostics?: boolean
        draftIssue?: boolean
        metadata?: Record<string, unknown>
      }
    ) => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const result = await githubAgenticService.executeAction(target, mode, options)
        setState(prev => ({
          ...prev,
          loading: false,
          lastActionId: result.actionId,
        }))
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to execute action'
        setState(prev => ({ ...prev, loading: false, error: message }))
        console.error('Failed to execute GitHub action:', err)
        throw err
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    state,
    executeGitHubAction,
    clearError,
  }
}
