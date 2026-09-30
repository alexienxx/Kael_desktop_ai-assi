# Arrakis native PCM player

This is the real Web Audio component used by `nativeVoiceService` from the
desktop application. It must not synthesize arbitrary client text, restore
legacy TTS URLs, or invent a delivery/utterance identity.

## Contract

- One player owns one server-issued delivery/utterance/epoch. One active player
  per JavaScript context; cross-window admission belongs to the server.
- The server-issued binding also contains the lowercase SHA-256 of the
  canonical SpeechPlan. The service rejects a missing or malformed digest
  before opening the player, keeps it in the immutable delivery binding, and
  returns it on every playout receipt. The AudioWorklet receives only
  utterance/epoch because the plan digest is presentation identity, not DSP
  input.
- Input is PCM signed 16-bit little-endian, mono, 24 kHz; frames contain at most
  2,400 samples. The queue is bounded by both 9,600 samples and four frames.
  Total input is bounded by 720,000 samples and 4,096 frames.
- Open from a user gesture; startup has a ten-second bound. Feed consumes
  asynchronous capacity with one outstanding feed. Each frame is copied before
  awaiting capacity. Wrong utterance/epoch is rejected without killing current
  playback; malformed current-attempt coordinates fail the current player.
- `finish(totalSamples)` is permitted only after an authenticated server end
  marker. EOF or a broken socket alone must not be translated to completion.
- `stop()` mutes the gain immediately, then requests processor stop. It does
  not wait for network/database. The final interruption freezes the last
  pre-mute observed sample boundary and marks discontinuity, because processor
  counts after mute can include suppressed output. Stop acknowledgement has a
  one-second bound; an unavailable processor produces no fabricated receipt.
- `terminal` is local rendering outcome. Await `receiptDelivery` after terminal
  to separately observe receipt consumer completion, and `closed` before
  opening the next player. Async receipt callbacks are serialized, bounded to
  four outstanding observations, and their failures remain explicit.
- Completed rendering gets a bounded drain allowance based on browser latency
  properties before context close; this avoids immediately truncating the final
  quantum. A stop during this tail still mutes locally. This scheduling
  allowance is not a measured device-delivery guarantee.
- Failed context close leaves admission closed with
  `AUDIO_PLAYER_CLOSE_UNCONFIRMED`; it is not silently treated as resource
  release. No automatic replay or speech re-generation occurs here.

## Evidence limits

An AudioWorklet processes blocks in the browser audio rendering thread;
output block length is read dynamically. See the [Web Audio processor
contract](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process).
The requested sample rate must be supported by the browser; an incompatible
context is rejected rather than playing at the wrong pitch. See
[AudioContext options](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext).

Reports use `audio_worklet_render_quantum`, not hardware acknowledgement.
`measured_at` is the main thread's receipt observation time, not a sample-clock
timestamp usable for precise latency benchmarking. Device latency, audibility,
human attention and semantic word alignment remain unproved. Stop's frozen
boundary may undercount genuinely audible audio; it deliberately cannot include
new samples counted upstream after local mute.

No raw PCM, transcript, voice reference, API credential or conversation is
persisted by this player. The SpeechPlan digest is metadata and contains no
surface text. Unconsumed frames are dropped at termination. Browser
engine tests, if available, do not prove soundcard output, production endpoint
wiring, acoustic echo cancellation or full duplex.

## Verification status

Main-agent local and lifecycle audits completed; independent review led to
stale-frame isolation, explicit async receipt failure, and conservative stop
boundary corrections. Targeted checks on 26 September 2026:

- `node --check` passed for the worklet. TypeScript 5.7.3 semantic typecheck
  passed with zero diagnostics using the existing Vite declarations.
- Real cached Chromium 1208 headless created AudioContext/AudioWorklet at
  24 kHz: 2,400 PCM samples completed with boundary 2,400 and no discontinuity.
  Context closure followed about 71 ms later, with the bounded drain allowance.
- A stale frame was rejected without closing the current player; a subsequent
  valid frame was accepted. Immediate stop returned interrupted/boundary 0 with
  discontinuity, conservatively preserving the pre-mute observed boundary.
  The final-source run awaited both async receiptDelivery and closed.
- Test harness loaded production source into the actual browser engine. TS was
  transpiled and only the Vite asset base URL was replaced by the local file URL.
  No replacement AudioContext/processor, fake endpoint or backend was used.

No production app/backend has been started. These are engine/type checks only;
hardware output, UI wiring, authenticated transport and persistence remain open.
