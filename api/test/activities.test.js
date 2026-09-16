import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
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

  const { rows } = await api.pool.query('select title from activities where id = $1', [activity.id])
  assert.equal(rows[0].title, activity.title)
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
