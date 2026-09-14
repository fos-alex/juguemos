import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createAuth } from '../src/auth/auth.js'
import { seed } from '../src/db/seed.js'
import { createFamiliesService } from '../src/families/families.service.js'
import { cookiesFrom, startApi } from './helpers.js'

/** @type {import('../seeds/development.js').SeedAccount[]} */
const accounts = [
  { name: 'Prueba', email: 'prueba@example.com', password: 'una-clave-larga', family: { name: 'Familia de prueba' } },
  { name: 'Sola', email: 'sola@example.com', password: 'una-clave-larga' },
]

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: accounts.map(({ email }) => email) })
})
after(() => api.close())

const runSeed = () =>
  seed({
    auth: createAuth({ config: api.config.auth, db: api.db }),
    families: createFamiliesService({ db: api.db }),
    accounts,
  })

test('seeding twice creates each account and family once', async () => {
  await runSeed()
  await runSeed()

  const { rows } = await api.db.query(
    `select u.email, f.name as family
     from users u
     left join family_members m on m.user_id = u.id
     left join families f on f.id = m.family_id
     order by u.email`,
  )
  assert.deepEqual(rows, [
    { email: 'prueba@example.com', family: 'Familia de prueba' },
    { email: 'sola@example.com', family: null },
  ])
})

test('a seeded account signs in with its password', async () => {
  await runSeed()
  const response = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/email',
    payload: { email: 'prueba@example.com', password: 'una-clave-larga' },
  })
  assert.equal(response.statusCode, 200)

  const account = await api.app.inject({ method: 'GET', url: '/me', headers: { cookie: cookiesFrom(response) } })
  assert.equal(account.json().family.name, 'Familia de prueba')
})
