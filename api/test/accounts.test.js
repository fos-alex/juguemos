import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { cookiesFrom, inviteEmail, ORIGIN, startApi } from './helpers.js'

const PASSWORD = 'una-clave-larga'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi()
})
after(() => api.close())

/**
 * A sign-up as it reaches the API, carrying whatever invitation it was given.
 * @param {string | null} invitation
 * @param {string} email
 * @param {string} [password]
 */
const signUpWith = (invitation, email, password = PASSWORD) =>
  api.app.inject({
    method: 'POST',
    url: '/auth/sign-up/email',
    payload: { name: 'Alex', email, password, ...(invitation ? { invitation } : {}) },
  })

/** Signs up the way a parent does: with the invitation that email was sent. @param {string} email @param {string} [password] */
const signUp = async (email, password = PASSWORD) => signUpWith(await inviteEmail(api, email), email, password)

/** @param {string} email @param {string} [password] */
const signIn = (email, password = PASSWORD) =>
  api.app.inject({ method: 'POST', url: '/auth/sign-in/email', payload: { email, password } })

/** @param {string} cookie */
const me = (cookie) => api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })

test('signing up with an invitation creates the account, with its email verified, and nothing else', async () => {
  const response = await signUp('Ana@Example.com')
  assert.equal(response.statusCode, 200)

  const account = await me(cookiesFrom(response))
  assert.equal(account.statusCode, 200)
  const { user, family } = account.json()
  assert.deepEqual(Object.keys(user).sort(), ['email', 'emailVerified', 'id', 'name'])
  assert.equal(user.email, 'ana@example.com')
  // The link came to that address, so following it verified it (JUG-34).
  assert.equal(user.emailVerified, true)
  assert.equal(family, null)
})

test('nobody can sign up without an invitation', async () => {
  const response = await signUpWith(null, 'stranger@example.com')
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().code, 'SIGNUP_NOT_ALLOWED')

  const { rowCount } = await api.pool.query('select 1 from users where email = $1', ['stranger@example.com'])
  assert.equal(rowCount, 0)
})

test('the same email cannot sign up twice', async () => {
  const invitation = await inviteEmail(api, 'beto@example.com')
  assert.equal((await signUpWith(invitation, 'beto@example.com')).statusCode, 200)
  const again = await signUpWith(invitation, 'beto@example.com')
  assert.equal(again.statusCode, 422)
  assert.equal(again.json().code, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')

  const { rowCount } = await api.pool.query('select 1 from users where email = $1', ['beto@example.com'])
  assert.equal(rowCount, 1)
})

test('signing in comes back to the same account', async () => {
  const signedUp = await me(cookiesFrom(await signUp('carla@example.com')))
  const response = await signIn('carla@example.com')
  assert.equal(response.statusCode, 200)

  const signedIn = await me(cookiesFrom(response))
  assert.equal(signedIn.json().user.id, signedUp.json().user.id)
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

test('a session lasts 30 days', async () => {
  const response = await signUp('fede@example.com')
  const session = [response.headers['set-cookie'] ?? []].flat().find((cookie) => cookie.includes('session_token='))
  assert.match(session ?? '', /Max-Age=2592000/)
})

test('/me needs a session', async () => {
  const response = await api.app.inject({ method: 'GET', url: '/me' })
  assert.equal(response.statusCode, 401)
})

test('without a Google client, signing in with Google says the provider is missing', async () => {
  const response = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/social',
    headers: { origin: ORIGIN },
    payload: { provider: 'google', callbackURL: '/' },
  })
  assert.equal(response.statusCode, 404)
  assert.equal(response.json().code, 'PROVIDER_NOT_FOUND')
})
