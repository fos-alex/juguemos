import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createCatalogService } from '../src/catalog/catalog.service.js'
import { seededRandom } from '../src/catalog/slots.js'
import { EXAMPLE_PROFILE, optionsFrom, putFamily, signUpAs, startApi, streamEvents } from './helpers.js'

/** A model that answers by hand, one chunk at a time, and remembers every call. @param {(call: { call: number, user: string }) => string | Promise<string>} respond */
const fakeLlm = (respond) => {
  /** @type {{ call: number, system: string, user: string, maxTokens?: number }[]} */
  const prompts = []
  return {
    prompts,
    async *stream({ system, user, maxTokens }) {
      const call = prompts.length + 1
      prompts.push({ call, system, user, maxTokens })
      const text = await respond({ call, user })
      for (let i = 0; i < text.length; i += 3) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        yield text.slice(i, i + 3)
      }
    },
  }
}

/** One plot, as the model writes it inside the answer's array. */
const plot = (n) => ({
  title: `Trama ${n}`,
  teaser: `La número ${n}.`,
  minutes: 4,
  premise: 'Salen a la plaza con el tren grandote. Vuelven a tiempo para la merienda.',
})

/** The whole options answer: one call, three plots, in the castings' order. */
const PLOTS = (...plots) => JSON.stringify({ tramas: plots.length > 0 ? plots : [plot(1), plot(2), plot(3)] })

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

/** The keyword story the model answers with: its own title line, then the same parts. */
const TITLED_STORY = `TÍTULO: Milán y los dinosaurios.
${STORY}`

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
let llm
/** Each family in this file signs up with its own email. */
const emails = Array.from({ length: 20 }, (_, i) => `llm-${i}@example.com`)
let emailCount = 0
const signUp = () => signUpAs(api, emails[emailCount++])
before(async () => {
  // The options call asks for JSON; the story call asks for PARTE 1.
  llm = fakeLlm(({ user }) =>
    user.includes('Contestá solo con un objeto JSON') ? PLOTS() : user.includes('TÍTULO:') ? TITLED_STORY : STORY,
  )
  // After 19:00 in Buenos Aires the stories are bedtime ones: TRANQUI. The
  // seeded random makes the casting draw the same on every run.
  api = await startApi({
    signupEmails: emails,
    now: () => new Date('2026-09-14T21:00:00-03:00'),
    random: seededRandom('cuentos'),
    llm,
  })
  await createCatalogService({ db: api.db }).addStoryTemplate({
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
const optionsResponse = (cookie, exclude = [], target = api) =>
  target.app.inject({
    method: 'GET',
    url: `/stories/options${exclude.length ? `?${exclude.map((id) => `exclude=${id}`).join('&')}` : ''}`,
    headers: { cookie },
  })

/** The options an options screen sent. @param {string} cookie @param {string[]} [exclude] @param {Awaited<ReturnType<typeof startApi>>} [target] */
const options = async (cookie, exclude = [], target = api) => optionsFrom(await optionsResponse(cookie, exclude, target))

/** @param {string} cookie @param {string} id */
const stream = (cookie, id) => api.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { id } })

/** @param {string} cookie @param {string} keyword @param {Awaited<ReturnType<typeof startApi>>} [target] */
const streamKeyword = (cookie, keyword, target = api) =>
  target.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { keyword } })

test('with the LLM, options are plot options written for the family and saved', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const response = await optionsResponse(cookie)
  assert.equal(response.statusCode, 200)
  assert.match(String(response.headers['content-type']), /text\/event-stream/)
  const events = streamEvents(response.body.toString())
  assert.deepEqual(events.map((event) => event.type), ['option', 'option', 'option', 'done'])
  const list = events.filter((event) => event.type === 'option').map((event) => event.option)
  assert.equal(list.length, 3)
  for (const option of list) assert.match(option.id, /^[0-9a-f-]{36}$/)
  assert.deepEqual(list.map((option) => option.title), ['Trama 1', 'Trama 2', 'Trama 3'])
  // Milán is two years and two months, so his band runs three to four minutes.
  assert.equal(list[0].minutes, 4)

  const { rows } = await api.pool.query('select casting from story_plots')
  assert.equal(rows.length, 3)
  for (const row of rows) {
    assert.ok(row.casting.lead.name, 'every plot keeps the casting it was drawn for')
    assert.ok(row.casting.draws.anchorIn >= 0)
    assert.equal(row.casting.weights.anchorIn, 0.85)
  }
})

test('the options ask for a bedtime story at night, and its history reaches the model', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  await options(cookie)

  const { user } = llm.prompts.at(-1)
  assert.match(user, /La familia va a leer un cuento a TRANQUI, antes de dormir/)
  assert.match(user, /Milán, de 2 años y 2 meses/)
  assert.match(user, /El reparto de cada trama/)
  assert.match(user, /Trama 3: /)
})

test('the system prompt carries one band and one moment, and nothing else', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  await options(cookie)

  const { system, user, maxTokens } = llm.prompts.at(-1)
  assert.match(system, /Sos el narrador de cuentos de Ludi/)
  assert.match(system, /Cómo se escribe para este chico: DE DOS A DOS AÑOS Y MEDIO/)
  assert.match(system, /El momento: TRANQUI, antes de dormir/)
  assert.doesNotMatch(system, /UN AÑO|TRES AÑOS|CUATRO AÑOS|CINCO AÑOS/)
  assert.doesNotMatch(system, /CON PILAS/)
  assert.equal(maxTokens, 1200, 'three short plots in one answer')
  // One call carries the three castings, numbered in the order they come back.
  assert.match(user, /Trama 1: Protagonista: /)
  assert.match(user, /Trama 2: Protagonista: |Trama 2: Reparto libre: /)
  assert.match(user, /Trama 3: Protagonista: |Trama 3: Reparto libre: /)
})

test('asking for other options retires the older plots and keeps the ones on screen', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()

  const first = await options(cookie)
  const second = await options(cookie, first.map((option) => option.id))
  const third = await options(cookie, second.map((option) => option.id))
  assert.equal(second.length, 3)
  assert.equal(third.length, 3)

  const { rows } = await api.pool.query('select id from story_plots where family_id = $1', [family.id])
  const alive = new Set(rows.map((row) => row.id))
  assert.equal(rows.length, 6, 'the screen being chosen from, plus three fresh ones')
  assert.ok(second.every((option) => alive.has(option.id)), 'the plots on screen stay pickable')
  assert.ok(!first.some((option) => alive.has(option.id)), 'the screen nobody can see any more is gone')
})

test('an answer with no readable plot is asked once more', async () => {
  // The first answer is prose, the second is an array of plots with no
  // premise, and only the third try lands.
  const noPremise = JSON.stringify({ tramas: [{ title: 'Sin premisa', teaser: 'Nada más.', minutes: 3 }] })
  const retryLlm = fakeLlm(({ call }) => (call === 1 ? 'eso no es json' : call === 2 ? noPremise : PLOTS()))
  const api2 = await startApi({
    signupEmails: ['carla@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('carla'),
    llm: retryLlm,
  })
  const { cookie } = await signUpAs(api2, 'carla@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  // Two tries in one screen, so the second screen is where the plots land.
  const first = await optionsResponse(cookie, [], api2)
  assert.equal(first.statusCode, 500, 'two unreadable answers are a failure')
  assert.equal(retryLlm.prompts.length, 2, 'the whole answer is asked once more, not each option')

  const list = await options(cookie, [], api2)
  assert.deepEqual(list.map((option) => option.title), ['Trama 1', 'Trama 2', 'Trama 3'])
  const { rows } = await api2.pool.query(`select count(*)::int as n from story_audit where event = 'offered'`)
  assert.equal(rows[0].n, 3)
  await api2.close()
})

test('an answer that lands on the second try is offered as it streams', async () => {
  const secondTry = fakeLlm(({ call }) => (call === 1 ? 'eso no es json' : PLOTS()))
  const api2 = await startApi({
    signupEmails: ['nico@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('nico'),
    llm: secondTry,
  })
  const { cookie } = await signUpAs(api2, 'nico@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const list = await options(cookie, [], api2)
  assert.deepEqual(list.map((option) => option.title), ['Trama 1', 'Trama 2', 'Trama 3'])
  assert.equal(secondTry.prompts.length, 2)
  await api2.close()
})

test('the options that did arrive are kept when the answer stops early', async () => {
  // The model writes two plots and then stops mid-object.
  const cut = `{"tramas": [${JSON.stringify(plot(1))}, ${JSON.stringify(plot(2))}, {"title": "La tercera`
  const cutLlm = fakeLlm(() => cut)
  const api2 = await startApi({
    signupEmails: ['pia@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('pia'),
    llm: cutLlm,
  })
  const { cookie } = await signUpAs(api2, 'pia@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await optionsResponse(cookie, [], api2)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(
    streamEvents(response.body.toString()).map((event) => event.type),
    ['option', 'option', 'done'],
  )
  assert.equal(cutLlm.prompts.length, 1, 'an answer with plots in it is not asked again')
  const { rows } = await api2.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 2)
  await api2.close()
})

test('the moment is Buenos Aires time, whatever the server clock says', async () => {
  const dayLlm = fakeLlm(() => PLOTS())
  // 20:00 UTC is 17:00 in Buenos Aires: still daytime.
  const api2 = await startApi({
    signupEmails: ['eli@example.com'],
    now: () => new Date('2026-09-14T20:00:00Z'),
    random: seededRandom('eli'),
    llm: dayLlm,
  })
  const { cookie } = await signUpAs(api2, 'eli@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  await options(cookie, [], api2)
  assert.match(dayLlm.prompts[0].user, /CON PILAS, de día/)
  assert.match(dayLlm.prompts[0].system, /El momento: CON PILAS, de día/)
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
        yield PLOTS()
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
  const api2 = await startApi({
    signupEmails: ['gabi@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('gabi'),
    llm: slowLlm,
  })
  const { cookie } = await signUpAs(api2, 'gabi@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)
  const [option] = await options(cookie, [], api2)

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

// The web's development mode stops its first request at once (JUG-142).
test('a reader who leaves before the first option stops the model, and nothing is saved', { timeout: 10_000 }, async () => {
  /** @type {() => void} */
  let sawAbort = () => {}
  const modelStopped = new Promise((resolve) => (sawAbort = () => resolve(undefined)))
  // Answers nothing until the reader has gone, like a model still thinking.
  const waitingLlm = {
    /** @param {{ signal: AbortSignal }} call */
    async *stream({ signal }) {
      await new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            sawAbort()
            reject(new DOMException('This operation was aborted', 'AbortError'))
          },
          { once: true },
        )
      })
    },
  }
  const api2 = await startApi({
    signupEmails: ['hugo@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('hugo'),
    llm: waitingLlm,
  })
  const { cookie } = await signUpAs(api2, 'hugo@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  // A real connection, so the reader can hang up before any option exists.
  const address = await api2.app.listen({ port: 0, host: '127.0.0.1' })
  const reader = new AbortController()
  const asked = fetch(`${address}/stories/options`, { headers: { cookie }, signal: reader.signal })
  await new Promise((resolve) => setTimeout(resolve, 100))
  reader.abort()
  await assert.rejects(asked)
  await modelStopped
  await new Promise((resolve) => setTimeout(resolve, 100))

  const { rows } = await api2.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 0)
  await api2.close()
})

test('when the model will not answer, the family hears about it, not a template', async () => {
  const deadLlm = fakeLlm(() => '')
  const api2 = await startApi({
    signupEmails: ['dani@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('dani'),
    llm: deadLlm,
  })
  const { cookie } = await signUpAs(api2, 'dani@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await optionsResponse(cookie, [], api2)
  assert.equal(response.statusCode, 500)
  assert.equal(String(response.headers['content-type']), 'application/json; charset=utf-8')
  assert.equal(deadLlm.prompts.length, 2, 'the one call, asked once more')
  const { rows } = await api2.pool.query('select count(*)::int as n from story_plots')
  assert.equal(rows[0].n, 0)
  const audit = await api2.pool.query('select count(*)::int as n from story_audit')
  assert.equal(audit.rows[0].n, 0)
  await api2.close()
})

test('the chosen plot streams paragraph by paragraph and then saves the story', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const [option] = await options(cookie)

  const response = await stream(cookie, option.id)
  assert.equal(response.statusCode, 200)
  assert.match(response.headers['content-type'], /text\/event-stream/)
  const list = streamEvents(response.body.toString())
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

  const { rows } = await api.pool.query('select source, casting from stories where plot_id = $1', [option.id])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].source, 'generated')
  assert.ok(rows[0].casting.lead.name, 'the story keeps the casting it was written for')
  // The story call repeats the casting and gets the band's word budget.
  const story = llm.prompts.at(-1)
  assert.match(story.user, /El reparto de este cuento:/)
  assert.match(story.system, /Cómo se escribe para este chico: DE DOS A DOS AÑOS Y MEDIO/)
  assert.equal(story.maxTokens, 480 * 3)
})

test('the audit records what was offered, what was picked, and what was written', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const [option] = await options(cookie)
  streamEvents((await stream(cookie, option.id)).body.toString())

  const { rows } = await api.pool.query(
    'select event, band, mood, plot_id, keyword, casting, details from story_audit where family_id = $1 order by created_at, event',
    [family.id],
  )
  assert.equal(rows.filter((row) => row.event === 'offered').length, 3)
  for (const row of rows) {
    assert.equal(row.band, '2')
    assert.equal(row.mood, 'calm')
    assert.equal(row.keyword, null)
    assert.ok(row.casting.lead.name)
  }
  const offeredRows = rows.filter((row) => row.event === 'offered')
  const offered = offeredRows.find((row) => row.plot_id === option.id)
  assert.equal(offered.details.attempt, 1)
  assert.equal(offered.details.wildcard, false)
  // Every option says how long it took to arrive; the last one also says how
  // long the whole answer took.
  for (const row of offeredRows) assert.ok(row.details.ms >= 0 && row.details.msFirstToken >= 0)
  assert.equal(offeredRows.filter((row) => row.details.msTotal >= 0).length, 1)
  assert.ok(offeredRows.at(-1).details.msTotal >= offeredRows.at(-1).details.ms)

  const picked = rows.find((row) => row.event === 'picked')
  assert.equal(picked.plot_id, option.id)

  const written = rows.find((row) => row.event === 'written')
  assert.equal(written.plot_id, option.id)
  assert.equal(written.details.parts, 3)
  assert.equal(written.details.paragraphs, 7)
  assert.equal(written.details.words, 42)
  assert.equal(written.details.wordsMin, 350)
  assert.equal(written.details.wordsMax, 480)
  assert.equal(written.details.insideBand, false, 'the fake story is far shorter than the band asks for')
  assert.ok(written.details.msTotal >= 0)
})

test('reading a story again writes no second picked row', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const [option] = await options(cookie)
  streamEvents((await stream(cookie, option.id)).body.toString())
  streamEvents((await stream(cookie, option.id)).body.toString())

  const { rows } = await api.pool.query(
    `select count(*)::int as n from story_audit where family_id = $1 and event = 'picked'`,
    [family.id],
  )
  assert.equal(rows[0].n, 1)
})

test('reading the same plot again replays the saved story, without the model', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const [option] = await options(cookie)
  const first = streamEvents((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story')
  const before = llm.prompts.length

  const again = streamEvents((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story')
  assert.equal(again.story.id, first.story.id)
  assert.equal(llm.prompts.length, before, 'the model was not asked again')
})

test('a catalog story streams through the same route', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const { rows } = await api.pool.query(`select id from story_templates where slug = 'para-streaming'`)
  const templateId = rows[0].id

  const list = streamEvents((await stream(cookie, templateId)).body.toString())
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
  const [option] = await options(cookie)
  const story = streamEvents((await stream(cookie, option.id)).body.toString()).find((event) => event.type === 'story').story

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
  const kidsLlm = fakeLlm(({ user }) => (user.includes('Contestá solo con un objeto JSON') ? PLOTS() : STORY))
  const api2 = await startApi({
    signupEmails: ['hana@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('hana'),
    llm: kidsLlm,
  })
  const { cookie } = await signUpAs(api2, 'hana@example.com')
  const profile = (
    await putFamily(api2, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 12 },
        { name: 'Sofi', ageMonths: 52 },
      ],
    })
  ).json()
  const [milan, sofi] = profile.kids
  /** @param {string[]} kids */
  const choosePlaying = (kids) =>
    api2.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids } })

  await choosePlaying([sofi.id])
  const [option] = await options(cookie, [], api2)
  // Sofi is four, so her band is the one that reaches the model.
  assert.match(kidsLlm.prompts[0].user, /Los chicos: Sofi, de 4 años y 4 meses\./)
  assert.match(kidsLlm.prompts[0].system, /Cómo se escribe para este chico: CUATRO AÑOS/)

  // Milán joining after the plot was proposed doesn't change who its story is for.
  await choosePlaying([milan.id, sofi.id])
  const response = await api2.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload: { id: option.id } })
  assert.ok(streamEvents(response.body.toString()).some((event) => event.type === 'story'))
  assert.doesNotMatch(kidsLlm.prompts.at(-1).user, /Milán/, 'the story is for the kids the plot was drawn for')
  const { rows } = await api2.pool.query('select kid_ids::text[] as kids from stories where plot_id = $1', [option.id])
  assert.deepEqual(rows[0].kids, [sofi.id])
  await api2.close()
})

test('a family can only open its own stories', async () => {
  const { cookie: familyA } = await signUp()
  await putFamily(api, familyA, EXAMPLE_PROFILE)
  const [option] = await options(familyA)
  const story = streamEvents((await stream(familyA, option.id)).body.toString()).find((event) => event.type === 'story').story

  const { cookie: familyB } = await signUp()
  await putFamily(api, familyB, EXAMPLE_PROFILE)
  const response = await api.app.inject({ method: 'GET', url: `/stories/${story.id}`, headers: { cookie: familyB } })
  assert.equal(response.statusCode, 404)
})
test('an interest the parent tapped becomes a story of its own, its title first', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()

  const response = await streamKeyword(cookie, 'los dinosaurios')
  assert.equal(response.statusCode, 200)
  const list = streamEvents(response.body.toString())
  assert.deepEqual(list[0], { type: 'title', title: 'Milán y los dinosaurios.' })
  assert.equal(list[1].type, 'paragraph')
  assert.equal(list.filter((event) => event.type === 'paragraph').length, 7)

  const final = list.at(-1)
  assert.equal(final.type, 'story')
  assert.equal(final.story.title, 'Milán y los dinosaurios.')
  assert.equal(final.story.teaser, 'Un cuento sobre los dinosaurios.')
  assert.equal(final.story.keyword, 'los dinosaurios')
  assert.equal(final.story.plotId, null)
  assert.equal(final.story.templateId, null)
  // Milán is two and two months: the band's longest story.
  assert.equal(final.story.minutes, 4)
  assert.equal(final.story.parts.length, 3)

  const { rows } = await api.pool.query('select source, keyword, casting, plot_id, template_id from stories where family_id = $1', [
    family.id,
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].source, 'generated')
  assert.equal(rows[0].keyword, 'los dinosaurios')
  assert.equal(rows[0].plot_id, null)
  assert.equal(rows[0].template_id, null)
  assert.equal(rows[0].casting.kind, 'keyword')
  assert.equal(rows[0].casting.theme, 'los dinosaurios')

  // One call, with the theme and no plot to follow.
  const call = llm.prompts.at(-1)
  assert.match(call.user, /El tema es: los dinosaurios\./)
  assert.match(call.user, /Tema: los dinosaurios\./)
  assert.doesNotMatch(call.user, /La trama elegida/)
  assert.match(call.system, /Cómo se escribe para este chico: DE DOS A DOS AÑOS Y MEDIO/)

  // The saved story opens again by its own id, keyword and all.
  const one = await api.app.inject({ method: 'GET', url: `/stories/${final.story.id}`, headers: { cookie } })
  assert.equal(one.json().keyword, 'los dinosaurios')
})

test('every tap on an interest writes a new story', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()

  const first = streamEvents((await streamKeyword(cookie, 'los caballos')).body.toString()).at(-1)
  const second = streamEvents((await streamKeyword(cookie, 'los caballos')).body.toString()).at(-1)
  assert.notEqual(first.story.id, second.story.id)

  const { rows } = await api.pool.query(`select count(*)::int as n from stories where family_id = $1 and keyword = 'los caballos'`, [
    family.id,
  ])
  assert.equal(rows[0].n, 2)
})

test('the audit records the interest that was tapped and the story it wrote', async () => {
  const { cookie } = await signUp()
  const family = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  streamEvents((await streamKeyword(cookie, 'los caballos')).body.toString())

  const { rows } = await api.pool.query(
    'select event, band, mood, plot_id, keyword, casting, details from story_audit where family_id = $1 order by event',
    [family.id],
  )
  assert.deepEqual(rows.map((row) => row.event), ['picked', 'written'])
  for (const row of rows) {
    assert.equal(row.keyword, 'los caballos')
    assert.equal(row.plot_id, null)
    assert.equal(row.band, '2')
    assert.equal(row.mood, 'calm')
    assert.equal(row.casting.kind, 'keyword')
  }
  const written = rows[1]
  assert.equal(written.details.parts, 3)
  assert.equal(written.details.paragraphs, 7)
  assert.equal(written.details.words, 42)
  assert.ok(written.details.msTotal >= 0 && written.details.msFirstToken >= 0)
})

test('a model that writes no title line gets one from the keyword', async () => {
  const untitled = fakeLlm(() => STORY)
  const api2 = await startApi({
    signupEmails: ['pili@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('pili'),
    llm: untitled,
  })
  const { cookie } = await signUpAs(api2, 'pili@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const list = streamEvents((await streamKeyword(cookie, 'los caballos', api2)).body.toString())
  assert.deepEqual(list[0], { type: 'title', title: 'Un cuento de los caballos.' })
  assert.equal(list[1].type, 'paragraph')
  assert.equal(list.at(-1).story.title, 'Un cuento de los caballos.')
  await api2.close()
})

test('a keyword the family never saved is not a theme', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const response = await streamKeyword(cookie, 'los cohetes')
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'UNKNOWN_KEYWORD')
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
})

test('a keyword is one of the interests of the kids playing, not of a kid sitting out (JUG-144)', async () => {
  const { cookie } = await signUp()
  const profile = (
    await putFamily(api, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 26, interests: ['los dinosaurios'] },
        { name: 'Sofi', ageMonths: 52, interests: ['dibujar'] },
      ],
    })
  ).json()
  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [profile.kids[0].id] } })

  const sittingOut = await streamKeyword(cookie, 'dibujar')
  assert.equal(sittingOut.statusCode, 400)
  assert.equal(sittingOut.json().code, 'UNKNOWN_KEYWORD')
  assert.equal((await streamKeyword(cookie, 'los dinosaurios')).statusCode, 200)
})

test('a story comes from an id or from a keyword, never both and never neither', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  /** @param {object} payload */
  const write = (payload) => api.app.inject({ method: 'POST', url: '/stories/write', headers: { cookie }, payload })

  assert.equal((await write({ id: randomUUID(), keyword: 'los dinosaurios' })).statusCode, 400)
  assert.equal((await write({})).statusCode, 400)
  assert.equal((await write({ keyword: '' })).statusCode, 400)
})

test('without an LLM, a keyword story says the feature is off', async () => {
  const api2 = await startApi({
    signupEmails: ['vera@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('vera'),
  })
  const { cookie } = await signUpAs(api2, 'vera@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const response = await streamKeyword(cookie, 'los dinosaurios', api2)
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().code, 'LLM_OFF')
  await api2.close()
})

test('a reader who leaves while a keyword story is written saves nothing', { timeout: 10_000 }, async () => {
  /** @type {() => void} */
  let release = () => {}
  const readerLeft = new Promise((resolve) => (release = () => resolve(undefined)))
  const slowLlm = {
    async *stream() {
      yield 'TÍTULO: Milán y los caballos.\nPARTE 1\nMilán se despertó de golpe.\n\n'
      await readerLeft
      yield 'Inca movió la cola.\n\nPARTE 2\nFin.\n'
    },
  }
  const api2 = await startApi({
    signupEmails: ['bruno@example.com'],
    now: () => new Date('2026-09-14T10:00:00-03:00'),
    random: seededRandom('bruno'),
    llm: slowLlm,
  })
  const { cookie } = await signUpAs(api2, 'bruno@example.com')
  await putFamily(api2, cookie, EXAMPLE_PROFILE)

  const address = await api2.app.listen({ port: 0, host: '127.0.0.1' })
  const reader = new AbortController()
  const response = await fetch(`${address}/stories/write`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ keyword: 'los caballos' }),
    signal: reader.signal,
  })
  const { value } = await response.body.getReader().read()
  assert.match(new TextDecoder().decode(value), /Milán y los caballos/)
  reader.abort()
  await new Promise((resolve) => setTimeout(resolve, 100))
  release()
  await new Promise((resolve) => setTimeout(resolve, 200))

  const { rows } = await api2.pool.query('select count(*)::int as n from stories')
  assert.equal(rows[0].n, 0)
  const audit = await api2.pool.query(`select count(*)::int as n from story_audit where event = 'written'`)
  assert.equal(audit.rows[0].n, 0)
  await api2.close()
})
