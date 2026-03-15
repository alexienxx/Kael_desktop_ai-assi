/**
 * Backend Config Store
 *
 * The single canonical source of backend configuration for the entire desktop
 * app. Both the chat / message services and the Control Center diagnostic
 * service must read configuration from here instead of maintaining their own
 * independent copies.
 *
 * Persistence (KV sync) is handled by App.tsx; this store is purely in-memory
 * so services can read it without coupling to any React hook.
 */

import { BackendConfig } from '@/lib/types'

type ConfigListener = (config: BackendConfig | null) => void

class BackendConfigStore {
  private config: BackendConfig | null = null
  private listeners: Set<ConfigListener> = new Set()

  /**
   * Return the current configuration, or null if not yet set.
   */
  get(): BackendConfig | null {
    return this.config
  }

  /**
   * Update the configuration and notify all subscribers.
   * Called by App.tsx whenever the user saves new backend settings.
   */
  set(config: BackendConfig | null): void {
    this.config = config
    this.listeners.forEach((listener) => {
      try {
        listener(config)
      } catch (err) {
        console.error('Error in backendConfigStore listener:', err)
      }
    })
  }

  /**
   * Subscribe to config changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Convenience helpers
   */
  getBaseUrl(): string | null {
    return this.config?.baseUrl ?? null
  }

  getApiKey(): string | undefined {
    return this.config?.apiKey
  }

  getTimeout(): number {
    return this.config?.timeout ?? 30000
  }

  isConfigured(): boolean {
    const url = this.config?.baseUrl?.trim()
    return Boolean(url && url.length > 0)
  }
}

// Singleton – the only backend config authority in the application.
export const backendConfigStore = new BackendConfigStore()
