import { userOf } from '../auth/session.js'
import { AppError, UnavailableError, ValidationError } from '../errors.js'

/** @typedef {ReturnType<typeof import('./voice.service.js').createVoiceService>} VoiceService */

/** Anything smaller than this holds no speech: a tap on the mic, not a note. */
const MIN_BYTES = 200

/**
 * The media type without its parameters: `audio/webm;codecs=opus` is `audio/webm`.
 * @param {string | undefined} header
 */
const mediaTypeOf = (header = '') => header.split(';')[0].trim().toLowerCase()

/** Voice notes for the signed-in adult. @param {{ voice: VoiceService }} deps */
export function createVoiceController({ voice }) {
  return {
    /**
     * The recording is the raw request body, in memory only. A server
     * without a speech-to-text service answers 503 with a code, so the web
     * can say voice notes are off instead of failing like a bug.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async transcribe(request) {
      if (!voice.available) throw new UnavailableError('Voice notes are off', 'VOICE_OFF')
      const audio = request.body
      // Only an audio Content-Type arrives as a buffer; text and JSON are parsed as themselves.
      if (!Buffer.isBuffer(audio)) throw new AppError('A voice note is audio', 415, 'NOT_AUDIO')
      if (audio.length < MIN_BYTES) throw new ValidationError('The recording is empty', 'EMPTY_NOTE')
      const text = await voice.transcribe(userOf(request).id, {
        audio,
        type: mediaTypeOf(request.headers['content-type']),
      })
      return { text }
    },
  }
}
