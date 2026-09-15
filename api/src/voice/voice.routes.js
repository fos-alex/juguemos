import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./voice.controller.js').createVoiceController>} VoiceController */

/**
 * The largest recording accepted. The web stops a note at three minutes,
 * which Safari's AAC fills to about 3 MB and Chrome's Opus to well under one.
 */
export const MAX_NOTE_BYTES = 8 * 1024 * 1024

const transcript = {
  type: 'object',
  required: ['text'],
  properties: { text: { type: 'string' } },
}

// An empty note is 400, anything but audio 415, one over the limit 413, and a
// server with no speech-to-text service 503 with VOICE_OFF.
const errors = {
  400: errorBody,
  401: errorBody,
  413: errorBody,
  415: errorBody,
  500: errorBody,
  503: errorBody,
}

/**
 * Takes a recording as the raw request body, with its audio media type as the
 * Content-Type, and answers with its words. Needs a session like every route,
 * but no family, since onboarding records before there is one.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: VoiceController }} options
 */
export async function voiceRoutes(app, { controller }) {
  // Only inside this plugin: audio is read into memory as one buffer, and
  // never touches the disk. Other media types get Fastify's 415.
  app.addContentTypeParser(/^audio\//, { parseAs: 'buffer', bodyLimit: MAX_NOTE_BYTES }, (_request, body, done) => {
    done(null, body)
  })
  app.post(
    '/voice/transcribe',
    { bodyLimit: MAX_NOTE_BYTES, schema: { response: { 200: transcript, ...errors } } },
    controller.transcribe,
  )
}
