import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createFamiliesService } from '../src/families/families.service.js'
import { createStoriesService } from '../src/stories/stories.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** A model that answers by hand, one chunk at a time, and remembers every call. @param {(call: { call: number, user: string }) => string | Promise<string>} respond */
const fakeLlm = (respond) => {
  /** @type {{ call: number, user: string }[]} */
  const prompts = []
  return {
    prompts,
    async *stream({ user }) {
      const call = prompts.length + 1
      prompts.push({ call, user })
      const text = await respond({ call, user })
      for (let i = 0; i < text.length; i += 3) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        yield text.slice(i, i + 3)
      }
    },
  }
}

const OPTIONS_JSON = (suffix) =>
  JSON.stringify({
    tramas: [
      { title: `Milán y el turno de la mañana ${suffix}`, teaser: 'Inca despierta a todo.', minutes: 4, premise: 'Milán e Inca salen a la plaza y vuelven a tiempo.' },
      { title: `El tren grandote ${suffix}`, teaser: 'Un paseo por todas las habitaciones.', minutes: 3, premise: 'El tren recorre la casa y conoce cada rincón.' },
      { title: `El caballo percherón ${suffix}`, teaser: 'Un amigo nuevo en el corral.', minutes: 5, premise: 'Un caballo nuevo llega y nadie duerme.' },
    ],
  })

const STORY = `PARTE 1
Milán se despertó de golpe.

Inca movió la cola y llamó a la puerta.

PARTE 2
Salieron a la plaza con el tren grandote.

Encontraron un caballo percherón.

PARTE 3
Volvieron cansados y felices.

El tren se durmió en el rincón.

Inca se durmió al lado.`

/** @param {string} body the event-stream body as the route wrote it */
const events = (body) =>
  body
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const line = block.split('\n').find((line) => line.startsWith('data: '))
      return JSON.parse(line.slice('data: '.length))
    })

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
let llm
/** Each family in this file signs up with its own email. */
const emails = Array.from({ length: 20 }, (_, i) => `llm-${i}@example.com`)
let emailCount = 0
const signUp = () => signUpAs(api, emails[emailCount++])
before(async () => {
  llm = fakeLlm(({ call, user }) =>
  // The options call asks for JSON; the story call asks for PARTE 1.
  user.includes('Contestá solo con un objeto JSON') ? (call === 1 ? OPTIONS_JSON('primera') : OPTIONS_JSON('otra')) : STORY,
)
  // After 19:00 in Buenos Aires the stories are bedtime ones: TRANQUI.
  api = await startApi({
    signupEmails: emails,
    now: () => new Date('2026-09-14T21:00:00-03:00'),
    llm,
  })
  const stories = createStoriesService({ db: api.db, families: createFamiliesService({ db: api.db }) })
  await stories.addTemplate({
    slug: 'para-streaming',
    title: '{toy} y el tercero.',
    teaser: 'Con {kid}.',
    minutes: 3,
    mood: 'lively',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [['Había una vez {toy}.', '{kid} lo vio.'], ['Fin.']],
  })
})
after(() => api.close())

/** @param {string} cookie @param {string[]} [exclude] @param {Awaited<ReturnType<typeof startApi>>} [target] */
const options = (cookie, exclude = [], target = api) =>
  target.app.inject({
    method: 'GET',
    url: `/stories/options${exclude.length ? `?${exclude.map((id) => `exclude=${id}`).join('&')}` : ''}`,
    headers: { cookie },
  })

/** @param {string} cookie @param {string} id */
const stream = (cookie, id) => api.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { id } })

test('with the LLM, options are plot options written for the family and saved', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const response = await options(cookie)
  assert.equal(response.statusCode, 200)
  const list = response.json()
  assert.equal(list.length, 3)
  for (const option of list) assert.match(option.id, /^[0-9a-f-]{36}$/)
  assert.equal(list[0].title, 'Milán y el turno de la mañana primera')
  assert.equal(list[0].minutes, 4)

  const { rows } = await api.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 3)
})

test('the options ask for a bedtime story at night, and its history reaches the model', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  await options(cookie)

  assert.match(llm.prompts[0].user, /La familia va a leer un cuento a TRANQUI, antes de dormir/)
  assert.match(llm.prompts[0].user, /Milán, de 2 años/)
  assert.match(llm.prompts[0].user, /La mascota: Inca/)
})

test('asking for other options retires the older plots and keeps the ones on screen', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()

  const first = (await options(cookie)).json()
  const second = (await options(cookie, first.map((option) => option.id))).json()
  const third = (await options(cookie, second.map((option) => option.id))).json()
  assert.equal(second.length, 3)
  assert.equal(third.length, 3)

  const { rows } = await api.pool.query('select id from story_plots where family_id = $1', [family.id])
  const alive = new Set(rows.map((row) => row.id))
  assert.equal(rows.length, 6, 'the screen being chosen from, plus three fresh ones')
  assert.ok(second.every((option) => alive.has(option.id)), 'the plots on screen stay pickable')
  assert.ok(!first.some((option) => alive.has(option.id)), 'the screen nobody can see any more is gone')
})

test('a malformed answer from the model is tried once more', async () => {
  llm = fakeLlm(({ call }) => (call === 1 ? 'eso no es json' : OPTIONS_JSON('de nuevo')))
  const api2 = await startApi({ signupEmails: ['carla@example.com'], now: () => new Date('2026-09-14T10:00:00-03:00'), llm })
  const { cookie } = await signUpAs(api2, 'carla@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await options(cookie, [], api2)
  assert.equal(response.statusCode, 200)
  assert.equal(response.json()[0].title, 'Milán y el turno de la mañana de nuevo')
  assert.equal(llm.prompts.length, 2)
  await api2.close()
})

test('the moment is Buenos Aires time, whatever the server clock says', async () => {
  const dayLlm = fakeLlm(() => OPTIONS_JSON('de tarde'))
  // 20:00 UTC is 17:00 in Buenos Aires: still daytime.
  const api2 = await startApi({ signupEmails: ['eli@example.com'], now: () => new Date('2026-09-14T20:00:00Z'), llm: dayLlm })
  const { cookie } = await signUpAs(api2, 'eli@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  await options(cookie, [], api2)
  assert.match(dayLlm.prompts[0].user, /CON PILAS, de día/)
  await api2.close()
})

test('an answer whose options all lack a field is tried once more, and only three options are kept', async () => {
  const incomplete = JSON.stringify({ tramas: [{ title: 'Sin premisa', teaser: 'Nada más.', minutes: 3 }] })
  const five = JSON.stringify({
    tramas: [1, 2, 3, 4, 5].map((n) => ({ title: `Trama ${n}`, teaser: 'Un paseo.', minutes: 3, premise: 'Salen a la plaza.' })),
  })
  const sloppyLlm = fakeLlm(({ call }) => (call === 1 ? incomplete : five))
  const api2 = await startApi({ signupEmails: ['fede@example.com'], now: () => new Date('2026-09-14T10:00:00-03:00'), llm: sloppyLlm })
  const { cookie } = await signUpAs(api2, 'fede@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await options(cookie, [], api2)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(
    response.json().map((option) => option.title),
    ['Trama 1', 'Trama 2', 'Trama 3'],
  )
  assert.equal(sloppyLlm.prompts.length, 2)
  const { rows } = await api2.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 3)
  await api2.close()
})

// A handler stuck writing to a reader who left would hang the run instead of failing it.
test('a reader who leaves mid-story stops the story, and nothing is saved', { timeout: 10_000 }, async () => {
  /** @type {() => void} */
  let release = () => {}
  const readerLeft = new Promise((resolve) => (release = () => resolve(undefined)))
  /** @type {() => void} */
  let stopped = () => {}
  const modelStopped = new Promise((resolve) => (stopped = () => resolve(undefined)))
  // Holds the rest of the story until the reader has left.
  const slowLlm = {
    async *stream({ user }) {
      if (user.includes('Contestá solo con un objeto JSON')) {
        yield OPTIONS_JSON('lenta')
        return
      }
      try {
        yield 'PARTE 1\nMilán se despertó de golpe.\n\n'
        await readerLeft
        yield 'Inca movió la cola.\n\nPARTE 2\nFin.\n'
      } finally {
        stopped()
      }
    },
  }
  const api2 = await startApi({ signupEmails: ['gabi@example.com'], now: () => new Date('2026-09-14T10:00:00-03:00'), llm: slowLlm })
  const { cookie } = await signUpAs(api2, 'gabi@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)
  const [option] = (await options(cookie, [], api2)).json()

  // A real connection, so the reader can hang up.
  const address = await api2.app.listen({ port: 0, host: '127.0.0.1' })
  const reader = new AbortController()
  const response = await fetch(`${address}/stories/write`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: option.id }),
    signal: reader.signal,
  })
  const { value } = await response.body.getReader().read()
  assert.match(new TextDecoder().decode(value), /Milán se despertó de golpe/)
  reader.abort()
  await new Promise((resolve) => setTimeout(resolve, 100))
  release()
  await modelStopped
  await new Promise((resolve) => setTimeout(resolve, 100))

  const { rows } = await api2.pool.query('select count(*)::int as n from stories where plot_id = $1', [option.id])
  assert.equal(rows[0].n, 0)
  await api2.close()
})

test('when the model will not answer, the family hears about it, not a template', async () => {
  const deadLlm = fakeLlm(() => '')
  const api2 = await startApi({ signupEmails: ['dani@example.com'], now: () => new Date('2026-09-14T10:00:00-03:00'), llm: deadLlm })
  const { cookie } = await signUpAs(api2, 'dani@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await options(cookie, [], api2)
  assert.equal(response.statusCode, 500)
  const { rows } = await api2.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 0)
  await api2.close()
})

test('the chosen plot streams paragraph by paragraph and then saves the story', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const [option] = (await options(cookie)).json()

  const response = await stream(cookie, option.id)
  assert.equal(response.statusCode, 200)
  assert.match(response.headers['content-type'], /text\/event-stream/)
  const list = events(response.body.toString())
  const paragraphs = list.filter((event) => event.type === 'paragraph')
  const final = list.find((event) => event.type === 'story')

  assert.equal(list.length, 1 + 7)
  assert.deepEqual(paragraphs.map((event) => event.part), [1, 1, 2, 2, 3, 3, 3])
  assert.equal(paragraphs[0].text, 'Milán se despertó de golpe.')
  assert.equal(final.type, 'story')
  assert.equal(final.story.title, option.title)
  assert.equal(final.story.teaser, option.teaser)
  assert.equal(final.story.minutes, option.minutes)
  assert.equal(final.story.plotId, option.id)
  assert.equal(final.story.parts.length, 3)
  assert.equal(final.story.parts[1].length, 2)

  const { rows } = await api.pool.query('select source from stories where plot_id = $1', [option.id])
  assert.deepEqual(rows, [{ source: 'generated' }])
})

test('reading the same plot again replays the saved story, without the model', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const [option] = (await options(cookie)).json()
  const first = events((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story')
  const before = llm.prompts.length

  const again = events((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story')
  assert.equal(again.story.id, first.story.id)
  assert.equal(llm.prompts.length, before, 'the model was not asked again')
})

test('a catalog story streams through the same route', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const { rows } = await api.pool.query(`select id from story_templates where slug = 'para-streaming'`)
  const templateId = rows[0].id

  const list = events((await stream(cookie, templateId)).body.toString())
  const final = list.find((event) => event.type === 'story')
  assert.equal(final.story.templateId, templateId)
  assert.match(final.story.parts[0][0], /^Había una vez .+\.$/, 'the toy slot is filled')
  assert.doesNotMatch(JSON.stringify(final.story.parts), /\{[a-z]+\}/, 'no unfilled slots')
  assert.equal(final.story.parts[1][0], 'Fin.')
})

test('an id nobody picked answers with a clean 404', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const response = await stream(cookie, randomUUID())
  assert.equal(response.statusCode, 404)
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
})

test('the library lists the family stories, newest first, and opens one', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const [option] = (await options(cookie)).json()
  const story = events((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story').story

  const list = await api.app.inject({ method: 'GET', url: '/stories', headers: { cookie } })
  assert.equal(list.statusCode, 200)
  const saved = list.json()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, story.id)
  assert.equal(saved[0].title, story.title)
  assert.ok(saved[0].createdAt)

  const one = await api.app.inject({ method: 'GET', url: `/stories/${story.id}`, headers: { cookie } })
  assert.equal(one.statusCode, 200)
  const open = one.json()
  assert.equal(open.title, story.title)
  assert.deepEqual(open.parts, story.parts)
})

test('plots are for the kids playing, and their story stars and records those kids', async () => {
  const kidsLlm = fakeLlm(({ user }) => (user.includes('Contestá solo con un objeto JSON') ? OPTIONS_JSON('de a uno') : STORY))
  const api2 = await startApi({ signupEmails: ['hana@example.com'], now: () => new Date('2026-09-14T10:00:00-03:00'), llm: kidsLlm })
  const { cookie } = await signUpAs(api2, 'hana@example.com')
  const profile = (
    await putFamily(api2, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', age: 1 },
        { name: 'Sofi', age: 4 },
      ],
    })
  ).json()
  const [milan, sofi] = profile.kids
  /** @param {string[]} kids */
  const choosePlaying = (kids) =>
    api2.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids } })

  await choosePlaying([sofi.id])
  const [option] = (await options(cookie, [], api2)).json()
  assert.match(kidsLlm.prompts[0].user, /Los chicos: Sofi, de 4 años\./)

  // Milán joining after the plot was proposed doesn't change who its story is for.
  await choosePlaying([milan.id, sofi.id])
  const response = await api2.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { id: option.id } })
  assert.ok(events(response.body.toString()).some((event) => event.type === 'story'))
  assert.match(kidsLlm.prompts[1].user, /Los chicos: Sofi, de 4 años\./)
  const { rows } = await api2.pool.query('select kid_ids::text[] as kids from stories where plot_id = $1', [option.id])
  assert.deepEqual(rows[0].kids, [sofi.id])
  await api2.close()
})

test('a family can only open its own stories', async () => {
  const { cookie: familyA } = await signUp()
  await putFamily(api, familyA, EXAMPLE_PROFILE)
  const [option] = (await options(familyA)).json()
  const story = events((await stream(familyA, option.id)).body.toString()).find((event) => event.type === 'story').story

  const { cookie: familyB } = await signUp()
  await putFamily(api, familyB, EXAMPLE_PROFILE)
  const response = await api.app.inject({ method: 'GET', url: `/stories/${story.id}`, headers: { cookie: familyB } })
  assert.equal(response.statusCode, 404)
})