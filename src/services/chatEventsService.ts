/**
 * Chat Events Service
 *
 * Subscribes to the backend's Server-Sent Events (SSE) stream at
 * GET /chat/events and surfaces backend-driven messages (autonomous responses,
 * status changes) to the desktop UI in realtime.
 *
 * Design constraints:
 * - SSE failure MUST NOT crash the app; errors are swallowed + logged
 * - Reconnect is handled automatically by the browser's EventSource
 * - Deduplication is the caller's responsibility (see ChatSyncService)
 * - No React coupling: this is a plain service class
 */

import { ENDPOINTS, ChatEvent } from './backendContract'
import { backendConfigStore } from './backendConfigStore'

export type ChatEventListener = (event: ChatEvent) => void

export class ChatEventsService {
  private eventSource: EventSource | null = null
  private listeners: Set<ChatEventListener> = new Set()
  private active = false

  /**
   * Subscribe to backend SSE.
   * Safe to call multiple times; a running subscription is stopped first.
   */
  subscribe(): void {
    this.unsubscribe()

    const baseUrl = backendConfigStore.getBaseUrl()
    if (!baseUrl) {
      console.warn('[chatEventsService] Cannot subscribe: backend base URL not configured')
      return
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = `${normalizedBase}${ENDPOINTS.CHAT_EVENTS}`

    // Inject API key via URL param when present.
    // NOTE: EventSource does not support custom HTTP headers in browsers, so
    // the API key must be passed as a query parameter when server-side log
    // redaction of sensitive query parameters is confirmed to be in place.
    const apiKey = backendConfigStore.getApiKey()
    const finalUrl = apiKey
      ? `${url}?api_key=${encodeURIComponent(apiKey)}`
      : url

    try {
      this.eventSource = new EventSource(finalUrl)
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
        // EventSource automatically attempts reconnect on network errors.
        // We just log so the app can observe without crashing.
        console.warn('[chatEventsService] SSE error (will auto-reconnect):', err)
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
