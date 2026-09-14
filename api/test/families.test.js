import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createFamiliesService } from '../src/families/families.service.js'
import { cookiesFrom, startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {import('../src/families/families.service.js').FamiliesService} */
let families
before(async () => {
  api = await startApi({ signupEmails: ['ana@example.com', 'beto@example.com'] })
  families = createFamiliesService({ db: api.db })
})
after(() => api.close())

/** Signs up and returns the new user's id and session cookie. @param {string} email */
async function signUp(email) {
  const response = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-up/email',
    payload: { name: 'Alex', email, password: 'una-clave-larga' },
  })
  return { id: response.json().user.id, cookie: cookiesFrom(response) }
}

test('a family is created with its first member, and /me shows it', async () => {
  const user = await signUp('ana@example.com')
  const family = await families.create(user.id, { name: 'Los Pérez' })

  assert.deepEqual(await families.familyOf(user.id), family)
  const account = await api.app.inject({ method: 'GET', url: '/me', headers: { cookie: user.cookie } })
  assert.deepEqual(account.json().family, { id: family.id, name: 'Los Pérez' })
})

test('an adult already in a family cannot start another, and nothing is left behind', async () => {
  const user = await signUp('beto@example.com')
  await families.create(user.id)
  const { rows: before } = await api.db.query('select count(*)::int as n from families')

  await assert.rejects(families.create(user.id), { code: '23505' })
  const { rows: after } = await api.db.query('select count(*)::int as n from families')
  assert.equal(after[0].n, before[0].n)
})
