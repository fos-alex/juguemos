import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createCatalogService } from '../src/catalog/catalog.service.js'
import { EXAMPLE_PROFILE, optionsFrom, putFamily, signUpAs, startApi } from './helpers.js'

/** @param {string} slug @param {string} title */
const activityTemplate = (slug, title) => ({
  slug,
  title,
  minutes: 10,
  place: /** @type {const} */ ('indoor'),
  minAgeMonths: 12,
  maxAgeMonths: 71,
  energy: /** @type {const} */ ('medium'),
  categories: ['pretend'],
  smallSpace: true,
  materials: [],
  themes: [],
  skills: [],
  safety: [],
  why: 'Porque sí.',
  needs: 'nada.',
  steps: ['Jueguen con {kid}.'],
  easier: 'Más fácil.',
  harder: 'Más difícil.',
})

/** @param {string} slug @param {string} title */
const storyTemplate = (slug, title) => ({
  slug,
  title,
  teaser: 'Con {kid}.',
  minutes: 3,
  mood: /** @type {const} */ ('lively'),
  minAgeMonths: 12,
  maxAgeMonths: 71,
  parts: [['Había una vez {kid}.'], ['Fin.']],
})

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi()
  const catalog = createCatalogService({ db: api.db })
  for (const slug of ['uno', 'dos', 'tres']) await catalog.addActivityTemplate(activityTemplate(slug, `Juego ${slug}`))
  for (const slug of ['uno', 'dos', 'tres']) await catalog.addStoryTemplate(storyTemplate(slug, `Cuento ${slug}`))
})
after(() => api.close())

/** @param {string} cookie */
const history = async (cookie) => {
  const response = await api.app.inject({ method: 'GET', url: '/history', headers: { cookie } })
  assert.equal(response.statusCode, 200)
  return response.json()
}

/** @param {string} cookie @param {string | null} [afterId] */
const suggest = async (cookie, afterId = null) =>
  (await api.app.inject({ method: 'POST', url: '/activities/suggestions', headers: { cookie }, payload: { after: afterId } })).json()

/** @param {string} cookie @param {string} id */
const play = (cookie, id) => api.app.inject({ method: 'POST', url: `/activities/${id}/plays`, headers: { cookie } })

/** @param {string} cookie @param {string} id */
const markRead = (cookie, id) => api.app.inject({ method: 'POST', url: `/stories/${id}/reads`, headers: { cookie } })

/** Two stories the family has read, one after the other: both its options, written. @param {string} cookie */
const readStories = async (cookie) => {
  const options = optionsFrom(await api.app.inject({ method: 'GET', url: '/stories/options', headers: { cookie } }))
  const written = []
  for (const option of options) {
    const response = await api.app.inject({ method: 'POST', url: '/stories', headers: { cookie }, payload: { templateId: option.id } })
    written.push(response.json())
  }
  return written
}

/** @param {string} cookie */
const newFamily = async (cookie) => {
  assert.equal((await putFamily(api, cookie, EXAMPLE_PROFILE)).statusCode, 200)
}

test('a family that has played nothing has an empty history', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  await newFamily(cookie)
  assert.deepEqual(await history(cookie), { activities: [], stories: [] })
})

test('a juego is in the history once it is started, and playing it again moves it up', async () => {
  const { cookie } = await signUpAs(api, 'beto@example.com')
  await newFamily(cookie)
  const first = await suggest(cookie)
  const second = await suggest(cookie, first.id)

  // Only suggested: not played.
  assert.deepEqual((await history(cookie)).activities, [])

  assert.equal((await play(cookie, first.id)).statusCode, 204)
  assert.equal((await play(cookie, second.id)).statusCode, 204)
  let { activities } = await history(cookie)
  assert.deepEqual(
    activities.map((/** @type {{ id: string }} */ each) => each.id),
    [second.id, first.id],
  )
  assert.deepEqual(Object.keys(activities[0]).sort(), ['id', 'minutes', 'place', 'playedAt', 'reaction', 'title'])
  assert.equal(activities[0].title, second.title)
  assert.equal(activities[0].reaction, null)

  assert.equal((await play(cookie, first.id)).statusCode, 204)
  ;({ activities } = await history(cookie))
  assert.deepEqual(
    activities.map((/** @type {{ id: string }} */ each) => each.id),
    [first.id, second.id],
  )
})

test('a juego marked ¡Lo hicimos! counts as played, even without Empezar', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  await newFamily(cookie)
  const liked = await suggest(cookie)
  const disliked = await suggest(cookie, liked.id)
  await api.app.inject({ method: 'PUT', url: `/activities/${liked.id}/reaction`, headers: { cookie }, payload: { reaction: 'up' } })
  await api.app.inject({ method: 'PUT', url: `/activities/${disliked.id}/reaction`, headers: { cookie }, payload: { reaction: 'down' } })

  const { activities } = await history(cookie)
  assert.equal(activities.length, 1)
  assert.equal(activities[0].id, liked.id)
  assert.equal(activities[0].reaction, 'up')
})

test('a juego opens again as the parent saw it, only for its own family', async () => {
  const { cookie } = await signUpAs(api, 'dani@example.com')
  await newFamily(cookie)
  const { cookie: other } = await signUpAs(api, 'eli@example.com')
  await newFamily(other)
  const activity = await suggest(cookie)

  const found = await api.app.inject({ method: 'GET', url: `/activities/${activity.id}`, headers: { cookie } })
  assert.equal(found.statusCode, 200)
  assert.deepEqual(found.json(), activity)

  assert.equal((await api.app.inject({ method: 'GET', url: `/activities/${activity.id}`, headers: { cookie: other } })).statusCode, 404)
  assert.equal((await play(other, activity.id)).statusCode, 404)
  assert.equal((await play(cookie, randomUUID())).statusCode, 404)
  assert.equal((await play(cookie, 'not-a-uuid')).statusCode, 400)
  assert.deepEqual((await history(other)).activities, [])
})

test('a story is in the history once it is read, and reading it again moves it up', async () => {
  const { cookie } = await signUpAs(api, 'fede@example.com')
  await newFamily(cookie)
  const [first, second] = await readStories(cookie)

  let { stories } = await history(cookie)
  assert.deepEqual(
    stories.map((/** @type {{ id: string }} */ each) => each.id),
    [second.id, first.id],
  )
  assert.deepEqual(stories[0], {
    id: second.id,
    title: second.title,
    teaser: second.teaser,
    minutes: second.minutes,
    series: null,
    readAt: stories[0].readAt,
  })

  assert.equal((await markRead(cookie, first.id)).statusCode, 204)
  ;({ stories } = await history(cookie))
  assert.deepEqual(
    stories.map((/** @type {{ id: string }} */ each) => each.id),
    [first.id, second.id],
  )
})

test('a story is read again only by its own family', async () => {
  const { cookie } = await signUpAs(api, 'gabi@example.com')
  await newFamily(cookie)
  const { cookie: other } = await signUpAs(api, 'hugo@example.com')
  await newFamily(other)
  const [story] = await readStories(cookie)

  assert.equal((await markRead(other, story.id)).statusCode, 404)
  assert.equal((await markRead(cookie, randomUUID())).statusCode, 404)
  assert.deepEqual((await history(other)).stories, [])
})

test('the history goes back a month', async () => {
  const { cookie } = await signUpAs(api, 'ines@example.com')
  await newFamily(cookie)
  const recent = await suggest(cookie)
  const old = await suggest(cookie, recent.id)
  const liked = await suggest(cookie, old.id)
  await play(cookie, recent.id)
  await api.pool.query(`update activities set played_at = now() - interval '31 days' where id = $1`, [old.id])
  await api.pool.query(`update activities set reaction = 'up', reacted_at = now() - interval '31 days' where id = $1`, [liked.id])
  const [story, oldStory] = await readStories(cookie)
  await api.pool.query(`update stories set read_at = now() - interval '31 days' where id = $1`, [oldStory.id])

  const found = await history(cookie)
  assert.deepEqual(
    found.activities.map((/** @type {{ id: string }} */ each) => each.id),
    [recent.id],
  )
  assert.deepEqual(
    found.stories.map((/** @type {{ id: string }} */ each) => each.id),
    [story.id],
  )
})

test('the history needs a session and a family', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/history' })).statusCode, 401)
  const { cookie } = await signUpAs(api, 'juli@example.com')
  assert.equal((await api.app.inject({ method: 'GET', url: '/history', headers: { cookie } })).statusCode, 409)
})
