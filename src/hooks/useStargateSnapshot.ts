import { useCallback, useEffect, useRef, useState } from 'react'
import { backendConfigStore } from '@/services/backendConfigStore'
import { fetchStargateSnapshot } from '@/services/stargateService'
import type { CognitiveFieldSnapshot } from '@/lib/stargate-types'

const POLL_INTERVAL_MS = 3000

export type StargateStatus = 'idle' | 'loading' | 'live' | 'error' | 'unconfigured' | 'unavailable'

export interface UseStargateSnapshotResult {
  snapshot: CognitiveFieldSnapshot | null
  status: StargateStatus
  error: string | null
  refresh: () => Promise<void>
}

export function useStargateSnapshot(
  enabled: boolean,
  sessionId: string | null,
): UseStargateSnapshotResult {
  const [snapshot, setSnapshot] = useState<CognitiveFieldSnapshot | null>(null)
  const [status, setStatus] = useState<StargateStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const snapshotRef = useRef<CognitiveFieldSnapshot | null>(null)
  const sessionScopeRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const activeRequestRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || document.hidden) return
    const scope = sessionId?.trim()
    if (!scope) {
      setStatus('unavailable')
      return
    }
    if (!backendConfigStore.isConfigured()) {
      setStatus('unconfigured')
      return
    }

    activeRequestRef.current?.abort()
    const controller = new AbortController()
    activeRequestRef.current = controller
    if (!snapshotRef.current) setStatus('loading')

    try {
      const next = await fetchStargateSnapshot(scope, controller.signal)
      if (!mountedRef.current || controller.signal.aborted) return
      if (snapshotRef.current?.snapshot_id === next.snapshot_id) {
        setStatus('live')
        setError(null)
        return
      }
      snapshotRef.current = next
      setSnapshot(next)
      setStatus('live')
      setError(null)
    } catch (cause) {
      if (!mountedRef.current || controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Unknown Stargate error')
      setStatus(snapshotRef.current ? 'live' : 'error')
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null
    }
  }, [enabled, sessionId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      activeRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      activeRequestRef.current?.abort()
      setStatus('idle')
      return
    }
    const scope = sessionId?.trim()
    if (!scope) {
      activeRequestRef.current?.abort()
      sessionScopeRef.current = null
      snapshotRef.current = null
      setSnapshot(null)
      setStatus('unavailable')
      return
    }
    if (sessionScopeRef.current !== scope) {
      activeRequestRef.current?.abort()
      sessionScopeRef.current = scope
      snapshotRef.current = null
      setSnapshot(null)
      setError(null)
      setStatus('loading')
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.hidden) activeRequestRef.current?.abort()
      else void refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      activeRequestRef.current?.abort()
    }
  }, [enabled, refresh, sessionId])

  useEffect(() => backendConfigStore.subscribe(() => {
    if (!enabled) return
    if (backendConfigStore.isConfigured()) void refresh()
    else {
      activeRequestRef.current?.abort()
      setStatus('unconfigured')
    }
  }), [enabled, refresh])

  return { snapshot, status, error, refresh }
}
