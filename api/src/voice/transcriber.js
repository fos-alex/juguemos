/**
 * Speech to text for voice notes (JUG-95). Any service that speaks the OpenAI
 * transcriptions API works: the self-hosted Whisper server in Compose
 * (speaches), or a hosted one such as Groq or OpenAI, chosen with STT_URL and
 * STT_MODEL in config.js. Server-side only.
 *
 * The audio goes to the service in the request body and nowhere else. It is
 * never written to disk or logged, and nothing holds it once the request ends.
 */
import { AppError } from '../errors.js'

/** @typedef {import('../config.js').SttConfig} SttConfig */
/**
 * @typedef {object} Transcriber
 * @property {(note: { audio: Buffer, type: string, hints?: string }) => Promise<string>} transcribe
 *   `type` is the audio's media type without parameters; `hints` are words the
 *   service should expect, such as the family's names.
 */

/** A three-minute note on a small CPU can take a while. */
const TIMEOUT_MS = 120_000

/** File names by media type, since some services go by the extension. */
const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
}

/**
 * @param {{ config: SttConfig }} deps
 * @returns {Transcriber | null} null when no service is configured
 */
export function createTranscriber({ config }) {
  if (!config.url) return null
  const url = `${config.url.replace(/\/$/, '')}/audio/transcriptions`

  return {
    async transcribe({ audio, type, hints }) {
      const form = new FormData()
      const extension = EXTENSIONS[/** @type {keyof typeof EXTENSIONS} */ (type)] ?? 'webm'
      form.append('file', new Blob([audio], { type }), `nota.${extension}`)
      form.append('model', config.model)
      form.append('language', 'es')
      form.append('response_format', 'json')
      if (hints) form.append('prompt', hints)

      const response = await fetch(url, {
        method: 'POST',
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).catch((error) => {
        throw new TranscriptionError(`The speech-to-text service is unreachable: ${error.message}`)
      })
      if (!response.ok) {
        const reason = await response.text().catch(() => '')
        throw new TranscriptionError(`The speech-to-text service answered HTTP ${response.status}: ${reason.slice(0, 300)}`)
      }
      const data = /** @type {{ text?: unknown } | null} */ (await response.json().catch(() => null))
      if (typeof data?.text !== 'string') throw new TranscriptionError('The speech-to-text service answered without text')
      return data.text.trim()
    },
  }
}

/** The speech-to-text service failed, in a way the parent can only retry. */
export class TranscriptionError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 502)
  }
}
