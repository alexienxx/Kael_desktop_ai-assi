/**
 * Backend Service
 *
 * Singleton service for managing backend communication:
 * - Configuration management with hot reload
 * - Connection status tracking (connected / connecting / disconnected /
 *   error / auth_failed / degraded)
 * - Automatic reconnect with exponential backoff
 * - Request cancellation on reconfiguration
 * - Streaming support (prepared but not enabled)
 */

import { BackendConfig, ConnectionStatus } from '@/lib/types'
import { BackendContractAdapter, resolveMediaUrl } from './backendContract'
import { backendConfigStore } from './backendConfigStore'
import { TransportError } from './backendTransport'
import { conversationManager } from './conversationManager'

type ConnectionStatusListener = (status: ConnectionStatus) => void

/**
 * Backend Service
 *
 * Manages all backend communication with automatic reconnection and
 * configuration updates.  Uses backendConfigStore as the single source of
 * backend configuration truth – both this service and the Control Center
 * diagnostic service read from that store.
 */
export class BackendService {
  private adapter: BackendContractAdapter | null = null
  private config: BackendConfig | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private statusListeners: Set<ConnectionStatusListener> = new Set()

  // Reconnect strategy
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeouts = [2000, 5000, 10000, 15000, 30000] // Backoff: 2s, 5s, 10s, 15s, 30s
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null

  // Request cancellation
  private pendingRequests: Set<AbortController> = new Set()

  constructor() {
    // Private constructor for singleton
  }

  /**
   * Configure the backend service.
   * Also updates backendConfigStore so that diagnostic services share the
   * same configuration without reading from KV independently.
   */
  configure(config: BackendConfig): void {
    const isReconfiguration = this.config !== null

    // Cancel all pending requests on reconfiguration
    if (isReconfiguration) {
      this.cancelPendingRequests()
      this.stopHealthCheck()
      this.stopReconnect()
    }

    this.config = config

    // Propagate to the canonical config store so other services (e.g.
    // controlCenterService) automatically pick up the new settings.
    backendConfigStore.set(config)

    // The adapter is now stateless – it reads config from backendConfigStore
    // via backendTransport, so we only need a single shared instance.
    this.adapter = new BackendContractAdapter()

    // Update connection status
    this.setConnectionStatus('connecting')

    // Perform initial health check
    this.performHealthCheck()
      .then(() => {
        this.setConnectionStatus('connected')
        this.reconnectAttempts = 0
        this.startHealthCheck()
      })
      .catch((err) => {
        this.setConnectionStatus(this.classifyError(err))
        if (this.connectionStatus !== 'auth_failed') {
          this.startReconnect()
        }
      })
  }

  /**
   * Reset the service (clear configuration and state)
   */
  reset(): void {
    this.cancelPendingRequests()
    this.stopHealthCheck()
    this.stopReconnect()

    this.adapter = null
    this.config = null
    backendConfigStore.set(null)
    this.setConnectionStatus('disconnected')
    this.reconnectAttempts = 0

    conversationManager.reset()
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Check if service is configured and connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.adapter !== null
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.adapter !== null
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(listener: ConnectionStatusListener): () => void {
    this.statusListeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string): Promise<{
    conversationId: string
    messageId: string
    content: string
    timestamp: string
  }> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    if (!this.isConnected()) {
      throw new Error('Backend not connected')
    }

    const conversationId = conversationManager.ensureConversation()

    try {
      const response = await this.adapter.sendChatMessage({
        conversationId,
        message,
      })

      // Sync conversation ID from backend
      conversationManager.syncConversationId(response.conversationId)

      return response
    } catch (error) {
      // Handle connection errors
      this.handleConnectionError(error)
      throw error
    }
  }

  /**
   * Send a chat message with streaming (prepared but not enabled)
   */
  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<{
    conversationId: string
    messageId: string
    content: string
    timestamp: string
  }> {
    // Streaming not yet implemented - fallback to regular send
    // This is prepared for future streaming support
    console.warn('Streaming not yet enabled, falling back to regular send')
    return this.sendMessage(message)
  }

  /**
   * Regenerate the last assistant response
   */
  async regenerate(messageId: string): Promise<{
    conversationId: string
    messageId: string
    content: string
    timestamp: string
  }> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    if (!this.isConnected()) {
      throw new Error('Backend not connected')
    }

    const conversationId = conversationManager.getActiveConversationId()
    if (!conversationId) {
      throw new Error('No active conversation')
    }

    try {
      return await this.adapter.regenerateTurn({
        conversationId,
        messageId,
      })
    } catch (error) {
      this.handleConnectionError(error)
      throw error
    }
  }

  /**
   * Submit feedback on a message
   */
  async submitFeedback(
    messageId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ): Promise<void> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    const conversationId = conversationManager.getActiveConversationId()
    if (!conversationId) {
      throw new Error('No active conversation')
    }

    try {
      await this.adapter.submitFeedback({
        messageId,
        conversationId,
        rating,
        comment,
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      // Don't trigger reconnect for feedback errors
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<string> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    try {
      const response = await this.adapter.createConversation(title)
      return conversationManager.createConversation(response.id)
    } catch (error) {
      console.warn('Failed to create conversation on backend, using local:', error)
      return conversationManager.createConversation()
    }
  }

  /**
   * Resolve a media reference to an absolute URL.
   * Delegates to the centralized resolveMediaUrl in backendContract.
   */
  resolveMediaUrl(type: 'image' | 'audio', ref: string): string | null {
    const baseUrl = backendConfigStore.getBaseUrl()
    if (!baseUrl) return null
    return resolveMediaUrl(type, ref, baseUrl)
  }

  /**
   * @deprecated Use resolveMediaUrl instead.
   * Kept for backwards compatibility until all callers are updated.
   */
  getMediaUrl(type: 'image' | 'audio', id: string): string | null {
    return this.resolveMediaUrl(type, id)
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    await this.adapter.healthCheck()
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    // Check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      if (this.adapter && this.connectionStatus === 'connected') {
        this.performHealthCheck().catch((err) => {
          const status = this.classifyError(err)
          this.setConnectionStatus(status)
          if (status !== 'auth_failed') {
            this.stopHealthCheck()
            this.startReconnect()
          }
        })
      }
    }, 30000)
  }

  /**
   * Stop health checks
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Start reconnect with exponential backoff
   */
  private startReconnect(): void {
    if (this.reconnectTimer) {
      return // Already reconnecting
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      this.setConnectionStatus('error')
      return
    }

    const timeout = this.reconnectTimeouts[this.reconnectAttempts] || 30000
    this.reconnectAttempts++

    console.log(`Reconnecting in ${timeout}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.setConnectionStatus('connecting')

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.performHealthCheck()
        .then(() => {
          this.setConnectionStatus('connected')
          this.reconnectAttempts = 0
          this.startHealthCheck()
        })
        .catch((err) => {
          const status = this.classifyError(err)
          this.setConnectionStatus(status)
          if (status !== 'auth_failed') {
            this.startReconnect()
          }
        })
    }, timeout)
  }

  /**
   * Stop reconnect attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  /**
   * Classify an error into the appropriate ConnectionStatus.
   */
  private classifyError(error: unknown): ConnectionStatus {
    if (error instanceof TransportError) {
      if (error.kind === 'auth_failed') return 'auth_failed'
      if (error.kind === 'timeout' || error.kind === 'network') return 'error'
    }
    return 'error'
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: unknown): void {
    console.error('Backend connection error:', error)

    const newStatus = this.classifyError(error)
    if (this.connectionStatus === 'connected') {
      this.setConnectionStatus(newStatus)
      this.stopHealthCheck()
      if (newStatus !== 'auth_failed') {
        this.startReconnect()
      }
    }
  }

  /**
   * Cancel all pending requests
   */
  private cancelPendingRequests(): void {
    this.pendingRequests.forEach(controller => {
      controller.abort()
    })
    this.pendingRequests.clear()
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      this.statusListeners.forEach(listener => {
        try {
          listener(status)
        } catch (error) {
          console.error('Error in connection status listener:', error)
        }
      })
    }
  }
}

// Export singleton instance
export const backendService = new BackendService()
