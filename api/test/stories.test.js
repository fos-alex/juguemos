import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createCatalogService } from '../src/catalog/catalog.service.js'
import { EXAMPLE_PROFILE, optionsFrom, putFamily, signUpAs, startApi } from './helpers.js'

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
  api = await startApi()
  const catalog = createCatalogService({ db: api.db })
  for (const each of TEMPLATES) await catalog.addStoryTemplate(each)
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

test('two options, filled for the family, leaving out what it cannot fill', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [], toys: [{ name: 'el dinosaurio chiquito' }] })

  const response = await options(cookie)
  assert.equal(response.statusCode, 200)
  assert.match(String(response.headers['content-type']), /text\/event-stream/)
  const list = optionsFrom(response)
  assert.equal(list.length, 2)
  for (const option of list) {
    assert.match(option.title, /^El dinosaurio chiquito y el/)
    assert.equal(option.teaser, 'Con Milán.')
  }
})

test('other options leave out the ones on screen', async () => {
  const { cookie } = await signUpAs(api, 'beto@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [] })

  const shown = optionsFrom(await options(cookie)).map((option) => option.id)
  const next = optionsFrom(await options(cookie, shown))
  assert.equal(next.length, 2)
  assert.ok(!shown.includes(next[0].id), 'the fresh template comes first')
})

test('a story reads like its option, and reading it again returns the saved story', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const [option] = optionsFrom(await options(cookie))
  const first = await write(cookie, option.id)
  assert.equal(first.statusCode, 200)
  const story = first.json()
  assert.equal(story.title, option.title)
  assert.equal(story.teaser, option.teaser)
  assert.equal(story.templateId, option.id)
  assert.doesNotMatch(JSON.stringify(story.parts), /\{/)

  const again = (await write(cookie, option.id)).json()
  assert.equal(again.id, story.id)
  const { rows } = await api.pool.query('select count(*)::int as n from stories where template_id = $1', [option.id])
  assert.equal(rows[0].n, 1)
})

test('stories star the kids playing, and each set of kids gets its own story', async () => {
  const { cookie } = await signUpAs(api, 'eli@example.com')
  const profile = (
    await putFamily(api, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 12 },
        { name: 'Sofi', ageMonths: 52 },
      ],
    })
  ).json()
  const sofi = profile.kids[1]

  const [option] = optionsFrom(await options(cookie))
  assert.equal(option.teaser, 'Con Milán.')
  const both = (await write(cookie, option.id)).json()
  assert.equal(both.parts[0][1], 'Milán lo vio.')

  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [sofi.id] } })
  for (const each of optionsFrom(await options(cookie))) assert.equal(each.teaser, 'Con Sofi.')
  const alone = (await write(cookie, option.id)).json()
  assert.notEqual(alone.id, both.id)
  assert.equal(alone.parts[0][1], 'Sofi lo vio.')
  const { rows } = await api.pool.query('select kid_ids::text[] as kids from stories where id = $1', [alone.id])
  assert.deepEqual(rows[0].kids, [sofi.id])
})

test('the shelf holds the two stories read last (JUG-189)', async () => {
  const { cookie } = await signUpAs(api, 'fer@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const shown = optionsFrom(await options(cookie))
  const [next] = optionsFrom(await options(cookie, shown.map((option) => option.id)))
  const read = []
  for (const option of [...shown, next]) read.push((await write(cookie, option.id)).json())
  const shelf = async () =>
    (await api.app.inject({ method: 'GET', url: '/stories', headers: { cookie } }))
      .json()
      .map((/** @type {{ id: string }} */ saved) => saved.id)

  assert.deepEqual(await shelf(), [read[2].id, read[1].id])
  await api.app.inject({ method: 'POST', url: `/stories/${read[0].id}/reads`, headers: { cookie } })
  assert.deepEqual(await shelf(), [read[0].id, read[2].id])
})

test('an unknown story is a 404', async () => {
  const { cookie } = await signUpAs(api, 'dani@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  assert.equal((await write(cookie, randomUUID())).statusCode, 404)
})

test('stories need a session and a family', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/stories/options' })).statusCode, 401)
})
