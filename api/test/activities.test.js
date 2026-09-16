import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { DEFAULT_WEIGHTS } from '../src/activities/ranking.js'
import { createCatalogService } from '../src/catalog/catalog.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** @param {Partial<import('../src/catalog/catalog.service.js').ActivityTemplateInput>} overrides */
const template = (overrides) => ({
  slug: 'test',
  title: 'Juego',
  minutes: 10,
  place: /** @type {const} */ ('indoor'),
  minAgeMonths: 12,
  maxAgeMonths: 47,
  energy: /** @type {const} */ ('medium'),
  categories: ['pretend'],
  smallSpace: true,
  materials: [],
  themes: [],
  skills: [],
  safety: [],
  why: 'Porque sí.',
  needs: 'nada.',
  steps: ['Jueguen.'],
  easier: 'Más fácil.',
  harder: 'Más difícil.',
  ...overrides,
})

const TEMPLATES = [
  template({
    slug: 'la-busqueda',
    title: 'La búsqueda de {toy}',
    needs: '{toy} y un almohadón.',
    steps: ['Escondé {toy} mientras {kid} mira.', 'Busquen juntos.'],
  }),
  template({ slug: 'con-la-mascota', title: 'A correr con {pet}' }),
  template({ slug: 'para-grandes', title: 'Para grandes', minAgeMonths: 60, maxAgeMonths: 95 }),
  template({ slug: 'a-comer', title: '{toy} tiene hambre' }),
  template({ slug: 'juntos', title: 'Juntos con {pet}', minAgeMonths: 12, maxAgeMonths: 71 }),
]

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {import('../src/catalog/catalog.service.js').CatalogService} */
let catalog
before(async () => {
  api = await startApi({
    signupEmails: [
      'ana@example.com',
      'beto@example.com',
      'carla@example.com',
      'dani@example.com',
      'eva@example.com',
      'fede@example.com',
      'gabi@example.com',
      'hugo@example.com',
      'ines@example.com',
      'juan@example.com',
      'kari@example.com',
      'lola@example.com',
      'mati@example.com',
      'nico@example.com',
    ],
  })
  catalog = createCatalogService({ db: api.db })
  for (const each of TEMPLATES) await catalog.addActivityTemplate(each)
})
after(() => api.close())

/** @param {string} cookie @param {string | null} [afterId] */
const suggest = (cookie, afterId = null) =>
  api.app.inject({ method: 'POST', url: '/activities/suggestions', headers: { cookie }, payload: { after: afterId } })

test('a suggestion is a template filled with the family words, and it is saved', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [], toys: [{ name: 'el dinosaurio chiquito' }] })

  const response = await suggest(cookie)
  assert.equal(response.statusCode, 201)
  const activity = response.json()
  assert.doesNotMatch(JSON.stringify(activity), /\{(kid|pet|toy2?3?|interest)\}/)
  assert.ok(['La búsqueda del dinosaurio chiquito', 'El dinosaurio chiquito tiene hambre'].includes(activity.title))
  assert.equal(activity.place, 'indoor')
  assert.equal(activity.reaction, null)

  // Saved as the parent saw it, with why the ranking picked it (JUG-104).
  const { rows } = await api.pool.query('select title, pick from activities where id = $1', [activity.id])
  assert.equal(rows[0].title, activity.title)
  assert.ok(rows[0].pick.score > 0)
  assert.equal(rows[0].pick.fit, 1)
  assert.deepEqual(rows[0].pick.weights, DEFAULT_WEIGHTS)
})

test('templates the family cannot fill, or that are for other ages, are never suggested', async () => {
  const { cookie } = await signUpAs(api, 'beto@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [] })

  let previous = null
  for (let round = 0; round < 8; round++) {
    const activity = (await suggest(cookie, previous)).json()
    assert.doesNotMatch(activity.title, /correr|grandes/)
    previous = activity.id
  }
})

test('another suggestion moves on to a different template', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)

  const first = (await suggest(cookie)).json()
  const next = (await suggest(cookie, first.id)).json()
  assert.notEqual(next.id, first.id)
  assert.notEqual(next.title, first.title)
})

test('an activity must suit every kid, not just one', async () => {
  const { cookie } = await signUpAs(api, 'fede@example.com')
  await putFamily(api, cookie, {
    ...EXAMPLE_PROFILE,
    kids: [
      { name: 'Milán', ageMonths: 12 },
      { name: 'Sofi', ageMonths: 52 },
    ],
  })

  // Only "juntos" (12 to 71 months) covers both a 1-year-old and a 4-year-old.
  let previous = null
  for (let round = 0; round < 4; round++) {
    const activity = (await suggest(cookie, previous)).json()
    assert.equal(activity.title, 'Juntos con Inca')
    previous = activity.id
  }
})

test('when nothing in the catalog fits, it says so with a code', async () => {
  const { cookie } = await signUpAs(api, 'dani@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, kids: [{ name: 'Sofi', ageMonths: 144 }] })
  const response = await suggest(cookie)
  assert.equal(response.statusCode, 404)
  assert.equal(response.json().code, 'NO_FITTING_ACTIVITY')
})

test('suggestions need a family', async () => {
  const { cookie } = await signUpAs(api, 'eva@example.com')
  const response = await suggest(cookie)
  assert.equal(response.statusCode, 409)
  assert.deepEqual(response.json(), { error: 'family required' })
})

test('a juego suits only the kids playing, names them, and records who played', async () => {
  await catalog.addActivityTemplate(template({ slug: 'para-cuatro', title: '{kid} arma una torre', minAgeMonths: 36, maxAgeMonths: 71 }))
  const { cookie } = await signUpAs(api, 'gabi@example.com')
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
  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [sofi.id] } })

  // Without Milán (1), a 4-year-old's juegos open up: "para-cuatro" (36 to 71 months) as well as "juntos".
  const titles = new Set()
  let previous = null
  for (let round = 0; round < 4; round++) {
    const activity = (await suggest(cookie, previous)).json()
    titles.add(activity.title)
    previous = activity.id
  }
  assert.deepEqual([...titles].sort(), ['Juntos con Inca', 'Sofi arma una torre'])
  const { rows } = await api.pool.query('select kid_ids::text[] as kids from activities where id = $1', [previous])
  assert.deepEqual(rows[0].kids, [sofi.id])
})

test('{interest} is something the kid named loves, and only the kids playing count (JUG-144)', async () => {
  await catalog.addActivityTemplate(
    template({
      slug: 'lo-que-le-encanta',
      title: 'Lo que le encanta a {kid}',
      harder: 'Sumen cosas que le encantan a {kid}, como {interest}.',
      minAgeMonths: 12,
      maxAgeMonths: 71,
    }),
  )
  const { cookie } = await signUpAs(api, 'hugo@example.com')
  const profile = (
    await putFamily(api, cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', ageMonths: 26, interests: ['los dinosaurios'] },
        { name: 'Sofi', ageMonths: 52, interests: ['dibujar'] },
      ],
    })
  ).json()
  await api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids: [profile.kids[1].id] } })

  /** @type {{ title: string, harder: string } | null} */
  let found = null
  let previous = null
  for (let round = 0; round < 6 && !found; round++) {
    const activity = (await suggest(cookie, previous)).json()
    if (activity.title === 'Lo que le encanta a Sofi') found = activity
    previous = activity.id
  }
  assert.equal(found?.harder, 'Sumen cosas que le encantan a Sofi, como dibujar.')
})

test('a juego never needs a material the family does not have, and the common ones count as there (JUG-153)', async () => {
  await catalog.addActivityTemplate(template({ slug: 'con-tizas', title: 'Con tizas', minAgeMonths: 96, maxAgeMonths: 119, materials: ['tizas'] }))
  await catalog.addActivityTemplate(
    template({ slug: 'con-almohadones', title: 'Con almohadones', minAgeMonths: 96, maxAgeMonths: 119, materials: ['almohadones'] }),
  )
  const { cookie } = await signUpAs(api, 'ines@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [], toys: [], kids: [{ name: 'Sofi', ageMonths: 100 }] })

  /** The titles of a few suggestions in a row. */
  const titles = async () => {
    const seen = new Set()
    let previous = null
    for (let round = 0; round < 6; round++) {
      const activity = (await suggest(cookie, previous)).json()
      seen.add(activity.title)
      previous = activity.id
    }
    return [...seen].sort()
  }
  /** @param {string} key @param {boolean} have */
  const mark = (key, have) => api.app.inject({ method: 'PUT', url: `/family/materials/${key}`, headers: { cookie }, payload: { have } })

  // Tizas start off and almohadones on. No other template is for an 8-year-old.
  assert.deepEqual(await titles(), ['Con almohadones'])
  await mark('tizas', true)
  assert.deepEqual(await titles(), ['Con almohadones', 'Con tizas'])
  await mark('almohadones', false)
  assert.deepEqual(await titles(), ['Con tizas'])
})

/** @param {string} cookie @param {string} id @param {unknown} reaction */
const react = (cookie, id, reaction) =>
  api.app.inject({ method: 'PUT', url: `/activities/${id}/reaction`, headers: { cookie }, payload: { reaction } })

test('the feedback tap saves one reaction per juego, which the parent can change or take back (JUG-23)', async () => {
  const { cookie } = await signUpAs(api, 'juan@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const activity = (await suggest(cookie)).json()

  let response = await react(cookie, activity.id, 'up')
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { id: activity.id, reaction: 'up' })
  let { rows } = await api.pool.query('select reaction, reacted_at from activities where id = $1', [activity.id])
  assert.equal(rows[0].reaction, 'up')
  assert.ok(rows[0].reacted_at)

  response = await react(cookie, activity.id, 'down')
  assert.deepEqual(response.json(), { id: activity.id, reaction: 'down' })

  response = await react(cookie, activity.id, null)
  assert.deepEqual(response.json(), { id: activity.id, reaction: null })
  ;({ rows } = await api.pool.query('select reaction, reacted_at from activities where id = $1', [activity.id]))
  assert.equal(rows[0].reaction, null)
  assert.equal(rows[0].reacted_at, null)

  assert.equal((await react(cookie, activity.id, 'meh')).statusCode, 400)
  assert.equal((await react(cookie, activity.id, undefined)).statusCode, 400)
})

test('a reaction goes only on the family own juegos', async () => {
  const { cookie } = await signUpAs(api, 'kari@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const { cookie: other } = await signUpAs(api, 'lola@example.com')
  await putFamily(api, other, EXAMPLE_PROFILE)
  const activity = (await suggest(cookie)).json()

  assert.equal((await react(other, activity.id, 'up')).statusCode, 404)
  assert.equal((await react(cookie, '00000000-0000-0000-0000-000000000000', 'up')).statusCode, 404)
  assert.equal((await react(cookie, 'not-a-uuid', 'up')).statusCode, 400)
  const noFamily = (await signUpAs(api, 'nico@example.com')).cookie
  assert.equal((await react(noFamily, activity.id, 'up')).statusCode, 409)
  assert.equal((await api.app.inject({ method: 'PUT', url: `/activities/${activity.id}/reaction`, payload: { reaction: 'up' } })).statusCode, 401)
})

test('a juego marked "No era para nosotros" stops showing up, and one about what the kid loves says so in its pick (JUG-104)', async () => {
  await catalog.addActivityTemplate(
    template({ slug: 'con-dinos', title: 'Rugidos de dinosaurio', minAgeMonths: 12, maxAgeMonths: 47, themes: ['dinosaurios'] }),
  )
  const { cookie } = await signUpAs(api, 'mati@example.com')
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, pets: [], toys: [{ name: 'el dinosaurio chiquito' }] })

  // Down the first juego the family gets that isn't the dinosaur one.
  let first = (await suggest(cookie)).json()
  while (first.title === 'Rugidos de dinosaurio') first = (await suggest(cookie, first.id)).json()
  await react(cookie, first.id, 'down')

  const titles = new Set()
  let previous = first.id
  let dinos = null
  for (let round = 0; round < 12; round++) {
    const activity = (await suggest(cookie, previous)).json()
    titles.add(activity.title)
    if (activity.title === 'Rugidos de dinosaurio') dinos = activity
    previous = activity.id
  }
  assert.ok(!titles.has(first.title), `${first.title} came back`)
  assert.ok(dinos, 'the dinosaur juego never came')
  const { rows } = await api.pool.query('select pick from activities where id = $1', [dinos.id])
  assert.deepEqual(rows[0].pick.themes, ['dinosaurios'])
  assert.equal(rows[0].pick.fit, 1 + DEFAULT_WEIGHTS.interest)
})
