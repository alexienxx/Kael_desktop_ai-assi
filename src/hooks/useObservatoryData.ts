/**
 * useObservatoryData
 *
 * Polling hook for Observatory data.
 * - Fetches when enabled (panel/page is visible)
 * - Auto-polls every POLL_INTERVAL_MS
 * - Returns loading/error/data states
 * - Checks backendConfigStore.isConfigured() before fetching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { backendConfigStore } from '@/services/backendConfigStore'
import { fetchObservatoryData } from '@/services/observatoryService'
import type { ObservatoryData } from '@/lib/observatory-types'

const POLL_INTERVAL_MS = 5000

export type ObservatoryStatus = 'idle' | 'loading' | 'live' | 'error' | 'unconfigured'

export interface UseObservatoryResult {
  data: ObservatoryData | null
  status: ObservatoryStatus
  lastUpdate: Date | null
  error: string | null
  refresh: () => Promise<void>
}

export function useObservatoryData(enabled: boolean): UseObservatoryResult {
  const [data, setData] = useState<ObservatoryData | null>(null)
  const [status, setStatus] = useState<ObservatoryStatus>('idle')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!backendConfigStore.isConfigured()) {
      setStatus('unconfigured')
      return
    }

    // Don't set loading on subsequent polls to avoid UI flicker
    if (!data) setStatus('loading')

    try {
      const result = await fetchObservatoryData()

      if (!mountedRef.current) return

      setData(result)
      setStatus('live')
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return

      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      // Keep existing data on error — stale is better than empty
      setStatus(data ? 'live' : 'error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track mount state
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Poll when enabled
  useEffect(() => {
    if (!enabled) return

    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, refresh])

  // React to config changes
  useEffect(() => {
    const unsub = backendConfigStore.subscribe(() => {
      if (enabled && backendConfigStore.isConfigured()) {
        refresh()
      } else if (!backendConfigStore.isConfigured()) {
        setStatus('unconfigured')
      }
    })
    return unsub
  }, [enabled, refresh])

  return { data, status, lastUpdate, error, refresh }
}
