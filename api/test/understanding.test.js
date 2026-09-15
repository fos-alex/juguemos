import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { buildApp } from '../src/app.js'
import { readUnderstanding } from '../src/families/understanding.js'
import { signUpAs, startApi } from './helpers.js'

// The design brief's example paragraph.
const TEXT =
  'Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota. A Milán le encantan los dinosaurios y los caballos, y tiene un tren de madera que no suelta.'

/** @param {object} overrides */
const answer = (overrides = {}) =>
  JSON.stringify({
    kids: [{ name: 'Milán', age: 2 }],
    pets: [{ name: 'Inca' }],
    interests: ['los dinosaurios', 'los caballos'],
    toys: ['un tren de madera'],
    unsure: [],
    note: null,
    ...overrides,
  })

/** A model that gives one fixed answer and remembers what it was asked. @param {string} reply */
const fakeLlm = (reply) => {
  /** @type {{ system: string, user: string }[]} */
  const calls = []
  return {
    calls,
    /** @param {{ system: string, user: string }} call */
    async *stream({ system, user }) {
      calls.push({ system, user })
      yield reply.slice(0, 10)
      yield reply.slice(10)
    },
  }
}

test('the example paragraph becomes the family, with nothing to check', () => {
  assert.deepEqual(readUnderstanding(answer(), TEXT), {
    family: {
      kids: [{ name: 'Milán', age: 2 }],
      pets: [{ name: 'Inca' }],
      interests: ['los dinosaurios', 'los caballos'],
      toys: [{ name: 'un tren de madera' }],
    },
    unsure: [],
    note: null,
  })
})

test('names keep the spelling the parent used, even when the model changes it', () => {
  const text = 'tenemos a milán y a inca, que juega con el osito'
  const understood = readUnderstanding(answer({ kids: [{ name: 'Milán', age: null }], toys: ['El Osito'] }), text)
  assert.equal(understood?.family.kids[0].name, 'milán')
  assert.equal(understood?.family.pets[0].name, 'inca')
  assert.deepEqual(understood?.family.toys, [{ name: 'el osito' }])
  assert.deepEqual(understood?.unsure, [])
})

test('a kid or pet the text does not name is flagged, with a note', () => {
  const understood = readUnderstanding(
    answer({ kids: [{ name: 'Milán', age: 2 }, { name: 'Sofía', age: 4 }], pets: [{ name: 'Firulais' }] }),
    TEXT,
  )
  assert.deepEqual(understood?.unsure.sort(), ['kids.1', 'pet'])
  assert.match(String(understood?.note), /Revisá lo marcado/)
})

test('the model doubts are kept, and follow a kid when an empty one is dropped', () => {
  const understood = readUnderstanding(
    answer({
      kids: [{ name: '', age: 3 }, { name: 'Milán', age: 2 }],
      unsure: ['kids.1', 'toys', 'otra cosa'],
      note: 'No me quedó claro si el tren es de Milán.',
    }),
    TEXT,
  )
  assert.deepEqual(understood?.family.kids, [{ name: 'Milán', age: 2 }])
  assert.deepEqual(understood?.unsure.sort(), ['kids.0', 'toys'])
  assert.equal(understood?.note, 'No me quedó claro si el tren es de Milán.')
})

test('a second pet is flagged, since the card shows one', () => {
  const understood = readUnderstanding(answer({ pets: [{ name: 'Inca' }, { name: 'Milán' }] }), TEXT)
  assert.deepEqual(understood?.unsure, ['pet'])
})

test('ages are whole years from 0 to 17, or nothing', () => {
  const ages = [2, '3', 2.7, -1, 30, 'dos', null].map(
    (age) => readUnderstanding(answer({ kids: [{ name: 'Milán', age }] }), TEXT)?.family.kids[0].age,
  )
  assert.deepEqual(ages, [2, 3, 2, null, null, null, null])
})

test('a fenced answer is read, and an answer with no JSON is not', () => {
  assert.equal(readUnderstanding('```json\n' + answer() + '\n```', TEXT)?.family.kids[0].name, 'Milán')
  assert.equal(readUnderstanding('No encontré ninguna familia.', TEXT), null)
})

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {ReturnType<typeof fakeLlm>} */
let llm = fakeLlm(answer())
before(async () => {
  api = await startApi({ signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com'], llm })
})
after(() => api.close())

/** @param {string | undefined} cookie @param {object} payload */
const understand = (cookie, payload) =>
  api.app.inject({ method: 'POST', url: '/family/understanding', headers: cookie ? { cookie } : {}, payload })

test('the endpoint sends the text to the model and returns the family, without saving it', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  const response = await understand(cookie, { text: TEXT })
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().family.kids[0].name, 'Milán')
  assert.deepEqual(response.json().unsure, [])

  const [call] = llm.calls
  assert.equal(call.user, TEXT)
  assert.match(call.system, /Solo extraés lo que el texto dice/)

  const saved = await api.app.inject({ method: 'GET', url: '/family', headers: { cookie } })
  assert.equal(saved.statusCode, 404, 'nothing is saved until the parent confirms')
  const { rows } = await api.pool.query('select count(*)::int as families from families')
  assert.equal(rows[0].families, 0)
})

test('the endpoint needs a session and some text', async () => {
  assert.equal((await understand(undefined, { text: TEXT })).statusCode, 401)
  const { cookie } = await signUpAs(api, 'beto@example.com')
  assert.equal((await understand(cookie, { text: '' })).statusCode, 400)
})

test('an answer with no family is a failure that keeps the text out of the reply', async () => {
  const other = await startApi({ signupEmails: ['dani@example.com'], llm: fakeLlm(`No sé. ${TEXT}`) })
  try {
    const { cookie } = await signUpAs(other, 'dani@example.com')
    const response = await other.app.inject({ method: 'POST', url: '/family/understanding', headers: { cookie }, payload: { text: TEXT } })
    assert.equal(response.statusCode, 500)
    assert.deepEqual(response.json(), { error: 'internal error' })
  } finally {
    await other.close()
  }
})

test('/me says whether a family can start from text, and without an LLM the endpoint refuses', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  const me = await api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })
  assert.equal(me.json().familyFromText, true)

  // The same database and session, with no LLM configured.
  const noLlm = buildApp({ config: api.config, db: api.db, logger: false, llm: null })
  try {
    const meWithout = await noLlm.inject({ method: 'GET', url: '/me', headers: { cookie } })
    assert.equal(meWithout.json().familyFromText, false)
    const refused = await noLlm.inject({ method: 'POST', url: '/family/understanding', headers: { cookie }, payload: { text: TEXT } })
    assert.equal(refused.statusCode, 503, 'a server with no LLM says the feature is off, not that it failed')
    assert.equal(refused.json().code, 'LLM_OFF')
  } finally {
    await noLlm.close()
  }
})
