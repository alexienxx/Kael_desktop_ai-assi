/**
 * useServices Hook
 *
 * Provides access to services data and operations.
 * Manages service list state and provides refresh capabilities.
 *
 * Graceful degradation contract:
 * - When backend is not configured, services remain empty and backendConfigured is false.
 * - When backend is configured but the /services endpoint is unreachable or returns
 *   no data, services remain empty and an error message is surfaced.
 * - Mock / stub data is NEVER injected as a fallback. The backend is the sole
 *   authority for service identity and connection status.
 */

import { useState, useEffect, useCallback } from 'react'
import { servicesApi } from '@/services/servicesApi'
import { backendConfigStore } from '@/services/backendConfigStore'
import type { Service } from '@/lib/types'

export interface UseServicesResult {
  services: Service[]
  loading: boolean
  error: string | null
  /** True when a backend URL has been configured in settings. */
  backendConfigured: boolean
  refetch: () => Promise<void>
  getServiceById: (id: string) => Service | undefined
}

/**
 * Hook to manage services state
 */
export function useServices(): UseServicesResult {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendConfigured, setBackendConfigured] = useState(
    backendConfigStore.isConfigured()
  )

  // Keep backendConfigured in sync when the user saves settings
  useEffect(() => {
    return backendConfigStore.subscribe(() => {
      setBackendConfigured(backendConfigStore.isConfigured())
    })
  }, [])

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await servicesApi.getServices()
      // Reflect exactly what the backend reports – no mock injection.
      setServices(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load services'
      setError(message)
      console.warn('Failed to fetch services:', err)
      setServices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const getServiceById = useCallback(
    (id: string) => services.find(s => s.id === id),
    [services]
  )

  return {
    services,
    loading,
    error,
    backendConfigured,
    refetch: fetchServices,
    getServiceById,
  }
}
