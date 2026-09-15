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

const off = {
  type: 'object',
  required: ['error', 'code'],
  properties: { error: { type: 'string' }, code: { type: 'string' } },
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
    { bodyLimit: MAX_NOTE_BYTES, schema: { response: { 200: transcript, 503: off } } },
    controller.transcribe,
  )
}
