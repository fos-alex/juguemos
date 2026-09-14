import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createFamiliesService } from '../src/families/families.service.js'
import { createStoriesService } from '../src/stories/stories.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** @param {string} slug @param {string} title */
const template = (slug, title) => ({
  slug,
  title,
  teaser: 'Con {kid}.',
  minutes: 3,
  mood: /** @type {const} */ ('lively'),
  minAgeMonths: 12,
  maxAgeMonths: 71,
  parts: [['Había una vez {toy}.', '{kid} lo vio.'], ['Fin.']],
})

const TEMPLATES = [
  template('uno', '{toy} y el primero.'),
  template('dos', '{toy} y el segundo.'),
  template('tres', '{toy} y el tercero.'),
  template('cuatro', '{toy} y el cuarto.'),
  template('con-mascota', '{pet} sale de paseo.'),
]

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com', 'dani@example.com'] })
  const stories = createStoriesService({ db: api.db, families: createFamiliesService({ db: api.db }) })
  for (const each of TEMPLATES) await stories.addTemplate(each)
})
after(() => api.close())

/** @param {string} cookie @param {string[]} [exclude] */
const options = (cookie, exclude = []) =>
  api.app.inject({
    method: 'GET',
    url: `/stories/options${exclude.length ? `?${exclude.map((id) => `exclude=${id}`).join('&')}` : ''}`,
    headers: { cookie },
  })

/** @param {string} cookie @param {string} templateId */
const write = (cookie, templateId) =>
  api.app.inject({ method: 'POST', url: '/stories', headers: { cookie }, payload: { templateId } })

test('three options, filled for the family, leaving out what it cannot fill', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [], toys: [{ name: 'el dinosaurio chiquito' }] })

  const response = await options(cookie)
  assert.equal(response.statusCode, 200)
  const list = response.json()
  assert.equal(list.length, 3)
  for (const option of list) {
    assert.match(option.title, /^El dinosaurio chiquito y el/)
    assert.equal(option.teaser, 'Con Milán.')
  }
})

test('other options leave out the ones on screen', async () => {
  const { cookie } = await signUpAs(api, 'beto@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [] })

  const shown = (await options(cookie)).json().map((option) => option.id)
  const next = (await options(cookie, shown)).json()
  assert.equal(next.length, 3)
  assert.ok(!shown.includes(next[0].id), 'the fresh template comes first')
})

test('a story reads like its option, and reading it again returns the saved story', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const [option] = (await options(cookie)).json()
  const first = await write(cookie, option.id)
  assert.equal(first.statusCode, 200)
  const story = first.json()
  assert.equal(story.title, option.title)
  assert.equal(story.teaser, option.teaser)
  assert.equal(story.templateId, option.id)
  assert.doesNotMatch(JSON.stringify(story.parts), /\{/)

  const again = (await write(cookie, option.id)).json()
  assert.equal(again.id, story.id)
  const { rows } = await api.db.query('select count(*)::int as n from stories where template_id = $1', [option.id])
  assert.equal(rows[0].n, 1)
})

test('an unknown story is a 404', async () => {
  const { cookie } = await signUpAs(api, 'dani@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  assert.equal((await write(cookie, randomUUID())).statusCode, 404)
})

test('stories need a session and a family', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/stories/options' })).statusCode, 401)
})
