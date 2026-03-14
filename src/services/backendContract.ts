/**
 * Backend Contract Adapter
 *
 * Normalizes the desktop client's expectations to the actual Kael backend API.
 * Isolates endpoint assumptions and provides a stable interface for the UI.
 */

import { Message, MessageContent } from '@/lib/types'

// Request/Response types for backend API normalization
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

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version?: string
  timestamp: string
}

/**
 * Backend Contract Adapter
 *
 * Provides a normalized interface to the Kael backend API.
 * Handles endpoint mapping, request/response transformation, and error normalization.
 */
export class BackendContractAdapter {
  private baseUrl: string
  private apiKey?: string
  private timeout: number

  constructor(baseUrl: string, apiKey?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.apiKey = apiKey
    this.timeout = timeout
  }

  /**
   * Update configuration
   */
  configure(baseUrl: string, apiKey?: string, timeout?: number) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.apiKey = apiKey
    if (timeout !== undefined) {
      this.timeout = timeout
    }
  }

  /**
   * Perform a fetch request with timeout and error handling
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`)
      }
      throw error
    }
  }

  /**
   * Send a chat message
   * Maps to: POST /chat
   */
  async sendChatMessage(
    request: SendChatMessageRequest
  ): Promise<SendChatMessageResponse> {
    const response = await this.fetchWithTimeout('/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: request.conversationId,
        message: request.message,
        context: request.context,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      conversationId: data.conversation_id || data.conversationId,
      messageId: data.message_id || data.messageId || `msg-${Date.now()}`,
      content: data.content || data.message || '',
      role: 'assistant',
      timestamp: data.timestamp || new Date().toISOString(),
    }
  }

  /**
   * Regenerate the last assistant turn
   * Maps to: POST /chat/regenerate
   */
  async regenerateTurn(
    request: RegenerateTurnRequest
  ): Promise<RegenerateTurnResponse> {
    const response = await this.fetchWithTimeout('/chat/regenerate', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: request.conversationId,
        message_id: request.messageId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to regenerate: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      conversationId: data.conversation_id || data.conversationId,
      messageId: data.message_id || data.messageId || request.messageId,
      content: data.content || data.message || '',
      role: 'assistant',
      timestamp: data.timestamp || new Date().toISOString(),
    }
  }

  /**
   * Submit feedback on a message
   * Maps to: POST /feedback
   */
  async submitFeedback(
    request: SubmitFeedbackRequest
  ): Promise<SubmitFeedbackResponse> {
    const response = await this.fetchWithTimeout('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        message_id: request.messageId,
        conversation_id: request.conversationId,
        rating: request.rating,
        comment: request.comment,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      success: data.success !== false,
      feedbackId: data.feedback_id || data.feedbackId || `feedback-${Date.now()}`,
    }
  }

  /**
   * Get conversation list
   * Maps to: GET /conversations (if available)
   */
  async getConversations(): Promise<ConversationResponse[]> {
    try {
      const response = await this.fetchWithTimeout('/conversations', {
        method: 'GET',
      })

      if (!response.ok) {
        // Return empty array if endpoint doesn't exist
        if (response.status === 404) {
          return []
        }
        throw new Error(`Failed to get conversations: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const conversations = Array.isArray(data) ? data : data.conversations || []

      return conversations.map((conv: any) => ({
        id: conv.id || conv.conversation_id,
        title: conv.title,
        createdAt: conv.created_at || conv.createdAt || new Date().toISOString(),
        lastMessageAt: conv.last_message_at || conv.lastMessageAt,
        messageCount: conv.message_count || conv.messageCount || 0,
      }))
    } catch (error) {
      console.warn('Failed to fetch conversations:', error)
      return []
    }
  }

  /**
   * Create a new conversation
   * Maps to: POST /conversations (if available)
   */
  async createConversation(title?: string): Promise<ConversationResponse> {
    try {
      const response = await this.fetchWithTimeout('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        id: data.id || data.conversation_id || `conv-${Date.now()}`,
        title: data.title,
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        messageCount: 0,
      }
    } catch (error) {
      // If endpoint doesn't exist, create locally
      console.warn('Conversation creation endpoint not available:', error)
      return {
        id: `conv-${Date.now()}`,
        title,
        createdAt: new Date().toISOString(),
        messageCount: 0,
      }
    }
  }

  /**
   * Health check
   * Maps to: GET /health or GET /
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await this.fetchWithTimeout('/health', {
        method: 'GET',
      })

      if (!response.ok) {
        // Try root endpoint
        const rootResponse = await this.fetchWithTimeout('/', {
          method: 'GET',
        })

        if (!rootResponse.ok) {
          throw new Error(`Health check failed: ${rootResponse.status}`)
        }

        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        }
      }

      const data = await response.json()

      return {
        status: data.status || 'healthy',
        version: data.version,
        timestamp: data.timestamp || new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get media URL (image/audio)
   * Maps to: GET /media/{type}/:id
   */
  getMediaUrl(type: 'image' | 'audio', id: string): string {
    return `${this.baseUrl}/media/${type}/${id}`
  }
}
