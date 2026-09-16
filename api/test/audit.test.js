import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { buildApp } from '../src/app.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

const TEXT = 'Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota.'
const ANSWER = JSON.stringify({ kids: [{ name: 'Milán', ageMonths: 26 }], pets: [{ name: 'Inca' }], interests: [], toys: [], unsure: [], note: null })
const llm = {
  async *stream() {
    yield ANSWER
  },
}

const SPOKEN = 'Milán tiene un tren de madera que no suelta.'
const transcriber = {
  async transcribe() {
    return SPOKEN
  },
}

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({
    signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com', 'dani@example.com'],
    llm,
    transcriber,
    auditTranscripts: true,
  })
})
after(() => api.close())

/** @param {import('fastify').FastifyInstance} app @param {string} cookie */
const understand = (app, cookie) =>
  app.inject({ method: 'POST', url: '/family/understanding', headers: { cookie }, payload: { text: TEXT } })

/** @param {string} userId */
const rowsOf = async (userId) =>
  (await api.pool.query('select user_id, family_id, source, text, redacted_at from audit_transcripts where user_id = $1', [userId])).rows

test('with the audit on, the family text is kept as the parent sent it', async () => {
  const { id, cookie } = await signUpAs(api, 'ana@example.com')
  const response = await understand(api.app, cookie)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(await rowsOf(id), [{ user_id: id, family_id: null, source: 'family_text', text: TEXT, redacted_at: null }])
})

test("with the audit on, a voice note's transcription is kept too", async () => {
  const { id, cookie } = await signUpAs(api, 'dani@example.com')
  const response = await api.app.inject({
    method: 'POST',
    url: '/voice/transcribe',
    headers: { cookie, 'content-type': 'audio/webm;codecs=opus' },
    payload: Buffer.alloc(4096, 7),
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(await rowsOf(id), [{ user_id: id, family_id: null, source: 'voice_note', text: SPOKEN, redacted_at: null }])
})

test('once the adult has a family, the row names it, and deleting the family deletes the rows', async () => {
  const { id, cookie } = await signUpAs(api, 'beto@example.com')
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  await understand(api.app, cookie)
  const [row] = await rowsOf(id)
  assert.equal(row.family_id, family.id)

  await api.pool.query('delete from families where id = $1', [family.id])
  assert.deepEqual(await rowsOf(id), [])
})

test('with the audit off, nothing is kept', async () => {
  const { id, cookie } = await signUpAs(api, 'carla@example.com')
  // The same database and session, with AUDIT_TRANSCRIPTS off.
  const off = buildApp({ config: { ...api.config, audit: { transcripts: false } }, db: api.db, logger: false, llm })
  try {
    assert.equal((await understand(off, cookie)).statusCode, 200)
    assert.deepEqual(await rowsOf(id), [])
  } finally {
    await off.close()
  }

  // Deleting the account deletes its rows too.
  await understand(api.app, cookie)
  assert.equal((await rowsOf(id)).length, 1)
  await api.pool.query('delete from users where id = $1', [id])
  assert.deepEqual(await rowsOf(id), [])
})
