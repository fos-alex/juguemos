/**
 * The voice recorder (JUG-95): the microphone in, one audio blob out. Plain
 * browser APIs and no React, so a native client can swap in its own recorder
 * without touching the screens (architecture §5.4).
 *
 * Chrome records Opus in WebM, Firefox Opus in Ogg, and Safari AAC in MP4;
 * the API takes all of them. The microphone is released as soon as a note
 * ends, so the browser's recording indicator goes away with it. Nothing here
 * keeps the audio: the blob lives only as long as the screen holds it.
 */

/** A note stops by itself after three minutes. */
export const MAX_SECONDS = 180

/** What to ask the browser for, in order. Safari takes the MP4 one. */
const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']

/** Enough for speech, and it keeps a three-minute note under 1 MB. */
const BITS_PER_SECOND = 32_000

/** The parent, or the browser's settings, said no to the microphone. */
export class MicDeniedError extends Error {}

/** This browser or device can't record: no MediaRecorder, or no microphone. */
export class CannotRecordError extends Error {}

/** Whether this browser has what recording needs. It may still lack a microphone. */
export function canRecord() {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

/**
 * @typedef {object} Recording
 * @property {() => Promise<Blob>} stop ends the note and returns it
 * @property {() => void} cancel ends the note and drops it
 * @property {() => number} level how loud it is right now, from 0 to 1
 * @property {() => number} seconds how long it has been recording
 */

/**
 * Asks for the microphone and starts recording. The first time, the browser
 * asks the parent for permission, and this waits for the answer. Call it from
 * the press itself: Safari lets audio start only inside a gesture.
 * @param {{ onLimit?: () => void }} [options] `onLimit` runs when the note reaches MAX_SECONDS
 * @returns {Promise<Recording>}
 */
export async function startRecording({ onLimit } = {}) {
  if (!canRecord()) throw new CannotRecordError('This browser cannot record')
  // Created before the first await, while the press still counts as a gesture.
  const context = createAudioContext()

  /** @type {MediaStream} */
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (error) {
    void context?.close().catch(() => {})
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicDeniedError('The microphone is not allowed')
    throw new CannotRecordError(`No microphone to record with (${name || 'unknown'})`)
  }

  const type = TYPES.find((candidate) => MediaRecorder.isTypeSupported?.(candidate))
  /** @type {MediaRecorder} */
  let recorder
  try {
    recorder = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: BITS_PER_SECOND } : undefined)
  } catch {
    release(stream)
    void context?.close().catch(() => {})
    throw new CannotRecordError('The browser refused to record the microphone')
  }

  /** @type {Blob[]} */
  const chunks = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const meter = createMeter(context, stream)
  const started = performance.now()
  const limit = setTimeout(() => onLimit?.(), MAX_SECONDS * 1000)

  /** @type {Promise<void> | null} */
  let finished = null
  const finish = () => {
    finished ??= new Promise((resolve) => {
      clearTimeout(limit)
      meter.close()
      if (recorder.state === 'inactive') {
        release(stream)
        resolve()
        return
      }
      recorder.onstop = () => {
        release(stream)
        resolve()
      }
      recorder.stop()
    })
    return finished
  }

  // Chunks every second: Safari has lost the tail of a note recorded as one piece.
  recorder.start(1000)

  return {
    async stop() {
      await finish()
      return new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' })
    },
    cancel() {
      void finish().then(() => {
        chunks.length = 0
      })
    },
    level: () => meter.level(),
    seconds: () => (performance.now() - started) / 1000,
  }
}

/** @param {MediaStream} stream */
function release(stream) {
  for (const track of stream.getTracks()) track.stop()
}

/** @returns {AudioContext | null} */
function createAudioContext() {
  try {
    return new AudioContext()
  } catch {
    return null
  }
}

/**
 * Loudness for the level trace. Without Web Audio the trace stays flat and
 * the recording still works.
 * @param {AudioContext | null} context
 * @param {MediaStream} stream
 */
function createMeter(context, stream) {
  if (!context) return { level: () => 0, close() {} }
  try {
    void context.resume().catch(() => {})
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    return {
      level() {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) {
          const value = (sample - 128) / 128
          sum += value * value
        }
        // Speech sits low on this scale; stretch it so the trace moves.
        return Math.min(1, Math.sqrt(sum / samples.length) * 4)
      },
      close() {
        source.disconnect()
        void context.close().catch(() => {})
      },
    }
  } catch {
    void context.close().catch(() => {})
    return { level: () => 0, close() {} }
  }
}
