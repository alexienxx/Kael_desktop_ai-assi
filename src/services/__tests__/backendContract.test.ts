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

const BANNED_SUBSTRINGS = ['/chat/regenerate', '/conversations', '/ingest'] as const

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

describe('backendContract – external_agent role handling', () => {
  let adapter: BackendContractAdapter

  beforeEach(() => {
    adapter = new BackendContractAdapter()
    mockTransport.mockClear()
  })

  it('preserves external_agent role from history messages (camelCase metadata)', async () => {
    mockTransport.mockResolvedValueOnce([
      {
        message_id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'external_agent',
        content: 'Hello from agent',
        timestamp: '2024-01-01T00:00:00Z',
        externalAgentId: 'agent-42',
        externalAgentName: 'MyAgent',
      },
    ])
    const result = await adapter.getChatHistoryMessages('conv-1')
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('external_agent')
    expect(result[0].externalAgentId).toBe('agent-42')
    expect(result[0].externalAgentName).toBe('MyAgent')
  })

  it('normalizes snake_case external agent metadata from history messages', async () => {
    mockTransport.mockResolvedValueOnce([
      {
        message_id: 'msg-2',
        conversation_id: 'conv-2',
        role: 'external_agent',
        content: 'Snake case test',
        timestamp: '2024-01-01T00:00:00Z',
        external_agent_id: 'agent-99',
        external_agent_name: 'SnakeAgent',
      },
    ])
    const result = await adapter.getChatHistoryMessages('conv-2')
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('external_agent')
    expect(result[0].externalAgentId).toBe('agent-99')
    expect(result[0].externalAgentName).toBe('SnakeAgent')
  })

  it('falls back to assistant when role is unknown', async () => {
    mockTransport.mockResolvedValueOnce([
      {
        message_id: 'msg-3',
        conversation_id: 'conv-3',
        role: 'system',
        content: 'Unknown role fallback',
        timestamp: '2024-01-01T00:00:00Z',
      },
    ])
    const result = await adapter.getChatHistoryMessages('conv-3')
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('assistant')
    expect(result[0].externalAgentId).toBeUndefined()
    expect(result[0].externalAgentName).toBeUndefined()
  })

  it('does not attach external agent metadata to user messages', async () => {
    mockTransport.mockResolvedValueOnce([
      {
        message_id: 'msg-4',
        conversation_id: 'conv-4',
        role: 'user',
        content: 'User message',
        timestamp: '2024-01-01T00:00:00Z',
        externalAgentId: 'should-be-ignored',
      },
    ])
    const result = await adapter.getChatHistoryMessages('conv-4')
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    expect(result[0].externalAgentId).toBeUndefined()
  })
})
