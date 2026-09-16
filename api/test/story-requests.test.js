import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { seededRandom } from '../src/catalog/slots.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi, streamEvents } from './helpers.js'

/** The words of a voice note asking for a story, as the transcript wrote them. */
const NOTE = 'Quiero un cuento donde Milan y el tren grandote ayudan a un dragón que le tiene miedo a la oscuridad.'

/** What the model reads from the note: a misspelled kid, and a character that isn't the family's. */
const READ = {
  summary: 'Milán y el tren grandote ayudan a un dragón miedoso.',
  family: ['Milan', 'el tren grandote'],
  characters: ['un dragón que le tiene miedo a la oscuridad'],
  setting: null,
  theme: 'la valentía',
  plot: 'El dragón no se anima a salir de noche y Milán lo acompaña con el tren.',
}

const STORY = `TÍTULO: Milán y el dragón miedoso.
PARTE 1
Milán encontró un dragón en la plaza.

PARTE 2
El dragón tenía miedo de la noche.

PARTE 3
Subieron al tren grandote y miraron la luna juntos.`

/**
 * A model that answers the request call with JSON and the story call with a
 * story, and remembers every call with its data.
 * @param {() => string} [readAnswer]
 */
const fakeLlm = (readAnswer = () => JSON.stringify(READ)) => {
  /** @type {{ system: string, user: string, data?: string }[]} */
  const calls = []
  return {
    calls,
    /** @param {{ system: string, user: string, data?: string }} call */
    async *stream({ system, user, data }) {
      calls.push({ system, user, data })
      const text = user.includes('Sacá el pedido de cuento') ? readAnswer() : STORY
      for (let i = 0; i < text.length; i += 5) yield text.slice(i, i + 5)
    },
  }
}

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
let llm = fakeLlm()
const emails = Array.from({ length: 12 }, (_, i) => `pedido-${i}@example.com`)
let emailCount = 0
const signUp = () => signUpAs(api, emails[emailCount++])

before(async () => {
  llm = fakeLlm()
  // After 19:00 in Buenos Aires the stories are bedtime ones.
  api = await startApi({ signupEmails: emails, now: () => new Date('2026-09-14T21:00:00-03:00'), random: seededRandom('pedido'), llm })
})
after(() => api.close())

/** @param {string} cookie @param {string} text @param {Awaited<ReturnType<typeof startApi>>} [target] */
const understand = (cookie, text, target = api) =>
  target.app.inject({ method: 'POST', url: '/stories/understanding', headers: { cookie }, payload: { text } })

/** @param {string} cookie @param {object} request @param {Awaited<ReturnType<typeof startApi>>} [target] */
const write = (cookie, request, target = api) =>
  target.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { request } })

test('a voice note reads into a request with the family’s own spelling, and nothing is saved', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()

  const response = await understand(cookie, NOTE)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { ...READ, family: ['Milán', 'el tren grandote'] })

  // The note is data, and the model gets the whole family's names to spell by.
  const call = llm.calls.at(-1)
  assert.equal(call?.data, NOTE)
  assert.doesNotMatch(call?.user ?? '', /dragón/)
  assert.match(call?.user ?? '', /Los chicos: Milán/)
  assert.match(call?.user ?? '', /Los juguetes: el dinosaurio chiquito, el tren grandote/)

  const { rows } = await api.pool.query('select count(*)::int as n from stories where family_id = $1', [family.id])
  assert.equal(rows[0].n, 0)
})

test('the story asked for is written from the request, as data, and saved like any story', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const request = (await understand(cookie, NOTE)).json()

  const response = await write(cookie, request)
  assert.equal(response.statusCode, 200)
  const events = streamEvents(response.body.toString())
  assert.deepEqual(events[0], { type: 'title', title: 'Milán y el dragón miedoso.' })
  const final = events.at(-1)
  assert.equal(final.type, 'story')
  assert.equal(final.story.teaser, READ.summary)
  assert.equal(final.story.keyword, null)
  assert.equal(final.story.parts.length, 3)
  // Milán is two and two months: the band's longest story.
  assert.equal(final.story.minutes, 4)

  const call = llm.calls.at(-1)
  assert.match(call?.system ?? '', /DE DOS A DOS AÑOS Y MEDIO/)
  assert.match(call?.system ?? '', /TRANQUI, antes de dormir/)
  assert.match(call?.user ?? '', /Escribí el cuento que esta familia pidió/)
  assert.match(call?.user ?? '', /Protagonista: Milán\. También aparecen: el tren grandote\. Tema: la valentía\./)
  // What the parent asked for travels only in the data block.
  assert.doesNotMatch(call?.user ?? '', /dragón/)
  assert.match(call?.data ?? '', /Otros personajes: un dragón que le tiene miedo a la oscuridad/)
  assert.match(call?.data ?? '', /Qué pasa: El dragón no se anima/)

  const { rows } = await api.pool.query('select casting, kid_ids from stories where family_id = $1', [family.id])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].casting.kind, 'request')
  assert.equal(rows[0].casting.toy.name, 'el tren grandote')

  const audit = await api.pool.query('select event, casting from story_audit where family_id = $1 order by event', [family.id])
  assert.deepEqual(audit.rows.map((row) => row.event), ['picked', 'written'])
  for (const row of audit.rows) assert.equal(row.casting.kind, 'request')

  // It reads again by its own id, and it can become a series like any story.
  const again = await api.app.inject({ method: 'GET', url: `/stories/${final.story.id}`, headers: { cookie } })
  assert.equal(again.json().title, 'Milán y el dragón miedoso.')
  const series = await api.app.inject({ method: 'POST', url: `/stories/${final.story.id}/series`, headers: { cookie } })
  assert.equal(series.statusCode, 201)
  assert.equal(series.json().storyline, READ.summary)
})

test('a request sent back with names that aren’t the family’s writes them as characters', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const response = await write(cookie, { ...READ, family: ['Inca', 'el perro del vecino'], characters: [] })
  assert.equal(response.statusCode, 200)
  const call = llm.calls.at(-1)
  assert.match(call?.user ?? '', /Protagonista: Inca\./)
  assert.match(call?.data ?? '', /De la familia: Inca\nOtros personajes: el perro del vecino/)
})

test('a request for a kid who is sitting out is written for that kid', async () => {
  const { cookie } = await signUp()
  const profile = (
    await putFamily(api, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 26 },
        { name: 'Sofi', ageMonths: 52 },
      ],
    })
  ).json()
  const [milan, sofi] = profile.kids
  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [milan.id] } })

  const final = streamEvents((await write(cookie, { ...READ, family: ['Sofi'] })).body.toString()).at(-1)
  // Sofi is four: her band, not Milán's.
  assert.match(llm.calls.at(-1)?.system ?? '', /CUATRO AÑOS/)
  const { rows } = await api.pool.query('select kid_ids from stories where id = $1', [final.story.id])
  assert.deepEqual(rows[0].kid_ids, [sofi.id])
})

test('a request that names no kid is for the kids playing', async () => {
  const { cookie } = await signUp()
  const profile = (
    await putFamily(api, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 26 },
        { name: 'Sofi', ageMonths: 52 },
      ],
    })
  ).json()
  const [, sofi] = profile.kids
  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [sofi.id] } })

  const final = streamEvents((await write(cookie, { ...READ, family: [] })).body.toString()).at(-1)
  assert.match(llm.calls.at(-1)?.user ?? '', /Protagonista: un dragón que le tiene miedo a la oscuridad\. También aparecen: Sofi\./)
  const { rows } = await api.pool.query('select kid_ids from stories where id = $1', [final.story.id])
  assert.deepEqual(rows[0].kid_ids, [sofi.id])
})

test('words that ask for no story come back empty, and an empty request writes nothing', async () => {
  const quiet = fakeLlm(() => JSON.stringify({ summary: '', family: [], characters: [], setting: null, theme: null, plot: null }))
  const api2 = await startApi({ signupEmails: ['nada@example.com'], llm: quiet })
  const { cookie } = await signUpAs(api2, 'nada@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const heard = await understand(cookie, 'Hola, ¿se escucha?', api2)
  assert.equal(heard.statusCode, 200)
  assert.deepEqual(heard.json(), { summary: '', family: [], characters: [], setting: null, theme: null, plot: null })

  const response = await write(cookie, heard.json(), api2)
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'EMPTY_REQUEST')
  await api2.close()
})

test('a model that answers with no JSON is a failure, never the parent’s words', async () => {
  const chatty = fakeLlm(() => `No entendí: ${NOTE}`)
  const api2 = await startApi({ signupEmails: ['charla@example.com'], llm: chatty })
  const { cookie } = await signUpAs(api2, 'charla@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await understand(cookie, NOTE, api2)
  assert.equal(response.statusCode, 500)
  assert.doesNotMatch(response.body, /dragón/)
  await api2.close()
})

test('without an LLM, reading and writing a request say the feature is off', async () => {
  const api2 = await startApi({ signupEmails: ['sin@example.com'] })
  const { cookie } = await signUpAs(api2, 'sin@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const heard = await understand(cookie, NOTE, api2)
  assert.equal(heard.statusCode, 503)
  assert.equal(heard.json().code, 'LLM_OFF')
  const written = await write(cookie, READ, api2)
  assert.equal(written.statusCode, 503)
  assert.equal(written.json().code, 'LLM_OFF')
  await api2.close()
})

test('both need a family, and refuse what isn’t a request', async () => {
  const { cookie } = await signUp()
  assert.equal((await understand(cookie, NOTE)).statusCode, 409)
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  assert.equal((await understand(cookie, '')).statusCode, 400)
  assert.equal((await write(cookie, { ...READ, plot: 'x'.repeat(501) })).statusCode, 400)
  const both = await api.app.inject({
    method: 'POST',
    url: '/stories/write',
    headers: { cookie },
    payload: { keyword: 'los caballos', request: READ },
  })
  assert.equal(both.statusCode, 400)
  const anonymous = await api.app.inject({ method: 'POST', url: '/stories/understanding', payload: { text: NOTE } })
  assert.equal(anonymous.statusCode, 401)
})
