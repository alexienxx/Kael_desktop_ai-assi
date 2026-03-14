/**
 * Conversation Lifecycle Manager
 *
 * Manages conversation state lifecycle:
 * - Maintains a single canonical conversation ID
 * - Persists conversation context locally
 * - Recovers conversation state on reload
 * - Prevents duplicate threads on reconnect
 */

import { Conversation } from '@/lib/types'

export interface ConversationState {
  activeConversationId: string | null
  conversations: Conversation[]
  lastSync: string | null
}

/**
 * Conversation Manager
 *
 * Centralized conversation lifecycle management.
 * Ensures conversation state consistency across reloads and reconnects.
 */
export class ConversationManager {
  private storageKey = 'kael-conversation-state'
  private activeConversationId: string | null = null
  private persistenceEnabled: boolean

  constructor(enablePersistence = true) {
    this.persistenceEnabled = enablePersistence
    if (this.persistenceEnabled) {
      this.loadState()
    }
  }

  /**
   * Get the active conversation ID
   */
  getActiveConversationId(): string | null {
    return this.activeConversationId
  }

  /**
   * Set the active conversation ID
   */
  setActiveConversationId(id: string | null): void {
    this.activeConversationId = id
    if (this.persistenceEnabled) {
      this.saveState()
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(backendConversationId?: string): string {
    // Use backend-provided ID or generate locally
    const conversationId = backendConversationId || `conv-${Date.now()}`
    this.activeConversationId = conversationId

    if (this.persistenceEnabled) {
      this.saveState()
    }

    return conversationId
  }

  /**
   * Ensure an active conversation exists
   * Creates one if needed, returns the active conversation ID
   */
  ensureConversation(backendConversationId?: string): string {
    if (!this.activeConversationId) {
      return this.createConversation(backendConversationId)
    }
    return this.activeConversationId
  }

  /**
   * Clear active conversation (e.g., when starting fresh)
   */
  clearActiveConversation(): void {
    this.activeConversationId = null
    if (this.persistenceEnabled) {
      this.saveState()
    }
  }

  /**
   * Sync conversation ID from backend response
   * Handles cases where backend generates the conversation ID
   */
  syncConversationId(backendConversationId: string): void {
    if (!this.activeConversationId) {
      this.activeConversationId = backendConversationId
      if (this.persistenceEnabled) {
        this.saveState()
      }
    } else if (this.activeConversationId !== backendConversationId) {
      // Backend returned a different ID - this might be a new conversation
      console.warn(
        `Conversation ID mismatch: local=${this.activeConversationId}, backend=${backendConversationId}`
      )
      // Trust the backend ID
      this.activeConversationId = backendConversationId
      if (this.persistenceEnabled) {
        this.saveState()
      }
    }
  }

  /**
   * Check if a conversation is active
   */
  hasActiveConversation(): boolean {
    return this.activeConversationId !== null
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const state: ConversationState = JSON.parse(stored)
        this.activeConversationId = state.activeConversationId
      }
    } catch (error) {
      console.error('Failed to load conversation state:', error)
      this.activeConversationId = null
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      const state: ConversationState = {
        activeConversationId: this.activeConversationId,
        conversations: [],
        lastSync: new Date().toISOString(),
      }
      localStorage.setItem(this.storageKey, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save conversation state:', error)
    }
  }

  /**
   * Reset all state (useful for logout or reset)
   */
  reset(): void {
    this.activeConversationId = null
    if (this.persistenceEnabled) {
      try {
        localStorage.removeItem(this.storageKey)
      } catch (error) {
        console.error('Failed to reset conversation state:', error)
      }
    }
  }

  /**
   * Check if conversation state is valid
   */
  isValidState(): boolean {
    // State is valid if we have an active conversation ID with proper format
    if (!this.activeConversationId) {
      return false
    }

    // Check for valid format (conv-* or backend-provided ID)
    return this.activeConversationId.length > 0
  }

  /**
   * Get state for debugging/inspection
   */
  getState(): ConversationState {
    return {
      activeConversationId: this.activeConversationId,
      conversations: [],
      lastSync: new Date().toISOString(),
    }
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()
