/**
 * Chat Sync Service
 *
 * Orchestrates backend-driven chat synchronisation for the desktop client:
 *
 *   1. History restore   – on app open / conversation resume, fetch full
 *                          history from GET /chat/history/messages so the
 *                          desktop does not rely solely on local KV.
 *
 *   2. SSE realtime      – subscribe to GET /chat/events so autonomous /
 *                          backend-driven messages arrive without polling.
 *
 *   3. Pending reconcile – after reconnect / wake / resume, fetch
 *                          GET /chat/history/pending and merge missed messages.
 *
 * The service emits canonical message state via an observer pattern so that
 * App.tsx (or any other coordinator) can update React state without this
 * service touching React directly.
 *
 * Local KV remains useful as an optimistic / offline cache, but this service
 * treats the backend as the authoritative source while connected.
 *
 * ⚠️  RENDERER-PROCESS ONLY
 * This module imports chatEventsService which depends on the browser
 * EventSource API.  It MUST only be used from renderer-layer code (React
 * components, hooks, or other renderer-side modules).  The Electron main
 * process must never import this service.
 */

import { Message } from '@/lib/types'
import { BackendContractAdapter } from './backendContract'
import { ChatHistoryService } from './chatHistoryService'
import { ChatEventsService, chatEventsService } from './chatEventsService'
import { backendConfigStore } from './backendConfigStore'

// ── Observer types ─────────────────────────────────────────────────────────────

/** Notified when the sync service produces a full message-list replacement. */
export type HistoryRestoreListener = (messages: Message[]) => void

/** Notified for each individual new message (SSE push or pending reconcile). */
export type MessageArrivedListener = (message: Message) => void

// ── Sync status ────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'restoring' | 'reconciling' | 'live' | 'error'

export class ChatSyncService {
  private historyService: ChatHistoryService | null = null
  private eventsService: ChatEventsService
  private currentConversationId?: string

  private historyListeners: Set<HistoryRestoreListener> = new Set()
  private messageListeners: Set<MessageArrivedListener> = new Set()

  private syncStatus: SyncStatus = 'idle'
  private unsubscribeEvents: (() => void) | null = null

  /** IDs of messages already surfaced to the UI – used to avoid duplicates. */
  private knownMessageIds: Set<string> = new Set()

  constructor(eventsService: ChatEventsService) {
    this.eventsService = eventsService
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise (or reinitialise) the sync service after the backend becomes
   * configured / connected.
   *
   * @param conversationId  Optional active conversation to scope requests to.
   */
  async connect(conversationId?: string): Promise<void> {
    this.currentConversationId = conversationId

    // Build a fresh adapter – it reads config from backendConfigStore.
    const adapter = new BackendContractAdapter()
    this.historyService = new ChatHistoryService(adapter)

    // (Re)subscribe to SSE
    await this._startSSE(conversationId)

    // Restore history from backend truth
    await this._restoreHistory(conversationId)
  }

  /**
   * Disconnect and clean up subscriptions.
   * Called when the backend config is cleared or the app tears down.
   */
  disconnect(): void {
    this._stopSSE()
    this.historyService = null
    this.knownMessageIds.clear()
    this.syncStatus = 'idle'
  }

  /**
   * Reconcile missed messages after a reconnect / wake / resume.
   * Fetches pending messages and emits each new one to listeners.
   *
   * @param conversationId  Optional active conversation to scope requests to.
   */
  async reconcilePending(conversationId?: string): Promise<void> {
    if (!this.historyService) return

    this.syncStatus = 'reconciling'
    try {
      const pending = await this.historyService.fetchPending(conversationId)
      for (const msg of pending) {
        this._emitMessageIfNew(msg)
      }
    } catch (err) {
      console.error('[chatSyncService] Pending reconciliation failed:', err)
      this.syncStatus = 'error'
      return
    }
    this.syncStatus = 'live'
  }

  // ── Seed known IDs ────────────────────────────────────────────────────────

  /**
   * Inform the sync service about messages already present in local state so
   * that SSE / pending messages already in the UI are not duplicated.
   */
  seedKnownIds(messages: Message[]): void {
    for (const msg of messages) {
      this.knownMessageIds.add(msg.id)
    }
  }

  // ── Observers ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to full history restore events.
   * Fires once per connect() call if history data is available.
   */
  onHistoryRestore(listener: HistoryRestoreListener): () => void {
    this.historyListeners.add(listener)
    return () => this.historyListeners.delete(listener)
  }

  /**
   * Subscribe to individual new-message events.
   * Fires for SSE-pushed messages and pending-reconcile messages.
   */
  onMessageArrived(listener: MessageArrivedListener): () => void {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  getStatus(): SyncStatus {
    return this.syncStatus
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _restoreHistory(conversationId?: string): Promise<void> {
    if (!this.historyService) return

    this.syncStatus = 'restoring'
    try {
      const messages = await this.historyService.restoreHistory(conversationId)

      if (messages.length > 0) {
        // Register all retrieved IDs as known so SSE events do not re-emit them
        for (const msg of messages) {
          this.knownMessageIds.add(msg.id)
        }
        this.historyListeners.forEach((l) => {
          try { l(messages) } catch (err) {
            console.error('[chatSyncService] historyListener error:', err)
          }
        })
      }
    } catch (err) {
      console.error('[chatSyncService] History restore failed:', err)
      this.syncStatus = 'error'
      return
    }
    this.syncStatus = 'live'
  }

  private async _startSSE(conversationId?: string): Promise<void> {
    this._stopSSE()

    if (!backendConfigStore.isConfigured()) return

    // Subscribe with conversationId for scoped SSE stream
    await this.eventsService.subscribe(conversationId)

    this.unsubscribeEvents = this.eventsService.onEvent((event) => {
      // We only care about incoming message events from the backend
      if (
        event.type !== 'message' &&
        event.type !== 'message_end'
      ) return

      if (!event.content || !event.messageId) return

      const msg: Message = {
        id: event.messageId,
        role: 'assistant',
        content: { type: 'text', text: event.content },
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        conversationId: event.conversationId ?? '',
      }

      this._emitMessageIfNew(msg)
    })
  }

  private _stopSSE(): void {
    if (this.unsubscribeEvents) {
      this.unsubscribeEvents()
      this.unsubscribeEvents = null
    }
    this.eventsService.unsubscribe()
  }

  private _emitMessageIfNew(msg: Message): void {
    if (this.knownMessageIds.has(msg.id)) return
    this.knownMessageIds.add(msg.id)
    this.messageListeners.forEach((l) => {
      try { l(msg) } catch (err) {
        console.error('[chatSyncService] messageListener error:', err)
      }
    })
  }
}

// Singleton using the shared chatEventsService
export const chatSyncService = new ChatSyncService(chatEventsService)
