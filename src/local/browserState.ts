import { useEffect, useState } from 'react'
import { localConfig } from './session'

// The canonical service persists exchanges. The local tab caches its UI state.
export function useKV<T>(key: string, initial: T) {
  const fixed = key === 'kael-backend-config'
  const scopedKey = 'arrakis-desktop:' + sessionStorage.getItem('arrakis-local-session') + ':' + key
  const [state, setState] = useState<T>(() => {
    if (fixed) return localConfig as T
    const stored = sessionStorage.getItem(scopedKey)
    if (!stored) return initial
    try {
      return JSON.parse(stored, (name, value) =>
        name === 'timestamp' && typeof value === 'string' ? new Date(value) : value)
    } catch { return initial }
  })
  useEffect(() => {
    if (!fixed) {
      try { sessionStorage.setItem(scopedKey, JSON.stringify(state)) }
      catch { /* A full tab cache must not block the canonical chat. */ }
    }
  }, [fixed, scopedKey, state])
  return [fixed ? localConfig as T : state, setState] as const
}
