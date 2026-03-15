/**
 * useGitHubService Hook
 *
 * Provides GitHub-specific service operations and state management.
 * Manages GitHub repos, connection status, and service configuration.
 */

import { useState, useEffect, useCallback } from 'react'
import { githubAgenticService } from '@/services/githubAgenticService'
import type { Service, GitHubRepo } from '@/lib/types'

export interface UseGitHubServiceResult {
  githubService: Service | null
  repos: GitHubRepo[]
  loading: boolean
  error: string | null
  isConnected: boolean
  refetchRepos: () => Promise<void>
  refetchService: () => Promise<void>
}

/**
 * Hook to manage GitHub service state
 */
export function useGitHubService(): UseGitHubServiceResult {
  const [githubService, setGitHubService] = useState<Service | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchService = useCallback(async () => {
    try {
      const service = await githubAgenticService.getGitHubService()
      setGitHubService(service)
      return service
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GitHub service'
      setError(message)
      console.error('Failed to fetch GitHub service:', err)
      return null
    }
  }, [])

  const fetchRepos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await githubAgenticService.getRepos()
      setRepos(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load repositories'
      setError(message)
      console.error('Failed to fetch GitHub repos:', err)
      // Fallback to mock repos for development
      setRepos(githubAgenticService.getMockRepos())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      const service = await fetchService()
      if (service?.connectionStatus === 'connected') {
        await fetchRepos()
      } else {
        setLoading(false)
      }
    }
    initialize()
  }, [fetchService, fetchRepos])

  const isConnected = githubService?.connectionStatus === 'connected'

  return {
    githubService,
    repos,
    loading,
    error,
    isConnected,
    refetchRepos: fetchRepos,
    refetchService: fetchService,
  }
}
