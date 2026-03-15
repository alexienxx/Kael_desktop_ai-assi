/**
 * useServices Hook
 *
 * Provides access to services data and operations.
 * Manages service list state and provides refresh capabilities.
 */

import { useState, useEffect, useCallback } from 'react'
import { servicesApi } from '@/services/servicesApi'
import type { Service } from '@/lib/types'

export interface UseServicesResult {
  services: Service[]
  loading: boolean
  error: string | null
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

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await servicesApi.getServices()
      setServices(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load services'
      setError(message)
      console.error('Failed to fetch services:', err)
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
    refetch: fetchServices,
    getServiceById,
  }
}
