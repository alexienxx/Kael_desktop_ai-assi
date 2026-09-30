import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

type ParsedEvent = {
  messageId?: string
  content?: string
  assistantTurnId?: number
  deliveryMode?: string
}

class EventBridge {
  listener: ((event: ParsedEvent) => void) | null = null

  async subscribe(): Promise<void> {}
  unsubscribe(): void {}
  onEvent(listener: (event: ParsedEvent) => void): () => void {
    this.listener = listener
    return () => { this.listener = null }
  }
  emit(event: ParsedEvent): void { this.listener?.(event) }
}

describe('native voice SSE wake-up', () => {
  let ChatEventsService: typeof import('../chatEventsService').ChatEventsService
  let ChatSyncService: typeof import('../chatSyncService').ChatSyncService
  let backendConfigStore: typeof import('../backendConfigStore').backendConfigStore

  beforeAll(async () => {
    vi.stubGlobal('EventSource', class EventSourceForContract {})
    ;({ ChatEventsService } = await import('../chatEventsService'))
    ;({ ChatSyncService } = await import('../chatSyncService'))
    ;({ backendConfigStore } = await import('../backendConfigStore'))
    backendConfigStore.set({ baseUrl: 'http://arrakis.invalid', timeout: 1000 })
  })

  afterAll(() => {
    backendConfigStore.set(null)
    vi.unstubAllGlobals()
  })

  it('preserves canonical turn id and suppresses transcript-free text ghosts', async () => {
    const parser = new ChatEventsService()
    const bridge = new EventBridge()
    const sync = new ChatSyncService(bridge as never)
    const received: Array<{
      content: { text?: string }
      assistantTurnId?: number
      deliveryMode?: string
    }> = []
    sync.onMessageArrived(message => received.push(message))
    await (sync as unknown as { _startSSE(id: string): Promise<void> })
      ._startSSE('canonical-chat')
    parser.onEvent(event => bridge.emit(event))
    const parse = parser as unknown as {
      handleRawEvent(data: string, type: 'new_message'): void
    }

    parse.handleRawEvent(JSON.stringify({
      turn_id: 73,
      role: 'assistant',
      preview: '',
      session_id: 'canonical-chat',
      delivery_mode: 'voice_note',
      ts: 1790772000,
    }), 'new_message')
    parse.handleRawEvent(JSON.stringify({
      turn_id: 74,
      role: 'assistant',
      preview: '',
      session_id: 'canonical-chat',
      delivery_mode: 'text',
    }), 'new_message')

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      content: { type: 'text', text: '' },
      assistantTurnId: 73,
      deliveryMode: 'voice_note',
    })
  })

  it.each([0, -1, true, '73'])(
    'rejects a transcript-free voice wake-up with invalid turn id %s',
    async (turnId) => {
      const parser = new ChatEventsService()
      const bridge = new EventBridge()
      const sync = new ChatSyncService(bridge as never)
      const received: unknown[] = []
      sync.onMessageArrived(message => received.push(message))
      await (sync as unknown as { _startSSE(id: string): Promise<void> })
        ._startSSE('canonical-chat')
      parser.onEvent(event => bridge.emit(event))

      ;(parser as unknown as {
        handleRawEvent(data: string, type: 'new_message'): void
      }).handleRawEvent(JSON.stringify({
        message_id: 'forged-voice-wakeup',
        turn_id: turnId,
        role: 'assistant',
        preview: '',
        session_id: 'canonical-chat',
        delivery_mode: 'voice_note',
      }), 'new_message')

      expect(received).toEqual([])
    }
  )
})
