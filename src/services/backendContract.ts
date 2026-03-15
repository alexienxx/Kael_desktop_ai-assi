/**
 * Backend Contract Adapter
 *
 * Normalizes the desktop client's expectations to the actual Kael backend API.
 * Isolates endpoint assumptions and provides a stable interface for the UI.
 *
 * All HTTP calls are delegated to backendTransport so that timeout, auth,
 * and error classification are handled in one place.
 *
 * IMPORTANT: Every backend path listed here represents the confirmed (or
 * best-known) Kael backend contract.  If a route changes, update it here —
 * nowhere else in the application should hard-code backend paths.
 */

import { transportFetchJson } from './backendTransport'

// ── Confirmed Kael backend endpoints ─────────────────────────────────────────
//
// These are the only places in the desktop app where backend paths are
// declared.  UI components must never construct backend URLs themselves.

export const ENDPOINTS = {
  /** Core chat turn */
  CHAT: '/chat',
  /** Regenerate last assistant turn */
  CHAT_REGENERATE: '/chat/regenerate',
  /** Message feedback */
  FEEDBACK: '/feedback',
  /** Conversation list (may return 404 if not implemented yet) */
  CONVERSATIONS: '/conversations',
  /** Liveness / readiness probe */
  HEALTH: '/health',
  /** Full conversation history */
  CHAT_HISTORY_MESSAGES: '/chat/history/messages',
  /** Pending (undelivered) messages since last ack */
  CHAT_HISTORY_PENDING: '/chat/history/pending',
  /** Recent context snapshot */
  CHAT_CONTEXT_RECENT: '/chat/context/recent',
  /** Server-Sent Events stream */
  CHAT_EVENTS: '/chat/events',
  /** Request short-lived SSE token */
  CHAT_EVENTS_TOKEN: '/chat/events/token',
} as const

// ── Media URL resolution ──────────────────────────────────────────────────────
//
// Media references returned by the backend may be:
//   a) A fully-qualified URL  → use directly
//   b) A backend-relative path  → resolve against baseUrl
//   c) A bare ID  → construct using the conventional path below
//
// The conventional path is documented here in one place so it can be changed
// without touching UI or service code.
const MEDIA_PATH_TEMPLATE = (type: 'image' | 'audio', id: string) =>
  `/media/${type}/${id}`

/**
 * Resolve a media reference into an absolute URL.
 *
 * @param type    'image' or 'audio'
 * @param ref     A fully-qualified URL, a backend-relative path, or a bare ID
 * @param baseUrl The backend base URL (from backendConfigStore)
 */
export function resolveMediaUrl(
  type: 'image' | 'audio',
  ref: string,
  baseUrl: string
): string {
  // Already a full URL
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return ref
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // A relative path (starts with /)
  if (ref.startsWith('/')) {
    return `${normalizedBase}${ref}`
  }

  // Bare ID – construct using conventional template
  return `${normalizedBase}${MEDIA_PATH_TEMPLATE(type, ref)}`
}

// ── Request / Response types ──────────────────────────────────────────────────

export interface SendChatMessageRequest {
  conversationId?: string
  message: string
  context?: Record<string, unknown>
}

export interface SendChatMessageResponse {
  conversationId: string
  messageId: string
  content: string
  role: 'assistant'
  timestamp: string
}

export interface RegenerateTurnRequest {
  conversationId: string
  messageId: string
}

export interface RegenerateTurnResponse {
  conversationId: string
  messageId: string
  content: string
  role: 'assistant'
  timestamp: string
}

export interface SubmitFeedbackRequest {
  messageId: string
  conversationId: string
  rating: 'positive' | 'negative'
  comment?: string
}

export interface SubmitFeedbackResponse {
  success: boolean
  feedbackId: string
}

export interface ConversationResponse {
  id: string
  title?: string
  createdAt: string
  lastMessageAt?: string
  messageCount: number
}

// ── History / context / SSE types ─────────────────────────────────────────────

export interface ChatHistoryMessage {
  messageId: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatContextRecent {
  conversationId: string
  summary?: string
  recentMessages: ChatHistoryMessage[]
}

export interface ChatPendingMessage {
  messageId: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type ChatEventType =
  | 'message'
  | 'message_start'
  | 'message_end'
  | 'status'
  | 'error'
  | 'ping'

export interface ChatEvent {
  type: ChatEventType
  messageId?: string
  conversationId?: string
  content?: string
  timestamp?: string
  [key: string]: unknown
}

export interface ChatEventsTokenResponse {
  token: string
  expiresAt?: string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version?: string
  timestamp: string
}

// ── Safe coercion helpers ─────────────────────────────────────────────────────

/** Coerce an unknown value to string, returning the fallback if not a string/number. */
function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return String(value)
  return fallback
}

/** Coerce an unknown value to number, returning the fallback if not a number. */
function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value
  return fallback
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Backend Contract Adapter
 *
 * Translates desktop-side request types into HTTP calls via backendTransport,
 * and normalises responses into stable desktop-side types.
 *
 * Configuration (baseUrl, apiKey, timeout) is read from backendConfigStore
 * inside backendTransport – the adapter itself is stateless.
 */
export class BackendContractAdapter {
  /**
   * Send a chat message.
   * Maps to: POST /chat
   */
  async sendChatMessage(
    request: SendChatMessageRequest
  ): Promise<SendChatMessageResponse> {
    const data = await transportFetchJson<Record<string, unknown>>(ENDPOINTS.CHAT, {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: request.conversationId,
        message: request.message,
        context: request.context,
      }),
    })

    return {
      conversationId: asString(data.conversation_id ?? data.conversationId, ''),
      messageId: asString(data.message_id ?? data.messageId, `msg-${Date.now()}`),
      content: asString(data.content ?? data.message, ''),
      role: 'assistant',
      timestamp: asString(data.timestamp, new Date().toISOString()),
    }
  }

  /**
   * Regenerate the last assistant turn.
   * Maps to: POST /chat/regenerate
   */
  async regenerateTurn(
    request: RegenerateTurnRequest
  ): Promise<RegenerateTurnResponse> {
    const data = await transportFetchJson<Record<string, unknown>>(ENDPOINTS.CHAT_REGENERATE, {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: request.conversationId,
        message_id: request.messageId,
      }),
    })

    return {
      conversationId: asString(data.conversation_id ?? data.conversationId, ''),
      messageId: asString(data.message_id ?? data.messageId, request.messageId),
      content: asString(data.content ?? data.message, ''),
      role: 'assistant',
      timestamp: asString(data.timestamp, new Date().toISOString()),
    }
  }

  /**
   * Submit feedback on a message.
   * Maps to: POST /feedback
   */
  async submitFeedback(
    request: SubmitFeedbackRequest
  ): Promise<SubmitFeedbackResponse> {
    const data = await transportFetchJson<Record<string, unknown>>(ENDPOINTS.FEEDBACK, {
      method: 'POST',
      body: JSON.stringify({
        message_id: request.messageId,
        conversation_id: request.conversationId,
        rating: request.rating,
        comment: request.comment,
      }),
    })

    return {
      success: data.success !== false,
      feedbackId: asString(data.feedback_id ?? data.feedbackId, `feedback-${Date.now()}`),
    }
  }

  /**
   * Get conversation list.
   * Maps to: GET /conversations (may return 404 if not implemented)
   */
  async getConversations(): Promise<ConversationResponse[]> {
    try {
      const data = await transportFetchJson<unknown>(ENDPOINTS.CONVERSATIONS, {
        method: 'GET',
      })

      const conversations = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>).conversations ?? []

      return (conversations as Record<string, unknown>[]).map((conv) => ({
        id: asString(conv.id ?? conv.conversation_id, `conv-${Date.now()}`),
        title: typeof conv.title === 'string' ? conv.title : undefined,
        createdAt: asString(conv.created_at ?? conv.createdAt, new Date().toISOString()),
        lastMessageAt: typeof conv.last_message_at === 'string'
          ? conv.last_message_at
          : typeof conv.lastMessageAt === 'string'
          ? conv.lastMessageAt
          : undefined,
        messageCount: asNumber(conv.message_count ?? conv.messageCount, 0),
      }))
    } catch (err) {
      // Gracefully degrade when the endpoint is not yet available
      console.warn('Failed to fetch conversations:', err)
      return []
    }
  }

  /**
   * Create a new conversation.
   * Maps to: POST /conversations (may return 404 if not implemented)
   */
  async createConversation(title?: string): Promise<ConversationResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(ENDPOINTS.CONVERSATIONS, {
        method: 'POST',
        body: JSON.stringify({ title }),
      })

      return {
        id: asString(data.id ?? data.conversation_id, `conv-${Date.now()}`),
        title: typeof data.title === 'string' ? data.title : undefined,
        createdAt: asString(data.created_at ?? data.createdAt, new Date().toISOString()),
        messageCount: 0,
      }
    } catch (err) {
      // If endpoint doesn't exist, create locally
      console.warn('Conversation creation endpoint not available:', err)
      return {
        id: `conv-${Date.now()}`,
        title,
        createdAt: new Date().toISOString(),
        messageCount: 0,
      }
    }
  }

  /**
   * Fetch full conversation history messages.
   * Maps to: GET /chat/history/messages
   */
  async getChatHistoryMessages(conversationId?: string): Promise<ChatHistoryMessage[]> {
    try {
      const path = conversationId
        ? `${ENDPOINTS.CHAT_HISTORY_MESSAGES}?conversation_id=${encodeURIComponent(conversationId)}`
        : ENDPOINTS.CHAT_HISTORY_MESSAGES

      const data = await transportFetchJson<unknown>(path, { method: 'GET' })

      const items: Record<string, unknown>[] = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : Array.isArray((data as Record<string, unknown>).messages)
        ? ((data as Record<string, unknown>).messages as Record<string, unknown>[])
        : []

      return items.map((item) => this.coerceChatHistoryMessage(item))
    } catch (err) {
      console.warn('[backendContract] getChatHistoryMessages failed:', err)
      return []
    }
  }

  /**
   * Fetch pending (undelivered/missed) messages.
   * Maps to: GET /chat/history/pending
   */
  async getChatHistoryPending(conversationId?: string): Promise<ChatPendingMessage[]> {
    try {
      const path = conversationId
        ? `${ENDPOINTS.CHAT_HISTORY_PENDING}?conversation_id=${encodeURIComponent(conversationId)}`
        : ENDPOINTS.CHAT_HISTORY_PENDING

      const data = await transportFetchJson<unknown>(path, { method: 'GET' })

      const items: Record<string, unknown>[] = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : Array.isArray((data as Record<string, unknown>).messages)
        ? ((data as Record<string, unknown>).messages as Record<string, unknown>[])
        : []

      return items.map((item) => this.coerceChatHistoryMessage(item))
    } catch (err) {
      console.warn('[backendContract] getChatHistoryPending failed:', err)
      return []
    }
  }

  /**
   * Fetch recent context snapshot.
   * Maps to: GET /chat/context/recent
   */
  async getChatContextRecent(conversationId?: string): Promise<ChatContextRecent | null> {
    try {
      const path = conversationId
        ? `${ENDPOINTS.CHAT_CONTEXT_RECENT}?conversation_id=${encodeURIComponent(conversationId)}`
        : ENDPOINTS.CHAT_CONTEXT_RECENT

      const data = await transportFetchJson<Record<string, unknown>>(path, { method: 'GET' })

      const convId = asString(data.conversation_id ?? data.conversationId, conversationId ?? '')
      const recentRaw = Array.isArray(data.recent_messages)
        ? (data.recent_messages as Record<string, unknown>[])
        : Array.isArray(data.recentMessages)
        ? (data.recentMessages as Record<string, unknown>[])
        : []

      return {
        conversationId: convId,
        summary: typeof data.summary === 'string' ? data.summary : undefined,
        recentMessages: recentRaw.map((item) => this.coerceChatHistoryMessage(item)),
      }
    } catch (err) {
      console.warn('[backendContract] getChatContextRecent failed:', err)
      return null
    }
  }

  /**
   * Coerce an unknown payload item into a ChatHistoryMessage.
   */
  private coerceChatHistoryMessage(item: Record<string, unknown>): ChatHistoryMessage {
    const rawRole = item.role ?? item.sender
    const role: 'user' | 'assistant' =
      rawRole === 'user' || rawRole === 'assistant' ? rawRole : 'assistant'

    return {
      messageId: asString(item.message_id ?? item.messageId ?? item.id, `msg-${Date.now()}`),
      conversationId: asString(item.conversation_id ?? item.conversationId, ''),
      role,
      content: asString(item.content ?? item.text ?? item.message, ''),
      timestamp: asString(item.timestamp, new Date().toISOString()),
    }
  }

  /**
   * Request a short-lived single-use token for SSE authentication.
   * Maps to: POST /chat/events/token
   */
  async requestChatEventsToken(conversationId?: string): Promise<ChatEventsTokenResponse> {
    try {
      const body: Record<string, unknown> = {}
      if (conversationId) {
        body.conversation_id = conversationId
      }

      const data = await transportFetchJson<Record<string, unknown>>(
        ENDPOINTS.CHAT_EVENTS_TOKEN,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      )

      return {
        token: asString(data.token, ''),
        expiresAt: typeof data.expires_at === 'string' || typeof data.expiresAt === 'string'
          ? (data.expires_at as string) ?? (data.expiresAt as string)
          : undefined,
      }
    } catch (err) {
      console.warn('[backendContract] requestChatEventsToken failed:', err)
      throw err
    }
  }

  /**
   * Health check.
   * Maps to: GET /health (falls back to GET /)
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(ENDPOINTS.HEALTH, {
        method: 'GET',
      })

      const VALID_STATUSES = ['healthy', 'degraded', 'unhealthy'] as const
      const rawStatus = typeof data.status === 'string' ? data.status : ''
      const status: 'healthy' | 'degraded' | 'unhealthy' =
        (VALID_STATUSES as readonly string[]).includes(rawStatus)
          ? (rawStatus as 'healthy' | 'degraded' | 'unhealthy')
          : 'healthy'

      return {
        status,
        version: typeof data.version === 'string' ? data.version : undefined,
        timestamp: asString(data.timestamp, new Date().toISOString()),
      }
    } catch (err) {
      throw new Error(
        `Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }
}

