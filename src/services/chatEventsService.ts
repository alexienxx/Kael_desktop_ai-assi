/**
 * Chat Events Service
 *
 * Subscribes to the backend's Server-Sent Events (SSE) stream at
 * GET /chat/events using token-based authentication.
 *
 * Authentication flow:
 * 1. Request a short-lived single-use token via POST /chat/events/token
 * 2. Open EventSource with ?token=... query parameter
 * 3. On reconnect, obtain a fresh token (tokens are single-use)
 *
 * Design constraints:
 * - SSE failure MUST NOT crash the app; errors are swallowed + logged
 * - Reconnect requires a fresh token acquisition
 * - Deduplication is the caller's responsibility (see ChatSyncService)
 * - No React coupling: this is a plain service class
 */

import { ENDPOINTS, ChatEvent, BackendContractAdapter } from './backendContract'
import { backendConfigStore } from './backendConfigStore'

export type ChatEventListener = (event: ChatEvent) => void

export class ChatEventsService {
  private eventSource: EventSource | null = null
  private listeners: Set<ChatEventListener> = new Set()
  private active = false
  private adapter: BackendContractAdapter = new BackendContractAdapter()
  private conversationId?: string

  /**
   * Subscribe to backend SSE using token-based authentication.
   * Safe to call multiple times; a running subscription is stopped first.
   *
   * @param conversationId Optional conversation ID for scoped SSE stream
   */
  async subscribe(conversationId?: string): Promise<void> {
    this.unsubscribe()
    this.conversationId = conversationId

    const baseUrl = backendConfigStore.getBaseUrl()
    if (!baseUrl) {
      console.warn('[chatEventsService] Cannot subscribe: backend base URL not configured')
      return
    }

    // Request a short-lived SSE token from the backend
    let token: string
    try {
      const tokenResponse = await this.adapter.requestChatEventsToken(conversationId)
      token = tokenResponse.token
      if (!token) {
        console.warn('[chatEventsService] Token request returned empty token')
        return
      }
    } catch (err) {
      console.warn('[chatEventsService] Failed to obtain SSE token:', err)
      // Gracefully degrade: SSE unavailable but don't crash the app
      return
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = `${normalizedBase}${ENDPOINTS.CHAT_EVENTS}?token=${encodeURIComponent(token)}`

    try {
      this.eventSource = new EventSource(url)
      this.active = true

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleRawEvent(event.data as string)
      }

      // Named event types the backend may emit
      const namedEvents: ChatEvent['type'][] = [
        'message',
        'message_start',
        'message_end',
        'status',
        'error',
        'ping',
      ]
      namedEvents.forEach((type) => {
        this.eventSource?.addEventListener(type, (event: Event) => {
          const msgEvent = event as MessageEvent
          this.handleRawEvent(msgEvent.data as string, type)
        })
      })

      this.eventSource.onerror = (err) => {
        // EventSource will attempt to reconnect automatically, but since
        // tokens are single-use, we need to obtain a fresh token.
        // Close the current connection and resubscribe with a new token.
        console.warn('[chatEventsService] SSE error, will reconnect with fresh token:', err)
        this.unsubscribe()

        // Attempt to reconnect after a short delay
        setTimeout(() => {
          if (!this.active) {
            // Only reconnect if we haven't been explicitly unsubscribed
            this.subscribe(this.conversationId).catch((reconnectErr) => {
              console.error('[chatEventsService] Failed to reconnect:', reconnectErr)
            })
          }
        }, 3000) // 3 second delay before reconnect attempt
      }
    } catch (err) {
      console.error('[chatEventsService] Failed to create EventSource:', err)
      this.active = false
    }
  }

  /**
   * Stop the SSE subscription and clean up.
   */
  unsubscribe(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.active = false
  }

  /**
   * Returns true when a subscription is active.
   */
  isActive(): boolean {
    return this.active
  }

  /**
   * Register a listener for parsed chat events.
   * Returns an unsubscribe function.
   */
  onEvent(listener: ChatEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private handleRawEvent(data: string, explicitType?: ChatEvent['type']): void {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>
      const type: ChatEvent['type'] =
        explicitType ??
        (typeof parsed.type === 'string' ? (parsed.type as ChatEvent['type']) : 'message')

      const event: ChatEvent = {
        ...parsed,
        type,
        messageId:
          typeof parsed.message_id === 'string'
            ? parsed.message_id
            : typeof parsed.messageId === 'string'
            ? parsed.messageId
            : undefined,
        conversationId:
          typeof parsed.conversation_id === 'string'
            ? parsed.conversation_id
            : typeof parsed.conversationId === 'string'
            ? parsed.conversationId
            : undefined,
        content:
          typeof parsed.content === 'string'
            ? parsed.content
            : typeof parsed.text === 'string'
            ? parsed.text
            : typeof parsed.message === 'string'
            ? parsed.message
            : undefined,
        timestamp:
          typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString(),
      }

      // Skip pings silently
      if (type === 'ping') return

      this.listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (err) {
          console.error('[chatEventsService] Listener error:', err)
        }
      })
    } catch (err) {
      console.warn('[chatEventsService] Failed to parse SSE event data:', data, err)
    }
  }
}

// Singleton
export const chatEventsService = new ChatEventsService()
