import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transportFetch: vi.fn(),
  transportFetchJson: vi.fn(),
  open: vi.fn(),
}))

vi.mock('../backendTransport', () => ({
  transportFetch: mocks.transportFetch,
  transportFetchJson: mocks.transportFetchJson,
}))

vi.mock('../nativePcmPlayer', () => ({
  NativePcmPlayer: { open: mocks.open },
}))

import { NativeVoiceService } from '../nativeVoiceService'

const SPEECH_PLAN_SHA256 = 'a'.repeat(64)
const PLAYOUT_REPORT_V2 = {
  sequence: 0,
  played_sample_boundary: 128,
  status: 'interrupted',
  measured_at: '2026-09-30T12:00:00.000Z',
  measurement_method: 'audio_worklet_render_quantum',
  discontinuity: true,
  schema_version: 'arrakis.playout-report.v2',
  timing_method: 'client_performance_now',
  player_open_to_first_frame_ms: 3.125,
  player_open_to_first_quantum_ms: 8.75,
  stop_to_local_mute_command_ms: 0.042,
  stop_to_worklet_ack_ms: 2.5,
} as const

function terminalFrame(): Uint8Array {
  const frame = new Uint8Array(12)
  const view = new DataView(frame.buffer)
  view.setUint32(0, 0xffffffff, false)
  view.setUint32(4, 0, false)
  view.setUint32(8, 0, false)
  return frame
}

describe('NativeVoiceService canonical assistant selection', () => {
  beforeEach(() => {
    mocks.transportFetch.mockReset()
    mocks.transportFetchJson.mockReset()
    mocks.open.mockReset()

    const player = {
      feed: vi.fn().mockResolvedValue(undefined),
      finish: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      terminal: Promise.resolve(),
      receiptDelivery: Promise.resolve(),
      closed: Promise.resolve(),
    }
    mocks.open.mockImplementation(async (
      bindingPromise: Promise<unknown>,
      onReport: (report: unknown) => Promise<void>,
    ) => {
      await bindingPromise
      await onReport(PLAYOUT_REPORT_V2)
      return player
    })
    mocks.transportFetch.mockResolvedValue(new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(terminalFrame())
          controller.close()
        },
      }),
      {
        headers: {
          'X-Arrakis-Audio-Protocol': 'arrakis_pcm_frames_v1',
          'X-Arrakis-Sample-Rate': '24000',
          'X-Arrakis-Channels': '1',
          'X-Arrakis-Encoding': 'pcm_s16le',
          'X-Arrakis-Delivery-Id': 'delivery-73',
          'X-Arrakis-Utterance-Id': 'utterance-73',
          'X-Arrakis-Epoch': '1',
          'X-Arrakis-Speech-Plan-SHA256': SPEECH_PLAN_SHA256,
        },
      },
    ))
  })

  it('requests speech by canonical assistantTurnId without sending transcript text', async () => {
    const service = new NativeVoiceService()

    await service.playAssistantTurn(73, 'canonical chat')

    expect(mocks.transportFetch).toHaveBeenCalledTimes(1)
    expect(mocks.transportFetch).toHaveBeenCalledWith(
      '/audio/speech/73?session_id=canonical%20chat',
      expect.objectContaining({ method: 'POST' }),
    )
    const serializedCall = JSON.stringify(mocks.transportFetch.mock.calls[0])
    expect(serializedCall).not.toContain('transcript')
    expect(serializedCall).not.toContain('text')
    expect(mocks.transportFetchJson).toHaveBeenCalledWith(
      '/audio/speech/delivery-73/playout?session_id=canonical%20chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Arrakis-Speech-Plan-SHA256': SPEECH_PLAN_SHA256 },
        body: JSON.stringify(PLAYOUT_REPORT_V2),
      }),
    )
    const persisted = JSON.parse(mocks.transportFetchJson.mock.calls[0][1].body)
    expect(persisted).toEqual(PLAYOUT_REPORT_V2)
    expect(persisted.player_open_to_first_quantum_ms).toBeGreaterThanOrEqual(
      persisted.player_open_to_first_frame_ms,
    )
    expect(persisted.stop_to_worklet_ack_ms).toBeGreaterThanOrEqual(
      persisted.stop_to_local_mute_command_ms,
    )
  })

  it.each([
    ['missing', undefined],
    ['malformed', 'A'.repeat(64)],
  ])('rejects a response with a %s speech-plan digest', async (_case, digest) => {
    const headers: Record<string, string> = {
      'X-Arrakis-Audio-Protocol': 'arrakis_pcm_frames_v1',
      'X-Arrakis-Sample-Rate': '24000',
      'X-Arrakis-Channels': '1',
      'X-Arrakis-Encoding': 'pcm_s16le',
      'X-Arrakis-Delivery-Id': 'delivery-73',
      'X-Arrakis-Utterance-Id': 'utterance-73',
      'X-Arrakis-Epoch': '1',
    }
    if (digest !== undefined) headers['X-Arrakis-Speech-Plan-SHA256'] = digest
    mocks.transportFetch.mockResolvedValueOnce(new Response(
      new Uint8Array([1, 2]),
      { headers },
    ))

    await expect(
      new NativeVoiceService().playAssistantTurn(73, 'canonical chat'),
    ).rejects.toThrow('AUDIO_STREAM_BINDING_INVALID')
    expect(mocks.transportFetchJson).not.toHaveBeenCalled()
  })
})
