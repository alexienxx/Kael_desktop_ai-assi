/**
 * Guard tests for backendContract.ts
 *
 * These tests act as a contract regression guard.  If any banned endpoint is
 * reintroduced into ENDPOINTS the corresponding test will fail immediately,
 * making it impossible to accidentally merge legacy routes back in.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ENDPOINTS, BackendContractAdapter } from '../backendContract'

// ── Mock backendTransport ─────────────────────────────────────────────────────

vi.mock('../backendTransport', () => ({
  transportFetchJson: vi.fn().mockResolvedValue([]),
}))

import { transportFetchJson } from '../backendTransport'
const mockTransport = vi.mocked(transportFetchJson)

// ── Banned endpoint substrings ────────────────────────────────────────────────
//
// These routes are not supported by the current Kael backend.  They must never
// reappear in the ENDPOINTS map.

const BANNED_SUBSTRINGS = ['/chat/regenerate', '/conversations'] as const

describe('backendContract – ENDPOINTS guard', () => {
  const endpointValues = Object.values(ENDPOINTS) as string[]

  it.each(BANNED_SUBSTRINGS)(
    'must not contain the banned endpoint substring "%s"',
    (banned) => {
      const offenders = endpointValues.filter((ep) => ep.includes(banned))
      expect(offenders).toHaveLength(0)
    }
  )
})

describe('backendContract – chat history query params use session_id', () => {
  let adapter: BackendContractAdapter

  beforeEach(() => {
    adapter = new BackendContractAdapter()
    mockTransport.mockClear()
    mockTransport.mockResolvedValue([])
  })

  it('getChatHistoryMessages sends ?session_id= when a conversationId is provided', async () => {
    await adapter.getChatHistoryMessages('sess-123')
    const calledPath = mockTransport.mock.calls[0][0] as string
    expect(calledPath).toContain('session_id=sess-123')
    expect(calledPath).not.toContain('conversation_id')
  })

  it('getChatHistoryPending sends ?session_id= when a conversationId is provided', async () => {
    await adapter.getChatHistoryPending('sess-456')
    const calledPath = mockTransport.mock.calls[0][0] as string
    expect(calledPath).toContain('session_id=sess-456')
    expect(calledPath).not.toContain('conversation_id')
  })

  it('getChatContextRecent sends ?session_id= when a conversationId is provided', async () => {
    mockTransport.mockResolvedValueOnce({ conversation_id: 'sess-789', recent_messages: [] })
    await adapter.getChatContextRecent('sess-789')
    const calledPath = mockTransport.mock.calls[0][0] as string
    expect(calledPath).toContain('session_id=sess-789')
    expect(calledPath).not.toContain('conversation_id')
  })
})
