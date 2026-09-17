import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { cookiesFrom, ORIGIN, signUpAs, startApi } from './helpers.js'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/**
 * Who Google says signed in, for the next code the API exchanges. The API
 * reads the person from the ID token that comes with the tokens.
 * @type {{ sub: string, email: string, email_verified: boolean, name: string, picture?: string } | null}
 */
let signedInAtGoogle = null

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
const realFetch = globalThis.fetch

before(async () => {
  // Google's token endpoint is the one call the API makes: it answers with an
  // ID token for whoever `signedInAtGoogle` is. Nothing else leaves the test.
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url !== TOKEN_ENDPOINT) throw new Error(`unexpected request to ${url}`)
    const payload = { iss: 'https://accounts.google.com', aud: 'client-id', iat: seconds(), exp: seconds() + 3600, ...signedInAtGoogle }
    const body = { access_token: 'access', expires_in: 3599, id_token: unsignedJwt(payload), scope: 'openid email profile', token_type: 'Bearer' }
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
  }
  api = await startApi({
    signupEmails: ['ana@gmail.com', 'beto@gmail.com', 'carla@gmail.com', 'dani@gmail.com'],
    google: { clientId: 'client-id', clientSecret: 'client-secret' },
  })
})
after(async () => {
  globalThis.fetch = realFetch
  await api.close()
})

const seconds = () => Math.floor(Date.now() / 1000)

/** @param {object} payload */
function unsignedJwt(payload) {
  const part = (/** @type {object} */ value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(payload)}.signature`
}

/** @param {string} [errorCallbackURL] */
const startGoogle = (errorCallbackURL = '/entrada') =>
  api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/social',
    headers: { origin: ORIGIN },
    payload: { provider: 'google', callbackURL: '/', errorCallbackURL },
  })

/**
 * The whole trip: the web asks for Google's page, the parent signs in there as
 * `person`, and Google sends the browser back to the API's callback.
 * @param {NonNullable<typeof signedInAtGoogle>} person
 */
async function signInWithGoogle(person) {
  const started = await startGoogle()
  assert.equal(started.statusCode, 200)
  const state = new URL(started.json().url).searchParams.get('state')
  signedInAtGoogle = person
  return api.app.inject({
    method: 'GET',
    url: `/auth/callback/google?code=a-code&state=${state}`,
    headers: { cookie: cookiesFrom(started) },
  })
}

/** @param {string} cookie */
const me = (cookie) => api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })

/** @param {string} email */
const providersOf = async (email) => {
  const { rows } = await api.pool.query(
    'select a.provider_id from accounts a join users u on u.id = a.user_id where u.email = $1 order by a.provider_id',
    [email],
  )
  return rows.map((row) => row.provider_id)
}

test('Google is asked only for name and email', async () => {
  const url = new URL((await startGoogle()).json().url)
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  assert.deepEqual(url.searchParams.get('scope')?.split(' ').sort(), ['email', 'openid', 'profile'])
  assert.equal(url.searchParams.get('access_type'), null)
  assert.equal(url.searchParams.get('redirect_uri'), `${ORIGIN}/api/auth/callback/google`)
})

test('a listed Google account signs up with its verified email, and opens Home', async () => {
  const response = await signInWithGoogle({
    sub: 'google-ana',
    email: 'Ana@gmail.com',
    email_verified: true,
    name: 'Ana',
    picture: 'https://lh3.googleusercontent.com/ana',
  })
  assert.equal(response.statusCode, 302)
  assert.equal(response.headers.location, '/')

  const account = await me(cookiesFrom(response))
  assert.equal(account.statusCode, 200)
  const { user, family } = account.json()
  assert.equal(user.email, 'ana@gmail.com')
  assert.equal(user.name, 'Ana')
  assert.equal(user.emailVerified, true)
  assert.equal(family, null)

  // Only the name and email are kept, not the picture.
  const { rows } = await api.pool.query('select image from users where email = $1', ['ana@gmail.com'])
  assert.equal(rows[0].image, null)
  assert.deepEqual(await providersOf('ana@gmail.com'), ['google'])
})

test('a Google account outside the allowlist is sent back to the screen it came from, with nothing saved', async () => {
  const response = await signInWithGoogle({ sub: 'google-stranger', email: 'stranger@gmail.com', email_verified: true, name: 'X' })
  assert.equal(response.statusCode, 302)
  assert.equal(new URL(response.headers.location ?? '', ORIGIN).pathname, '/entrada')
  assert.equal(new URL(response.headers.location ?? '', ORIGIN).searchParams.get('error'), 'SIGNUP_NOT_ALLOWED')
  assert.doesNotMatch(cookiesFrom(response), /session_token=[^;]/)

  const { rowCount } = await api.pool.query('select 1 from users where email = $1', ['stranger@gmail.com'])
  assert.equal(rowCount, 0)
})

test('an email account links to the Google account with the same verified email', async () => {
  const { id } = await signUpAs(api, 'beto@gmail.com')
  const response = await signInWithGoogle({ sub: 'google-beto', email: 'beto@gmail.com', email_verified: true, name: 'Roberto' })
  assert.equal(response.headers.location, '/')

  const { user } = (await me(cookiesFrom(response))).json()
  assert.equal(user.id, id)
  // The name stays as the parent wrote it, and Google has verified the email.
  assert.equal(user.name, 'Alex')
  assert.equal(user.emailVerified, true)
  assert.deepEqual(await providersOf('beto@gmail.com'), ['credential', 'google'])

  // The password still works.
  const password = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/email',
    payload: { email: 'beto@gmail.com', password: 'una-clave-larga' },
  })
  assert.equal(password.statusCode, 200)
})

test('a Google email that Google has not verified does not link to an existing account', async () => {
  await signUpAs(api, 'carla@gmail.com')
  const response = await signInWithGoogle({ sub: 'google-carla', email: 'carla@gmail.com', email_verified: false, name: 'Carla' })
  assert.equal(new URL(response.headers.location ?? '', ORIGIN).searchParams.get('error'), 'account_not_linked')
  assert.deepEqual(await providersOf('carla@gmail.com'), ['credential'])
})

test('signing in with Google again comes back to the same account', async () => {
  const person = { sub: 'google-dani', email: 'dani@gmail.com', email_verified: true, name: 'Dani' }
  const first = (await me(cookiesFrom(await signInWithGoogle(person)))).json().user
  const again = (await me(cookiesFrom(await signInWithGoogle(person)))).json().user
  assert.equal(again.id, first.id)

  const { rowCount } = await api.pool.query('select 1 from users where email = $1', ['dani@gmail.com'])
  assert.equal(rowCount, 1)
})

test('a callback without a state goes to the entry, not to an error page', async () => {
  const response = await api.app.inject({ method: 'GET', url: '/auth/callback/google?code=a-code' })
  assert.equal(response.statusCode, 302)
  assert.equal(new URL(response.headers.location ?? '', ORIGIN).pathname, '/entrada')
})
