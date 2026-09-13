import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { migrate } from '../src/db/migrate.js'
import { startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi()
})
after(() => api.close())

test('running the migrations again changes nothing', async () => {
  assert.deepEqual(await migrate({ databaseUrl: api.databaseUrl }), [])
})

test('two runs at once apply nothing twice', async () => {
  const runs = await Promise.all([migrate({ databaseUrl: api.databaseUrl }), migrate({ databaseUrl: api.databaseUrl })])
  assert.deepEqual(runs, [[], []])
})
