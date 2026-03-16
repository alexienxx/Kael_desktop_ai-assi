/**
 * Chat History Service
 *
 * Responsible for fetching and restoring conversation history from the backend.
 * Used on app open / conversation resume so that the desktop chat reflects
 * the backend's canonical message truth instead of only local KV state.
 *
 * All HTTP calls go through BackendContractAdapter → backendTransport so
 * timeout, auth and error classification remain in one place.
 */

import { BackendContractAdapter, ChatHistoryMessage } from './backendContract'
import { Message } from '@/lib/types'

/**
 * Convert a backend ChatHistoryMessage into the desktop Message type.
 */
function toMessage(item: ChatHistoryMessage): Message {
  return {
    id: item.messageId,
    role: item.role,
    content: { type: 'text', text: item.content },
    timestamp: new Date(item.timestamp),
    conversationId: item.conversationId,
  }
}

export class ChatHistoryService {
  private adapter: BackendContractAdapter

  constructor(adapter: BackendContractAdapter) {
    this.adapter = adapter
  }

  /**
   * Restore full conversation history from the backend.
   * Returns an empty array when the backend is unavailable or returns no data
   * – the caller is responsible for deciding how to merge with local state.
   *
   * @param conversationId  Optional: restrict to a specific conversation
   */
  async restoreHistory(conversationId?: string): Promise<Message[]> {
    const items = await this.adapter.getChatHistoryMessages(conversationId)
    return items.map(toMessage)
  }

  /**
   * Fetch pending (missed/undelivered) messages from the backend.
   * Intended to be called after reconnect / wake / resume.
   *
   * @param conversationId  Optional: restrict to a specific conversation
   */
  async fetchPending(conversationId?: string): Promise<Message[]> {
    const items = await this.adapter.getChatHistoryPending(conversationId)
    return items.map(toMessage)
  }

  /**
   * Fetch recent context snapshot.
   * Can be used to seed initial context or validate local history continuity.
   *
   * @param conversationId  Optional: restrict to a specific conversation
   */
  async fetchRecentContext(conversationId?: string): Promise<Message[]> {
    const ctx = await this.adapter.getChatContextRecent(conversationId)
    if (!ctx) return []
    return ctx.recentMessages.map(toMessage)
  }
}
