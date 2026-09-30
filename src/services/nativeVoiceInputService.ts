/** Local bounded microphone capture for canonical Arrakis voice notes.
 *
 * The browser owns acoustic processing.  Requested/reported AEC, NS and AGC
 * are capability evidence only; this service never claims speakerphone AEC is
 * effective without a device test.  No audio is persisted in the client.
 */

export type VoiceInputState = 'idle' | 'recording' | 'stopping'

export interface VoiceCaptureCapabilities {
  echoCancellation: boolean | null
  noiseSuppression: boolean | null
  autoGainControl: boolean | null
  sampleRate: number | null
  channelCount: number | null
}

export interface CapturedVoiceNote {
  audio: Blob
  mimeType: string
  durationMs: number
  capabilities: Readonly<VoiceCaptureCapabilities>
}

const MAX_CAPTURE_MS = 55_000
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024

function chooseMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  return candidates.find((value) => MediaRecorder.isTypeSupported(value)) ?? ''
}

function reportedBoolean(value: ConstrainBoolean | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export class NativeVoiceInputService {
  private state: VoiceInputState = 'idle'
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private bytes = 0
  private startedAt = 0
  private limitTimer: ReturnType<typeof setTimeout> | null = null
  private stopPromise: Promise<CapturedVoiceNote> | null = null
  private resolveStop: ((note: CapturedVoiceNote) => void) | null = null
  private rejectStop: ((reason: unknown) => void) | null = null
  private capabilities: VoiceCaptureCapabilities = {
    echoCancellation: null,
    noiseSuppression: null,
    autoGainControl: null,
    sampleRate: null,
    channelCount: null,
  }

  getState(): VoiceInputState {
    return this.state
  }

  async start(onLimit: (note: CapturedVoiceNote) => void): Promise<VoiceCaptureCapabilities> {
    if (this.state !== 'idle') throw new Error('Voice capture is already active')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Microphone capture is unavailable in this client')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    })
    const track = stream.getAudioTracks()[0]
    if (!track || track.readyState !== 'live') {
      stream.getTracks().forEach((candidate) => candidate.stop())
      throw new Error('The microphone did not expose a live audio track')
    }
    const settings = track.getSettings()
    this.capabilities = {
      echoCancellation: reportedBoolean(settings.echoCancellation),
      noiseSuppression: reportedBoolean(settings.noiseSuppression),
      autoGainControl: reportedBoolean(settings.autoGainControl),
      sampleRate: typeof settings.sampleRate === 'number' ? settings.sampleRate : null,
      channelCount: typeof settings.channelCount === 'number' ? settings.channelCount : null,
    }

    const mimeType = chooseMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch (error) {
      stream.getTracks().forEach((candidate) => candidate.stop())
      throw error
    }
    this.stream = stream
    this.recorder = recorder
    this.chunks = []
    this.bytes = 0
    this.startedAt = performance.now()
    this.stopPromise = new Promise<CapturedVoiceNote>((resolve, reject) => {
      this.resolveStop = resolve
      this.rejectStop = reject
    })

    recorder.addEventListener('dataavailable', (event: BlobEvent) => {
      if (!event.data.size) return
      this.bytes += event.data.size
      if (this.bytes <= MAX_CAPTURE_BYTES) this.chunks.push(event.data)
      if (this.bytes > MAX_CAPTURE_BYTES && recorder.state === 'recording') recorder.stop()
    })
    recorder.addEventListener('error', (event) => {
      this.finishWithError(new Error(`Microphone recorder failed: ${event.error.name}`))
    })
    recorder.addEventListener('stop', () => this.finishRecording())
    try {
      recorder.start(250)
    } catch (error) {
      this.finishWithError(error instanceof Error ? error : new Error('Microphone recorder could not start'))
      throw error
    }
    this.state = 'recording'
    this.limitTimer = setTimeout(() => {
      void this.stop().then(onLimit).catch(() => undefined)
    }, MAX_CAPTURE_MS)
    return { ...this.capabilities }
  }

  stop(): Promise<CapturedVoiceNote> {
    if (!this.stopPromise || !this.recorder || this.state === 'idle') {
      return Promise.reject(new Error('Voice capture is not active'))
    }
    if (this.state === 'recording') {
      this.state = 'stopping'
      this.recorder.stop()
    }
    return this.stopPromise
  }

  async cancel(): Promise<void> {
    if (this.state === 'idle') return
    try {
      await this.stop()
    } catch {
      // Cleanup below is authoritative even when the recorder failed.
    }
  }

  private finishRecording(): void {
    if (!this.stopPromise) return
    const mimeType = this.recorder?.mimeType || this.chunks[0]?.type || 'application/octet-stream'
    const audio = new Blob(this.chunks, { type: mimeType })
    const durationMs = Math.max(0, Math.round(performance.now() - this.startedAt))
    if (!audio.size) this.finishWithError(new Error('The microphone recording was empty'))
    else if (this.bytes > MAX_CAPTURE_BYTES) {
      this.finishWithError(new Error('The microphone recording exceeded the 4 MiB limit'))
    } else {
      const resolve = this.resolveStop
      const capabilities = Object.freeze({ ...this.capabilities })
      this.cleanup()
      resolve?.({ audio, mimeType, durationMs, capabilities })
    }
  }

  private finishWithError(error: Error): void {
    const reject = this.rejectStop
    this.cleanup()
    reject?.(error)
  }

  private cleanup(): void {
    if (this.limitTimer) clearTimeout(this.limitTimer)
    this.limitTimer = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.recorder = null
    this.chunks = []
    this.bytes = 0
    this.startedAt = 0
    this.state = 'idle'
    this.stopPromise = null
    this.resolveStop = null
    this.rejectStop = null
  }
}

export const nativeVoiceInputService = new NativeVoiceInputService()
