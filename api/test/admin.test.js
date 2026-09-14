import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createActivitiesService } from '../src/activities/activities.service.js'
import { buildApp } from '../src/app.js'
import { createFamiliesService } from '../src/families/families.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

const URL = '/admin/activity-templates'

/** @param {Partial<import('../src/activities/activities.service.js').ActivityTemplateInput>} overrides */
const input = (overrides) => ({
  slug: 'test',
  title: 'Juego',
  minutes: 10,
  place: 'indoor',
  minAgeMonths: 12,
  maxAgeMonths: 47,
  energy: 'medium',
  categories: ['pretend'],
  smallSpace: true,
  materials: ['un almohadón'],
  skills: [],
  safety: [],
  why: 'Porque sí.',
  needs: '{toy} y un almohadón.',
  steps: ['Jueguen con {toy}.'],
  easier: 'Más fácil.',
  harder: 'Más difícil.',
  ...overrides,
})

/** A template as the admin saves it: everything but the slug. @param {{ slug?: string }} template */
const edit = ({ slug: _slug, ...fields }) => fields

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: ['ana@example.com'], admin: true })
})
after(() => api.close())

/** No cookie: the admin has no login yet. @param {string} method @param {string} url @param {object} [payload] */
const call = (method, url, payload) =>
  api.app.inject({ method: /** @type {import('light-my-request').HTTPMethods} */ (method), url, payload })

/** @param {object} overrides */
const create = async (overrides) => {
  const response = await call('POST', URL, input(overrides))
  assert.equal(response.statusCode, 201, response.body)
  return response.json()
}

/** @type {string} */
let familyCookie
/** The next suggestion for the example family, moving on from the previous one. */
const nextTitle = (() => {
  /** @type {string | null} */
  let previous = null
  return async () => {
    if (!familyCookie) {
      familyCookie = (await signUpAs(api, 'ana@example.com')).cookie
      await putFamily(api, familyCookie, EXAMPLE_PROFILE)
    }
    const response = await api.app.inject({
      method: 'POST',
      url: '/activities/suggestions',
      headers: { cookie: familyCookie },
      payload: { after: previous },
    })
    if (response.statusCode !== 201) return response.json().code
    previous = response.json().id
    return response.json().title
  }
})()

test('the admin is not there unless ADMIN_ENABLED turns it on', async () => {
  const app = buildApp({ config: { ...api.config, admin: { enabled: false } }, db: api.db, logger: false })
  const response = await app.inject({ method: 'GET', url: URL })
  assert.equal(response.statusCode, 404)
  await app.close()
})

test('templates are created, listed, read, and edited, all without a session', async () => {
  const template = await create({ slug: 'el-cumple', title: 'El cumple de {toy}' })
  assert.equal(template.active, true)
  assert.equal(template.slug, 'el-cumple')

  const list = await call('GET', URL)
  assert.equal(list.statusCode, 200)
  assert.deepEqual(
    list.json().map((/** @type {{ slug: string }} */ each) => each.slug),
    ['el-cumple'],
  )

  const updated = await call('PUT', `${URL}/${template.id}`, { ...edit(template), title: 'Una fiesta para {toy}' })
  assert.equal(updated.statusCode, 200)
  assert.equal(updated.json().title, 'Una fiesta para {toy}')

  const read = await call('GET', `${URL}/${template.id}`)
  assert.equal(read.json().title, 'Una fiesta para {toy}')
  assert.equal(read.json().slug, 'el-cumple', 'an edit never changes the slug')
})

test('a template switched off stays out of the suggestions until it is switched back on', async () => {
  const off = await create({ slug: 'apagado', title: 'Apagado', active: false })

  // The only other template is on, so every suggestion is that one.
  for (let round = 0; round < 3; round++) assert.match(await nextTitle(), /^Una fiesta para /)

  const on = await call('PUT', `${URL}/${off.id}`, { ...edit(off), active: true })
  assert.equal(on.json().active, true)
  // The latest suggestions were all the other template, so the new one comes first.
  assert.equal(await nextTitle(), 'Apagado')
})

test('editing a template changes what comes next, never what the family already saw', async () => {
  const [before] = (await api.pool.query('select id, title from activities order by created_at desc limit 1')).rows
  const templates = (await call('GET', URL)).json()
  for (const template of templates) await call('PUT', `${URL}/${template.id}`, { ...edit(template), title: 'Nuevo título' })

  const [after] = (await api.pool.query('select title from activities where id = $1', [before.id])).rows
  assert.equal(after.title, before.title)
  assert.equal(await nextTitle(), 'Nuevo título')
})

test('a deleted template is gone for good: the catalog seed never brings it back', async () => {
  const doomed = await create({ slug: 'borrado', title: 'Borrado' })
  assert.equal((await call('DELETE', `${URL}/${doomed.id}`)).statusCode, 204)

  assert.equal((await call('GET', `${URL}/${doomed.id}`)).statusCode, 404)
  assert.equal((await call('DELETE', `${URL}/${doomed.id}`)).statusCode, 404)
  assert.ok(!(await call('GET', URL)).json().some((/** @type {{ slug: string }} */ each) => each.slug === 'borrado'))

  const activities = createActivitiesService({ db: api.db, families: createFamiliesService({ db: api.db }) })
  assert.deepEqual(await activities.addTemplate(input({ slug: 'borrado', title: 'Borrado' })), { created: false })

  const again = await call('POST', URL, input({ slug: 'borrado' }))
  assert.equal(again.statusCode, 409)
  assert.equal(again.json().code, 'SLUG_TAKEN')

  for (let round = 0; round < 4; round++) assert.notEqual(await nextTitle(), 'Borrado')
})

test('when every template is off, the family hears that nothing fits', async () => {
  const templates = (await call('GET', URL)).json()
  for (const template of templates) await call('PUT', `${URL}/${template.id}`, { ...edit(template), active: false })
  assert.equal(await nextTitle(), 'NO_FITTING_ACTIVITY')
})

test('the admin refuses what the catalog cannot hold', async () => {
  const [template] = (await call('GET', URL)).json()

  const unknownSlot = await call('POST', URL, input({ slug: 'con-perro', title: 'Con {perro}' }))
  assert.equal(unknownSlot.statusCode, 400)
  assert.equal(unknownSlot.json().code, 'UNKNOWN_SLOTS')

  const ages = await call('PUT', `${URL}/${template.id}`, { ...edit(template), minAgeMonths: 36, maxAgeMonths: 24 })
  assert.equal(ages.statusCode, 400)
  assert.equal(ages.json().code, 'AGE_RANGE')

  assert.equal((await call('POST', URL, input({ slug: 'Con Mayúsculas' }))).statusCode, 400)
  assert.equal((await call('POST', URL, input({ slug: 'sin-pasos', steps: [] }))).statusCode, 400)
  assert.equal((await call('POST', URL, input({ slug: 'otra-cosa', categories: ['cocinar'] }))).statusCode, 400)
  assert.equal((await call('GET', `${URL}/no-es-un-id`)).statusCode, 400)
  assert.equal((await call('GET', `${URL}/00000000-0000-4000-8000-000000000000`)).statusCode, 404)
})
