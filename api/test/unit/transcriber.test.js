import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { ConfigError, DEFAULT_STT_MODEL, loadConfig } from '../../src/config.js'
import { UpstreamError } from '../../src/errors.js'
import { createTranscriber } from '../../src/voice/transcriber.js'

/** @typedef {{ url: string | undefined, headers: import('node:http').IncomingHttpHeaders, form: FormData }} Received */

/** @type {Received[]} */
let received = []
/** How the fake service answers the next request. @type {(response: import('node:http').ServerResponse) => void} */
let answer = () => {}

/** @type {import('node:http').Server} */
let server
/** @type {string} */
let baseUrl
before(async () => {
  server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    // Read the multipart body the way a server would.
    const form = await new Request('http://stt.local', {
      method: 'POST',
      headers: { 'content-type': String(request.headers['content-type']) },
      body: Buffer.concat(chunks),
    }).formData()
    received.push({ url: request.url, headers: request.headers, form })
    answer(response)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)))
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address())
  baseUrl = `http://127.0.0.1:${port}/v1`
})
after(() => server.close())

/** @param {object} body */
const json = (body) => (/** @type {import('node:http').ServerResponse} */ response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

const AUDIO = Buffer.from('not really audio, but the client never looks')

test('without a URL there is no transcriber', () => {
  assert.equal(createTranscriber({ config: { url: null, model: DEFAULT_STT_MODEL, apiKey: null } }), null)
})

test('the note goes to the transcriptions API with the model, Spanish, and the hints', async () => {
  received = []
  answer = json({ text: '  Somos Alex y Caro.  ' })
  const transcriber = createTranscriber({ config: { url: `${baseUrl}/`, model: 'whisper-x', apiKey: null } })

  const text = await transcriber?.transcribe({ audio: AUDIO, type: 'audio/mp4', hints: 'Milán, Inca.' })
  assert.equal(text, 'Somos Alex y Caro.')

  const [request] = received
  assert.equal(request.url, '/v1/audio/transcriptions')
  assert.equal(request.headers.authorization, undefined, 'the self-hosted service needs no key')
  assert.equal(request.form.get('model'), 'whisper-x')
  assert.equal(request.form.get('language'), 'es')
  assert.equal(request.form.get('response_format'), 'json')
  assert.equal(request.form.get('prompt'), 'Milán, Inca.')
  const file = /** @type {File} */ (request.form.get('file'))
  assert.equal(file.name, 'nota.m4a')
  assert.equal(file.type, 'audio/mp4')
  assert.ok(Buffer.from(await file.arrayBuffer()).equals(AUDIO))
})

test('a hosted service gets its key, and no hints means no prompt', async () => {
  received = []
  answer = json({ text: 'Hola.' })
  const transcriber = createTranscriber({ config: { url: baseUrl, model: 'whisper-large-v3-turbo', apiKey: 'the-key' } })

  await transcriber?.transcribe({ audio: AUDIO, type: 'audio/webm' })
  const [request] = received
  assert.equal(request.headers.authorization, 'Bearer the-key')
  assert.equal(request.form.get('prompt'), null)
  assert.equal(/** @type {File} */ (request.form.get('file')).name, 'nota.webm')
})

test('a refused request throws UpstreamError with the reason, for the log', async () => {
  answer = (response) => {
    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ detail: 'Model not installed' }))
  }
  const transcriber = createTranscriber({ config: { url: baseUrl, model: 'whisper-x', apiKey: null } })
  await assert.rejects(
    transcriber?.transcribe({ audio: AUDIO, type: 'audio/webm' }) ?? Promise.resolve(),
    (error) => error instanceof UpstreamError && /HTTP 404/.test(error.message) && /not installed/.test(error.message),
  )
})

test('an answer without text throws UpstreamError', async () => {
  answer = json({ segments: [] })
  const transcriber = createTranscriber({ config: { url: baseUrl, model: 'whisper-x', apiKey: null } })
  await assert.rejects(
    transcriber?.transcribe({ audio: AUDIO, type: 'audio/webm' }) ?? Promise.resolve(),
    (error) => error instanceof UpstreamError && /without text/.test(error.message),
  )
})

const REQUIRED = { BETTER_AUTH_URL: 'https://juguemos.local:3000', BETTER_AUTH_SECRET: 'a-secret-that-is-at-least-32-chars' }

test('STT settings: off without a URL, the self-hosted model by default, and a key for hosted services', () => {
  assert.deepEqual(loadConfig(REQUIRED).stt, { url: null, model: DEFAULT_STT_MODEL, apiKey: null })
  assert.deepEqual(
    loadConfig({ ...REQUIRED, STT_URL: 'https://api.groq.com/openai/v1', STT_MODEL: 'whisper-large-v3-turbo', STT_API_KEY: 'k' }).stt,
    { url: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo', apiKey: 'k' },
  )
  assert.throws(
    () => loadConfig({ ...REQUIRED, STT_URL: 'stt sin url' }),
    (error) => error instanceof ConfigError && /STT_URL must be a URL/.test(error.message),
  )
})
