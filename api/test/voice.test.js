import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { TranscriptionError } from '../src/voice/transcriber.js'
import { MAX_NOTE_BYTES } from '../src/voice/voice.routes.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/**
 * A speech-to-text service that answers by hand and remembers every note.
 * @param {(note: { audio: Buffer, type: string, hints?: string }) => string | Promise<string>} [answer]
 */
const fakeTranscriber = (answer = () => 'Somos Alex y Caro, tenemos a Milán, de dos años.') => {
  /** @type {{ audio: Buffer, type: string, hints?: string }[]} */
  const notes = []
  return {
    notes,
    /** @param {{ audio: Buffer, type: string, hints?: string }} note */
    async transcribe(note) {
      notes.push(note)
      return answer(note)
    },
  }
}

/** Stands in for a recording: the API never decodes it, only passes it on. */
const AUDIO = Buffer.alloc(4096, 7)

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {ReturnType<typeof fakeTranscriber>} */
let transcriber
const emails = Array.from({ length: 10 }, (_, i) => `voz-${i}@example.com`)
let emailCount = 0
const signUp = () => signUpAs(api, emails[emailCount++])

before(async () => {
  transcriber = fakeTranscriber()
  api = await startApi({ signupEmails: [...emails, 'off@example.com', 'falla@example.com'], transcriber })
})
after(() => api.close())

/**
 * @param {string} cookie
 * @param {{ body?: Buffer | string, type?: string, target?: Awaited<ReturnType<typeof startApi>> }} [options]
 */
const send = (cookie, { body = AUDIO, type = 'audio/webm;codecs=opus', target = api } = {}) =>
  target.app.inject({
    method: 'POST',
    url: '/voice/transcribe',
    headers: { cookie, 'content-type': type },
    payload: body,
  })

test('a recording comes back as its words, before the family exists', async () => {
  const { cookie } = await signUp()
  const before = transcriber.notes.length

  const response = await send(cookie)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { text: 'Somos Alex y Caro, tenemos a Milán, de dos años.' })

  const note = transcriber.notes[before]
  assert.equal(note.type, 'audio/webm')
  assert.ok(note.audio.equals(AUDIO), 'the recording reaches the service as it was sent')
  assert.equal(note.hints, undefined, 'no family yet, so no names to expect')
})

test("Safari's MP4 recordings are taken too", async () => {
  const { cookie } = await signUp()
  const response = await send(cookie, { type: 'audio/mp4' })
  assert.equal(response.statusCode, 200)
  assert.equal(transcriber.notes.at(-1)?.type, 'audio/mp4')
})

test("once there is a family, its names go to the service as hints, exactly as written", async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  await send(cookie)
  assert.equal(
    transcriber.notes.at(-1)?.hints,
    'Milán, Inca, el dinosaurio chiquito, el tren grandote, el osito marrón, el caballo percherón.',
  )
})

test('without a session, no recording reaches the service', async () => {
  const before = transcriber.notes.length
  const response = await send('')
  assert.equal(response.statusCode, 401)
  assert.equal(transcriber.notes.length, before)
})

test('an empty recording is refused', async () => {
  const { cookie } = await signUp()
  const response = await send(cookie, { body: Buffer.alloc(10) })
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'EMPTY_NOTE')
})

test('only audio is taken', async () => {
  const { cookie } = await signUp()
  assert.equal((await send(cookie, { type: 'text/plain', body: 'hola' })).statusCode, 415)
  assert.equal((await send(cookie, { type: 'application/json', body: '{}' })).statusCode, 415)
  assert.equal((await send(cookie, { type: 'video/webm' })).statusCode, 415)
})

test('a recording over the limit is refused before it reaches the service', async () => {
  const { cookie } = await signUp()
  const before = transcriber.notes.length
  const response = await send(cookie, { body: Buffer.alloc(MAX_NOTE_BYTES + 1) })
  assert.equal(response.statusCode, 413)
  assert.equal(transcriber.notes.length, before)
})

test('when the service fails, the parent gets the plain failure and no details', async () => {
  const failing = fakeTranscriber(() => {
    throw new TranscriptionError('The speech-to-text service answered HTTP 500: model not loaded')
  })
  const api2 = await startApi({ signupEmails: ['falla@example.com'], transcriber: failing })
  const { cookie } = await signUpAs(api2, 'falla@example.com')

  const response = await send(cookie, { target: api2 })
  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.json(), { error: 'internal error' })
  await api2.close()
})

test('without a speech-to-text service, voice notes say they are off', async () => {
  const api2 = await startApi({ signupEmails: ['off@example.com'] })
  const { cookie } = await signUpAs(api2, 'off@example.com')

  const response = await send(cookie, { target: api2 })
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().code, 'VOICE_OFF')
  await api2.close()
})
