import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { cookiesFrom, ORIGIN, startApi } from './helpers.js'

const PASSWORD = 'una-clave-larga'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({
    signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com', 'dani@example.com', 'eva@example.com'],
  })
})
after(() => api.close())

/** @param {string} email @param {string} [password] */
const signUp = (email, password = PASSWORD) =>
  api.app.inject({ method: 'POST', url: '/auth/sign-up/email', payload: { name: 'Alex', email, password } })

/** @param {string} email @param {string} [password] */
const signIn = (email, password = PASSWORD) =>
  api.app.inject({ method: 'POST', url: '/auth/sign-in/email', payload: { email, password } })

/** @param {string} cookie */
const me = (cookie) => api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })

test('signing up with an allowed email starts a family', async () => {
  const response = await signUp('Ana@Example.com')
  assert.equal(response.statusCode, 200)

  const account = await me(cookiesFrom(response))
  assert.equal(account.statusCode, 200)
  const { user, family } = account.json()
  assert.deepEqual(Object.keys(user).sort(), ['email', 'emailVerified', 'id', 'name'])
  assert.equal(user.email, 'ana@example.com')
  assert.equal(user.emailVerified, false)
  assert.match(family.id, UUID)
  assert.equal(family.name, null)
})

test('an email outside the allowlist cannot sign up', async () => {
  const response = await signUp('stranger@example.com')
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().code, 'SIGNUP_NOT_ALLOWED')

  const { rowCount } = await api.db.query('select 1 from users where email = $1', ['stranger@example.com'])
  assert.equal(rowCount, 0)
})

test('the same email cannot sign up twice', async () => {
  assert.equal((await signUp('beto@example.com')).statusCode, 200)
  const again = await signUp('beto@example.com')
  assert.equal(again.statusCode, 422)
  assert.equal(again.json().code, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')

  const { rows } = await api.db.query(
    `select count(*)::int as families from family_members m join users u on u.id = m.user_id where u.email = $1`,
    ['beto@example.com'],
  )
  assert.equal(rows[0].families, 1)
})

test('signing in comes back to the same family', async () => {
  const signedUp = await me(cookiesFrom(await signUp('carla@example.com')))
  const response = await signIn('carla@example.com')
  assert.equal(response.statusCode, 200)

  const signedIn = await me(cookiesFrom(response))
  assert.equal(signedIn.json().family.id, signedUp.json().family.id)
})

test('a wrong password is refused', async () => {
  await signUp('dani@example.com')
  const response = await signIn('dani@example.com', 'otra-clave-cualquiera')
  assert.equal(response.statusCode, 401)
  assert.equal(response.json().code, 'INVALID_EMAIL_OR_PASSWORD')
})

test('signing out ends the session', async () => {
  const cookie = cookiesFrom(await signUp('eva@example.com'))
  const response = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-out',
    headers: { cookie, origin: ORIGIN },
    payload: {},
  })
  assert.equal(response.statusCode, 200)
  assert.equal((await me(cookie)).statusCode, 401)
})

test('/me needs a session', async () => {
  const response = await api.app.inject({ method: 'GET', url: '/me' })
  assert.equal(response.statusCode, 401)
})
