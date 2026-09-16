import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { MATERIALS } from '../src/materials/materials.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com', 'dani@example.com'] })
})
after(() => api.close())

/** @param {string} email */
async function adultWithFamily(email) {
  const { cookie } = await signUpAs(api, email)
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  /** @param {'GET' | 'PUT'} method @param {string} url @param {object} [payload] */
  const call = (method, url, payload) => api.app.inject({ method, url, headers: { cookie }, payload })
  return { cookie, call }
}

/** @typedef {{ key: string, label: string, have: boolean }} Material */

/** Every material in a GET, by key. @param {{ categories: { materials: Material[] }[] }} body */
const byKey = (body) => new Map(body.categories.flatMap((category) => category.materials).map((material) => [material.key, material]))

test('materials come by category, and a family that has said nothing has the common ones', async () => {
  const { call } = await adultWithFamily('ana@example.com')
  const response = await call('GET', '/family/materials')
  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.ok(body.categories.every((/** @type {{ label: string, materials: Material[] }} */ c) => c.label && c.materials.length > 0))

  const materials = byKey(body)
  assert.equal(materials.size, MATERIALS.length)
  for (const { key, common } of MATERIALS) assert.equal(materials.get(key)?.have, common, key)
})

test('a tap saves one material, and the answer holds, including one that matches the default', async () => {
  const { call } = await adultWithFamily('beto@example.com')

  const on = await call('PUT', '/family/materials/tizas', { have: true })
  assert.equal(on.statusCode, 200)
  assert.deepEqual(on.json(), { key: 'tizas', label: 'tizas', have: true })
  assert.equal((await call('PUT', '/family/materials/almohadones', { have: false })).statusCode, 200)
  assert.equal((await call('PUT', '/family/materials/almohadones', { have: true })).statusCode, 200)
  assert.equal((await call('PUT', '/family/materials/cinta', { have: false })).statusCode, 200)

  const materials = byKey((await call('GET', '/family/materials')).json())
  assert.equal(materials.get('tizas')?.have, true)
  assert.equal(materials.get('almohadones')?.have, true)
  assert.equal(materials.get('cinta')?.have, false)

  const { rows } = await api.pool.query('select material, have from household_materials order by material')
  assert.deepEqual(rows, [
    { material: 'almohadones', have: true },
    { material: 'cinta', have: false },
    { material: 'tizas', have: true },
  ])
})

test('only materials on the list can be marked, and only with a yes or a no', async () => {
  const { call } = await adultWithFamily('carla@example.com')
  assert.equal((await call('PUT', '/family/materials/un-avion', { have: true })).statusCode, 400)
  assert.equal((await call('PUT', '/family/materials/tizas', { have: 'sí' })).statusCode, 400)
  assert.equal((await call('PUT', '/family/materials/tizas', {})).statusCode, 400)
})

test('materials need a session and a family', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/family/materials' })).statusCode, 401)
  const { cookie } = await signUpAs(api, 'dani@example.com')
  const headers = { cookie }
  assert.equal((await api.app.inject({ method: 'GET', url: '/family/materials', headers })).statusCode, 409)
  assert.equal(
    (await api.app.inject({ method: 'PUT', url: '/family/materials/tizas', headers, payload: { have: true } })).statusCode,
    409,
  )
})
