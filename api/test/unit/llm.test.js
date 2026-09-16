import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { UpstreamError } from '../../src/errors.js'
import { createLlm } from '../../src/llm/client.js'
import { GUARDRAILS, withGuardrails } from '../../src/llm/guardrails.js'

/** @typedef {{ url: string | undefined, headers: import('node:http').IncomingHttpHeaders, body: any }} Received */

/** @type {Received[]} */
let received = []
/** How the fake provider answers the next request. @type {(response: import('node:http').ServerResponse) => void} */
let answer = () => {}

/** @type {import('node:http').Server} */
let server
/** @type {string} */
let baseUrl
before(async () => {
  server = createServer(async (request, response) => {
    let raw = ''
    for await (const chunk of request) raw += chunk
    received.push({ url: request.url, headers: request.headers, body: JSON.parse(raw) })
    answer(response)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)))
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address())
  baseUrl = `http://127.0.0.1:${port}/v1`
})
after(() => server.close())

/**
 * A streamed answer in the chat completions format, with the keep-alive
 * comment OpenRouter sends while it waits for the model.
 * @param {import('node:http').ServerResponse} response
 * @param {string[]} pieces
 * @param {object[]} [events] sent after the pieces
 */
function stream(response, pieces, events = []) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream' })
  response.write(': OPENROUTER PROCESSING\n\n')
  for (const piece of pieces) response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`)
  for (const event of events) response.write(`data: ${JSON.stringify(event)}\n\n`)
  response.end('data: [DONE]\n\n')
}

/** @param {Partial<import('../../src/config.js').LlmConfig>} [overrides] @returns {import('../../src/config.js').LlmConfig} */
const config = (overrides) => ({
  provider: 'opencode',
  apiKey: 'the-key',
  baseUrl,
  model: 'glm-5.3-flash',
  appUrl: 'https://ludi.local:3000',
  ...overrides,
})
const openRouter = () => config({ provider: 'openrouter', model: 'some-lab/some-model' })

/** @param {import('../../src/llm/client.js').Llm | null} llm */
async function write(llm) {
  let text = ''
  for await (const piece of /** @type {import('../../src/llm/client.js').Llm} */ (llm).stream({ system: 'sistema', user: 'usuario' })) {
    text += piece
  }
  return text
}

test('without the chosen provider key there is no client', () => {
  assert.equal(createLlm({ config: config({ apiKey: null }) }), null)
})

test('OpenCode gets the model, the key, the prompts, and a new session id per story', async () => {
  received = []
  answer = (response) => stream(response, ['Había ', 'una vez'])
  const llm = createLlm({ config: config() })
  assert.equal(await write(llm), 'Había una vez')
  await write(llm)

  const [first, second] = received
  assert.equal(first.url, '/v1/chat/completions')
  assert.equal(first.headers.authorization, 'Bearer the-key')
  assert.equal(first.body.model, 'glm-5.3-flash')
  assert.equal(first.body.stream, true)
  assert.deepEqual(first.body.messages, [
    { role: 'system', content: withGuardrails('sistema') },
    { role: 'user', content: 'usuario' },
  ])
  assert.match(String(first.headers['x-opencode-session']), /^ludi-/)
  assert.notEqual(first.headers['x-opencode-session'], second.headers['x-opencode-session'])
  assert.equal(first.body.provider, undefined)
})

test('OpenRouter gets the app name and refuses providers that store or train on prompts', async () => {
  received = []
  answer = (response) => stream(response, ['Había ', 'una vez'])
  assert.equal(await write(createLlm({ config: openRouter() })), 'Había una vez')

  const [request] = received
  assert.equal(request.body.model, 'some-lab/some-model')
  assert.deepEqual(request.body.provider, { data_collection: 'deny' })
  assert.equal(request.headers['http-referer'], 'https://ludi.local:3000')
  assert.equal(request.headers['x-title'], 'Ludi')
  assert.equal(request.headers['x-opencode-session'], undefined)
})

test('every call carries the guardrails, and the family\'s words go in the data block', async () => {
  received = []
  answer = (response) => stream(response, ['{}'])
  const llm = /** @type {import('../../src/llm/client.js').Llm} */ (createLlm({ config: config() }))
  // The answer itself doesn't matter here, only what the request carried.
  for await (const piece of llm.stream({ system: 'sistema', user: 'sacá los datos', data: 'Tenemos a Milán, de dos años.' })) {
    assert.equal(piece, '{}')
  }

  const [{ messages }] = received.map((request) => request.body)
  assert.ok(messages[0].content.startsWith(GUARDRAILS), 'the rules open the system prompt')
  assert.equal(messages[1].content, 'sacá los datos\n\n<datos-de-la-familia>\nTenemos a Milán, de dos años.\n</datos-de-la-familia>')
})

test('a refused request throws UpstreamError with the provider reason', async () => {
  answer = (response) => {
    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: { message: 'No endpoints found matching your data policy' } }))
  }
  await assert.rejects(
    write(createLlm({ config: openRouter() })),
    (error) => error instanceof UpstreamError && /HTTP 404/.test(error.message) && /data policy/.test(error.message),
  )
})

test('an error partway through the stream throws UpstreamError', async () => {
  answer = (response) => stream(response, ['Había '], [{ error: { message: 'Provider disconnected' } }])
  await assert.rejects(
    write(createLlm({ config: openRouter() })),
    (error) => error instanceof UpstreamError && /Provider disconnected/.test(error.message),
  )
})
