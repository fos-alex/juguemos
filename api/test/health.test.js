import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi()
})
after(() => api.close())

test('health reports the database as up', async () => {
  const response = await api.app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok', db: 'up' })
})

test('an unknown route is a 404', async () => {
  const response = await api.app.inject({ method: 'GET', url: '/nope' })
  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.json(), { error: 'not found' })
})
