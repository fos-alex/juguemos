import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createCatalogService } from '../src/catalog/catalog.service.js'
import { seededRandom } from '../src/catalog/slots.js'
import { EXAMPLE_PROFILE, optionsFrom, putFamily, signUpAs, startApi, streamEvents } from './helpers.js'

/** A model that answers by hand, one chunk at a time, and remembers every call. @param {(call: { call: number, user: string }) => string} respond */
const fakeLlm = (respond) => {
  /** @type {{ call: number, system: string, user: string }[]} */
  const prompts = []
  return {
    prompts,
    async *stream({ system, user }) {
      const call = prompts.length + 1
      prompts.push({ call, system, user })
      const text = respond({ call, user })
      for (let i = 0; i < text.length; i += 3) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        yield text.slice(i, i + 3)
      }
    },
  }
}

/** The three plots one options call answers with. */
const PLOTS = JSON.stringify({
  tramas: [1, 2, 3].map((n) => ({
    title: `Trama ${n}`,
    teaser: `La número ${n}.`,
    minutes: 4,
    premise: 'Salen a la plaza con el tren grandote. Vuelven a tiempo para la merienda.',
  })),
})

/** The three parts every story in this file is written with. */
const PARTS = `PARTE 1
Milán se despertó de golpe.

PARTE 2
Salieron a la plaza con el tren grandote.

PARTE 3
Volvieron cansados y felices.`

/** The second episode: the call that names the series and sums the first one up. */
const SECOND = `SERIE: Las tardes de Milán.
LUGAR: la plaza de la esquina
ANTES: Milán salió a la plaza con el tren grandote.
TÍTULO: Milán y la caracola.

${PARTS}

RESUMEN: Milán conoció a Caracola, que vive abajo del banco.
PERSONAJES: Caracola: un caracol lento y curioso`

/** Every episode after that: a title, the story, and what the series keeps. */
const NEXT = `TÍTULO: Milán vuelve a la plaza.

${PARTS}

RESUMEN: Volvieron a buscar a Caracola y encontraron a Don Sapo.
PERSONAJES: Caracola: un caracol lento y curioso; Don Sapo: salta más alto que nadie`

/** What the model answers, by the prompt it is answering. @param {string} user */
const answerTo = (user) => {
  if (user.includes('Contestá solo con un objeto JSON')) return PLOTS
  if (user.includes('Escribí el segundo episodio')) return SECOND
  if (user.includes('Escribí el episodio')) return NEXT
  return PARTS
}

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
let llm
const emails = Array.from({ length: 12 }, (_, i) => `serie-${i}@example.com`)
let emailCount = 0
const signUp = () => signUpAs(api, emails[emailCount++])

before(async () => {
  llm = fakeLlm(({ user }) => answerTo(user))
  api = await startApi({
    signupEmails: emails,
    now: () => new Date('2026-09-14T21:00:00-03:00'),
    random: seededRandom('series'),
    llm,
  })
})
after(() => api.close())

/** @param {Awaited<ReturnType<typeof startApi>>} target @param {string} cookie */
const options = async (target, cookie) =>
  optionsFrom(await target.app.inject({ method: 'GET', url: '/stories/options', headers: { cookie } }))

/** The last event of a stream, which is the whole story. @param {import('light-my-request').Response} response */
const storyIn = (response) => streamEvents(response.body.toString()).find((event) => event.type === 'story')?.story

/**
 * A family with one story already read, which is what a series starts from.
 * @param {Awaited<ReturnType<typeof startApi>>} target
 * @param {string} cookie
 */
const firstStory = async (target, cookie) => {
  const [option] = await options(target, cookie)
  const response = await target.app.inject({
    method: 'POST',
    url: '/stories/write',
    headers: { cookie },
    payload: { id: option.id },
  })
  return storyIn(response)
}

/** @param {string} cookie @param {string} storyId @param {Awaited<ReturnType<typeof startApi>>} [target] */
const makeSeries = (cookie, storyId, target = api) =>
  target.app.inject({ method: 'POST', url: `/stories/${storyId}/series`, headers: { cookie } })

/** @param {string} cookie @param {string} seriesId @param {Awaited<ReturnType<typeof startApi>>} [target] */
const writeEpisode = (cookie, seriesId, target = api) =>
  target.app.inject({ method: 'POST', url: `/series/${seriesId}/episodes`, headers: { cookie } })

/** @param {string} cookie @param {Awaited<ReturnType<typeof startApi>>} [target] */
const seriesList = async (cookie, target = api) =>
  (await target.app.inject({ method: 'GET', url: '/series', headers: { cookie } })).json().series

/** @param {string} cookie @param {Awaited<ReturnType<typeof startApi>>} [target] */
const library = async (cookie, target = api) =>
  (await target.app.inject({ method: 'GET', url: '/stories', headers: { cookie } })).json()

/** A family with a series of one episode, ready for the next one. */
const familyWithSeries = async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const story = await firstStory(api, cookie)
  const series = (await makeSeries(cookie, story.id)).json()
  return { cookie, story, series }
}

test('a story the family read becomes the first episode of a series', async () => {
  const { story, series } = await familyWithSeries()
  assert.equal(series.title, story.title, 'until the second episode it is called after the story it came from')
  assert.equal(series.maxEpisodes, 10)
  assert.deepEqual(
    series.episodes.map((episode) => [episode.episode, episode.id]),
    [[1, story.id]],
  )
  // Nothing is written to make a series: the model is asked only for episodes.
  assert.ok(!llm.prompts.at(-1).user.includes('episodio'), 'no model call to start a series')
})

test('the second episode names the series and remembers what happened', async () => {
  const { cookie, story, series } = await familyWithSeries()

  const response = await writeEpisode(cookie, series.id)
  assert.equal(response.statusCode, 200)
  assert.match(String(response.headers['content-type']), /text\/event-stream/)
  const events = streamEvents(response.body.toString())
  assert.equal(events[0].type, 'title', 'the episode is named before its first paragraph')
  assert.equal(events[0].title, 'Milán y la caracola.')

  const episode = events.at(-1).story
  assert.equal(episode.title, 'Milán y la caracola.')
  assert.deepEqual(episode.series, { id: series.id, title: 'Las tardes de Milán.', episode: 2 })
  assert.equal(episode.parts.length, 3)

  // The series is no longer called after its first episode, and it knows
  // where it happens and who is in it.
  const [saved] = await seriesList(cookie)
  assert.equal(saved.title, 'Las tardes de Milán.')
  assert.notEqual(saved.title, story.title)
  assert.deepEqual(
    saved.episodes.map((each) => each.episode),
    [1, 2],
  )
  const { rows } = await api.pool.query('select setting, characters from story_series where id = $1', [series.id])
  assert.equal(rows[0].setting, 'la plaza de la esquina')
  assert.deepEqual(rows[0].characters, [{ name: 'Caracola', note: 'un caracol lento y curioso' }])

  // The first episode got the summary nobody could ask for until now.
  const { rows: episodes } = await api.pool.query('select summary from stories where series_id = $1 order by episode', [series.id])
  assert.match(episodes[0].summary, /^Milán salió a la plaza/)
  assert.match(episodes[1].summary, /^Milán conoció a Caracola/)
})

test('the second episode is written from the whole first one', async () => {
  const { cookie, story, series } = await familyWithSeries()
  await writeEpisode(cookie, series.id)

  const { user, system } = llm.prompts.at(-1)
  assert.match(user, /Escribí el segundo episodio/)
  assert.match(user, new RegExp(`El primer episodio se llama «${story.title}»`))
  assert.match(user, /Milán se despertó de golpe\./, 'the first episode goes in whole')
  assert.match(user, /El reparto de la serie, que se mantiene en todos los episodios/)
  assert.match(user, /El hilo de la serie, que ningún episodio cambia: Salen a la plaza/)
  // The band and the moment still come from the kids playing and the clock.
  assert.match(system, /Cómo se escribe para este chico: DE DOS A DOS AÑOS Y MEDIO/)
  assert.match(system, /El momento: TRANQUI, antes de dormir/)
})

test('a later episode is written from what the series knows, not from every story', async () => {
  const { cookie, series } = await familyWithSeries()
  await writeEpisode(cookie, series.id)
  await writeEpisode(cookie, series.id)

  const { user } = llm.prompts.at(-1)
  assert.match(user, /Escribí el episodio 3 de una serie/)
  assert.match(user, /La serie se llama «Las tardes de Milán\.»/)
  assert.match(user, /Dónde pasa: la plaza de la esquina/)
  assert.match(user, /Personajes que ya aparecieron.*Caracola \(un caracol lento y curioso\)/)
  assert.match(user, /1\. «Trama 1»: Milán salió a la plaza/)
  assert.match(user, /2\. «Milán y la caracola\.»: Milán conoció a Caracola/)
  assert.doesNotMatch(user, /Milán se despertó de golpe/, 'the episodes themselves stay out of the prompt')

  // The characters of every episode are kept, the old ones and the new.
  const { rows } = await api.pool.query('select characters from story_series where id = $1', [series.id])
  assert.deepEqual(
    rows[0].characters.map((character) => character.name),
    ['Caracola', 'Don Sapo'],
  )
})

test('two episodes asked for at once are both kept, in the order they land', async () => {
  const { cookie, series } = await familyWithSeries()
  const [one, two] = await Promise.all([writeEpisode(cookie, series.id), writeEpisode(cookie, series.id)])
  assert.equal(one.statusCode, 200)
  assert.equal(two.statusCode, 200)
  assert.deepEqual(
    [one, two].map((response) => storyIn(response).series.episode).sort(),
    [2, 3],
    'neither of them is lost, and they do not land on the same episode',
  )
})

test('the series bookkeeping never reaches the reader', async () => {
  const { cookie, series } = await familyWithSeries()
  const events = streamEvents((await writeEpisode(cookie, series.id)).body.toString())
  const read = events
    .filter((event) => event.type === 'paragraph')
    .map((event) => event.text)
    .join('\n')
  for (const line of ['SERIE', 'LUGAR', 'ANTES', 'RESUMEN', 'PERSONAJES', 'TÍTULO']) {
    assert.doesNotMatch(read, new RegExp(line), `${line} is not read aloud`)
  }
  assert.deepEqual(events.at(-1).story.parts.flat().join('\n').includes('RESUMEN'), false)
})

test('the episodes of a series are read under it, not beside it in the library', async () => {
  const { cookie, story, series } = await familyWithSeries()
  assert.deepEqual(await library(cookie), [], 'the story it started from moved into the series')

  await writeEpisode(cookie, series.id)
  assert.deepEqual(await library(cookie), [])

  // Each episode still reads on its own, and says which series it belongs to.
  const first = await api.app.inject({ method: 'GET', url: `/stories/${story.id}`, headers: { cookie } })
  assert.equal(first.statusCode, 200)
  assert.deepEqual(first.json().series, { id: series.id, title: 'Las tardes de Milán.', episode: 1 })
})

test('a series the family stops following shows up nowhere, and its stories come back', async () => {
  const { cookie, story, series } = await familyWithSeries()
  await writeEpisode(cookie, series.id)

  const removed = await api.app.inject({ method: 'DELETE', url: `/series/${series.id}`, headers: { cookie } })
  assert.equal(removed.statusCode, 204)
  assert.deepEqual(await seriesList(cookie), [])
  assert.equal((await api.app.inject({ method: 'GET', url: `/series/${series.id}`, headers: { cookie } })).statusCode, 404)
  assert.equal((await writeEpisode(cookie, series.id)).statusCode, 404)

  // Nothing written is lost: both episodes are stories again.
  const shelf = await library(cookie)
  assert.equal(shelf.length, 2)
  assert.ok(shelf.some((saved) => saved.id === story.id))
  const again = await api.app.inject({ method: 'GET', url: `/stories/${story.id}`, headers: { cookie } })
  assert.equal(again.json().series, null)

  // And the story can start a new series, since it follows none.
  assert.equal((await makeSeries(cookie, story.id)).statusCode, 201)
})

test('a story that is already an episode cannot start another series', async () => {
  const { cookie, story } = await familyWithSeries()
  const again = await makeSeries(cookie, story.id)
  assert.equal(again.statusCode, 409)
  assert.equal(again.json().code, 'ALREADY_IN_SERIES')
})

test('a series holds as many episodes as it was configured for', async () => {
  const short = await startApi({
    signupEmails: ['corta@example.com'],
    now: () => new Date('2026-09-14T21:00:00-03:00'),
    random: seededRandom('corta'),
    llm: fakeLlm(({ user }) => answerTo(user)),
    maxEpisodes: 2,
  })
  try {
    const { cookie } = await signUpAs(short, 'corta@example.com')
    await putFamily(short, cookie, EXAMPLE_PROFILE)
    const story = await firstStory(short, cookie)
    const series = (await makeSeries(cookie, story.id, short)).json()
    assert.equal(series.maxEpisodes, 2)

    assert.equal((await writeEpisode(cookie, series.id, short)).statusCode, 200)
    const full = await writeEpisode(cookie, series.id, short)
    assert.equal(full.statusCode, 409)
    assert.equal(full.json().code, 'SERIES_FULL')
  } finally {
    await short.close()
  }
})

test('a series belongs to the family that started it', async () => {
  const { series } = await familyWithSeries()
  const { cookie: other } = await signUp()
  await putFamily(api, other, EXAMPLE_PROFILE)

  assert.equal((await api.app.inject({ method: 'GET', url: `/series/${series.id}`, headers: { cookie: other } })).statusCode, 404)
  assert.equal((await writeEpisode(other, series.id)).statusCode, 404)
  assert.equal((await api.app.inject({ method: 'DELETE', url: `/series/${series.id}`, headers: { cookie: other } })).statusCode, 404)
  assert.deepEqual(await seriesList(other), [])
})

test('an unknown story and an unknown series are 404s, and series need a session', async () => {
  const { cookie } = await signUp()
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  assert.equal((await makeSeries(cookie, randomUUID())).statusCode, 404)
  assert.equal((await writeEpisode(cookie, randomUUID())).statusCode, 404)
  assert.equal((await api.app.inject({ method: 'GET', url: '/series' })).statusCode, 401)
})

test('without an LLM a story cannot become a series', async () => {
  const plain = await startApi({ signupEmails: ['sin-llm@example.com'] })
  try {
    await createCatalogService({ db: plain.db }).addStoryTemplate({
      slug: 'para-la-serie',
      title: '{toy} y el primero.',
      teaser: 'Con {kid}.',
      minutes: 3,
      mood: 'lively',
      minAgeMonths: 12,
      maxAgeMonths: 71,
      parts: [['Había una vez {toy}.', '{kid} lo vio.'], ['Fin.']],
    })
    const { cookie } = await signUpAs(plain, 'sin-llm@example.com')
    await putFamily(plain, cookie, EXAMPLE_PROFILE)
    const [option] = await options(plain, cookie)
    const story = (
      await plain.app.inject({ method: 'POST', url: '/stories', headers: { cookie }, payload: { templateId: option.id } })
    ).json()

    const refused = await makeSeries(cookie, story.id, plain)
    assert.equal(refused.statusCode, 503)
    assert.equal(refused.json().code, 'LLM_OFF')
  } finally {
    await plain.close()
  }
})
