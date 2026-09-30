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
    mocks.open.mockImplementation(async (bindingPromise: Promise<unknown>) => {
      await bindingPromise
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
  })
})
