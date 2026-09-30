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
import { deriveSentinelUrl, probeSentinel, requestBootstrap } from './sentinelService'

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

  // Sentinel auto-start tracking
  private sentinelAttempted = false
  private sentinelPollTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // Private constructor for singleton
  }

  /**
   * Configure the backend service.
   * Also updates backendConfigStore so that diagnostic services share the
   * same configuration without reading from KV independently.
   *
   * If the initial health check fails, probes the Kael Sentinel and
   * triggers backend auto-start before falling back to reconnect.
   */
  configure(config: BackendConfig): void {
    const isReconfiguration = this.config !== null

    // Cancel all pending requests on reconfiguration
    if (isReconfiguration) {
      this.cancelPendingRequests()
      this.stopHealthCheck()
      this.stopReconnect()
      this.stopSentinelPoll()
    }

    this.config = config
    this.sentinelAttempted = false

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
      .catch(async (err) => {
        // Health check failed — try sentinel auto-start before reconnecting
        if (this.connectionStatus !== 'auth_failed' && !this.sentinelAttempted) {
          const autostartSuccess = await this.attemptSentinelAutostart()
          if (autostartSuccess) return // Sentinel polling now handles the rest
        }

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
    this.stopSentinelPoll()

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
  async sendMessage(message: string, clientMessageId: string): Promise<{
    conversationId: string
    messageId: string
    content: string
    timestamp: string
    assistantTurnId?: number
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
        clientMessageId,
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

  /** Send one local recording through the canonical /audio/notes ingress. */
  async sendVoiceNote(
    audio: Blob,
    clientMessageId: string,
    conversationId: string,
    language: 'it' | 'en' = 'it'
  ): Promise<{
    conversationId: string
    messageId: string
    content: string
    timestamp: string
    assistantTurnId?: number
  }> {
    if (!this.adapter) throw new Error('Backend not configured')
    if (!this.isConnected()) throw new Error('Backend not connected')
    try {
      const response = await this.adapter.sendVoiceNote({
        conversationId,
        clientMessageId,
        audio,
        language,
      })
      conversationManager.syncConversationId(response.conversationId)
      return response
    } catch (error) {
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
    assistantTurnId?: number
  }> {
    // Streaming not yet implemented - fallback to regular send
    // This is prepared for future streaming support
    console.warn('Streaming not yet enabled, falling back to regular send')
    return this.sendMessage(message, globalThis.crypto.randomUUID())
  }

  /**
   * Submit feedback on a message (like/dislike → RLHF pipeline).
   * Uses turn_id + feedback_type to match backend contract.
   */
  async submitFeedback(
    turnId: string,
    feedbackType: 'like' | 'dislike'
  ): Promise<{ ok: boolean; feedback_count: number; cap_reached: boolean }> {
    if (!this.adapter) {
      throw new Error('Backend not configured')
    }

    try {
      return await this.adapter.submitFeedback({
        turnId,
        feedbackType,
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      // Don't trigger reconnect for feedback errors
      return { ok: false, feedback_count: 0, cap_reached: false }
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

  // ── Sentinel auto-start ──────────────────────────────────────────────────

  /**
   * Attempt to wake the main backend via the Kael Sentinel.
   *
   * Flow:
   *   1. Derive sentinel URL from configured backend URL
   *   2. Probe sentinel health
   *   3. If sentinel alive → POST /start → poll for backend
   *   4. On success → 'connected'; on timeout → fall through to reconnect
   *
   * Returns true if sentinel polling was started (caller should NOT
   * start reconnect). Returns false to let the caller handle normally.
   */
  private async attemptSentinelAutostart(): Promise<boolean> {
    this.sentinelAttempted = true

    if (!this.config?.baseUrl) return false

    const sentinelUrl = deriveSentinelUrl(this.config.baseUrl)
    console.log(`[BackendService] Probing sentinel at ${sentinelUrl}...`)

    const alive = await probeSentinel(sentinelUrl)
    if (!alive) {
      console.log('[BackendService] Sentinel not reachable, skipping auto-start')
      return false
    }

    // Sentinel is alive — request bootstrap
    this.setConnectionStatus('backend_starting')
    console.log('[BackendService] Sentinel alive, requesting backend bootstrap...')

    try {
      const result = await requestBootstrap(sentinelUrl)

      if (!result.started && result.reason === 'backend_already_running') {
        // Race condition: backend came up between our check and sentinel call
        this.setConnectionStatus('connected')
        this.startHealthCheck()
        return true
      }

      if (!result.started && result.reason !== 'bootstrap_already_in_progress') {
        console.warn(`[BackendService] Sentinel refused start: ${result.reason}`)
        return false
      }

      // Bootstrap triggered or already in progress — poll for health
      this.startSentinelPoll()
      return true
    } catch (err) {
      console.error('[BackendService] Sentinel bootstrap request failed:', err)
      return false
    }
  }

  /** Poll backend health after sentinel triggered bootstrap (max 120s). */
  private startSentinelPoll(): void {
    const POLL_INTERVAL = 3_000
    const TIMEOUT = 120_000
    const startTime = Date.now()

    const tick = async () => {
      if (Date.now() - startTime > TIMEOUT) {
        console.warn('[BackendService] Sentinel bootstrap timeout')
        this.sentinelPollTimer = null
        this.setConnectionStatus('error')
        this.startReconnect()
        return
      }

      try {
        await this.performHealthCheck()
        // Success!
        this.sentinelPollTimer = null
        this.setConnectionStatus('connected')
        this.reconnectAttempts = 0
        this.startHealthCheck()
      } catch {
        // Not ready yet — keep polling
        this.sentinelPollTimer = setTimeout(tick, POLL_INTERVAL)
      }
    }

    this.sentinelPollTimer = setTimeout(tick, POLL_INTERVAL)
  }

  /** Stop sentinel polling if active. */
  private stopSentinelPoll(): void {
    if (this.sentinelPollTimer) {
      clearTimeout(this.sentinelPollTimer)
      this.sentinelPollTimer = null
    }
  }

  // ── Error handling ───────────────────────────────────────────────────────

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
