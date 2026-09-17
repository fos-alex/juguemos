import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { buildApp } from '../src/app.js'
import { UnavailableError, UpstreamError } from '../src/errors.js'
import { INVITATION_DAYS, createInvitationsService } from '../src/invitations/invitations.service.js'
import { cookiesFrom, ORIGIN, signUpAs, startApi, testConfig } from './helpers.js'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const DAY_MS = 24 * 60 * 60 * 1000
const START = new Date('2026-09-17T15:00:00Z')

/** @type {import('../src/email/mailer.js').Email[]} */
let sent = []
/** When set, the next email fails the way the mailer does. */
let failSending = false
/** The API's clock, for when an invitation expires. */
let clock = START

/**
 * Who Google says signed in, for the next code the API exchanges.
 * @type {{ sub: string, email: string, email_verified: boolean, name: string } | null}
 */
let signedInAtGoogle = null

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
const realFetch = globalThis.fetch

before(async () => {
  // Google's token endpoint is the one call the API makes, as in google.test.js.
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url !== TOKEN_ENDPOINT) throw new Error(`unexpected request to ${url}`)
    const now = Math.floor(Date.now() / 1000)
    const payload = { iss: 'https://accounts.google.com', aud: 'client-id', iat: now, exp: now + 3600, ...signedInAtGoogle }
    const part = (/** @type {object} */ value) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const idToken = `${part({ alg: 'RS256', typ: 'JWT' })}.${part(payload)}.signature`
    const body = { access_token: 'access', expires_in: 3599, id_token: idToken, scope: 'openid email profile', token_type: 'Bearer' }
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
  }
  api = await startApi({
    admin: true,
    signupEmails: ['listed@example.com'],
    google: { clientId: 'client-id', clientSecret: 'client-secret' },
    now: () => clock,
    mailer: {
      async send(email) {
        if (failSending) throw new UpstreamError('The email service failed: ECONNECTION')
        sent.push(email)
      },
    },
  })
})
after(async () => {
  globalThis.fetch = realFetch
  await api.close()
})
beforeEach(() => {
  sent = []
  failSending = false
  clock = START
})

/** @param {string} email */
const invite = (email) => api.app.inject({ method: 'POST', url: '/admin/invitations', payload: { email } })

/** The link in an invitation email. @param {import('../src/email/mailer.js').Email} email */
function linkIn(email) {
  const href = email.text.split('\n').find((line) => line.startsWith(ORIGIN))
  assert.ok(href, 'the email has the link')
  const url = new URL(href)
  return { url, token: url.searchParams.get('token') ?? '', email: url.searchParams.get('email') ?? '' }
}

/** Invites an email and returns the link it was sent. @param {string} email */
async function linkFor(email) {
  const response = await invite(email)
  assert.equal(response.statusCode, 201)
  return linkIn(/** @type {import('../src/email/mailer.js').Email} */ (sent.at(-1)))
}

/** @param {{ token: string, email: string }} link */
const check = ({ token, email }) => api.app.inject({ method: 'POST', url: '/invitations/check', payload: { token, email } })

/** @param {string} email @param {string} [invitation] */
const signUp = (email, invitation) =>
  api.app.inject({
    method: 'POST',
    url: '/auth/sign-up/email',
    payload: { name: 'Invitada', email, password: 'una-clave-larga', ...(invitation ? { invitation } : {}) },
  })

/** @param {string} cookie */
const me = (cookie) => api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })

/**
 * The trip through Google that the invitation screen starts: the token rides
 * in `additionalData`, and a new account comes back to Bienvenida.
 * @param {NonNullable<typeof signedInAtGoogle>} person
 * @param {{ token: string, email: string }} link the invitation's
 */
async function signUpWithGoogle(person, { token, email }) {
  const started = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/social',
    headers: { origin: ORIGIN },
    payload: {
      provider: 'google',
      callbackURL: '/',
      newUserCallbackURL: '/bienvenida',
      // Where the screen started, with the link's token and email.
      errorCallbackURL: `/invitacion?${new URLSearchParams({ token, email })}`,
      additionalData: { invitation: token },
      loginHint: email,
    },
  })
  assert.equal(started.statusCode, 200)
  const state = new URL(started.json().url).searchParams.get('state')
  signedInAtGoogle = person
  return api.app.inject({
    method: 'GET',
    url: `/auth/callback/google?code=a-code&state=${state}`,
    headers: { cookie: cookiesFrom(started) },
  })
}

/** @param {string} email */
const invitationRow = async (email) =>
  (await api.pool.query('select token_hash, accepted_at, expires_at from invitations where email = $1', [email])).rows[0]

/** @param {string} email */
const userCount = async (email) => (await api.pool.query('select 1 from users where email = $1', [email])).rowCount

test('inviting an email sends it a link to the landing screen with a token and the email', async () => {
  const response = await invite('Ines@Example.com')
  assert.equal(response.statusCode, 201)
  const invitation = response.json()
  assert.deepEqual(Object.keys(invitation).sort(), ['email', 'expiresAt', 'id', 'sentAt', 'status'])
  assert.equal(invitation.email, 'ines@example.com')
  assert.equal(invitation.status, 'pending')
  assert.equal(new Date(invitation.expiresAt).getTime() - START.getTime(), INVITATION_DAYS * DAY_MS)

  assert.equal(sent.length, 1)
  const [email] = sent
  assert.equal(email.to, 'ines@example.com')
  assert.equal(email.subject, 'Te invitamos a Ludi')
  const { url, token } = linkIn(email)
  assert.equal(url.pathname, '/invitacion')
  assert.equal(url.searchParams.get('email'), 'ines@example.com')
  assert.ok(token.length >= 40)
  assert.ok(email.html?.includes(url.href.replaceAll('&', '&amp;')))

  // Only the token's hash is kept.
  const row = await invitationRow('ines@example.com')
  assert.notEqual(row.token_hash, token)
  assert.doesNotMatch(JSON.stringify(row), new RegExp(token))
})

test('inviting an email again sends a new link, and the old one stops working', async () => {
  const first = await linkFor('juana@example.com')
  const second = await linkFor('juana@example.com')
  assert.notEqual(first.token, second.token)

  assert.equal((await check(first)).json().code, 'INVITATION_NOT_FOUND')
  assert.equal((await check(second)).statusCode, 200)
  const { rowCount } = await api.pool.query('select 1 from invitations where email = $1', ['juana@example.com'])
  assert.equal(rowCount, 1)
})

test('when the email fails, nothing changes and the link sent before still works', async () => {
  const first = await linkFor('karen@example.com')
  failSending = true
  const response = await invite('karen@example.com')
  assert.equal(response.statusCode, 500)
  assert.equal((await check(first)).statusCode, 200)
})

test('an email that already has an account is not invited', async () => {
  await signUpAs(api, 'listed@example.com')
  const response = await invite('Listed@example.com')
  assert.equal(response.statusCode, 409)
  assert.equal(response.json().code, 'ALREADY_REGISTERED')
  assert.equal(sent.length, 0)
})

test('an invitation needs a valid email', async () => {
  const response = await invite('not-an-email')
  assert.equal(response.statusCode, 400)
  assert.equal(sent.length, 0)
})

test('without email nobody can be invited', async () => {
  const invitations = createInvitationsService({ db: api.db, mailer: null, appUrl: ORIGIN })
  await assert.rejects(invitations.invite('luz@example.com'), (error) => error instanceof UnavailableError && error.code === 'EMAIL_OFF')
  assert.equal(await invitationRow('luz@example.com'), undefined)
})

test('the admin routes do not exist while the admin is off', async () => {
  const app = buildApp({ config: testConfig({ databaseUrl: api.databaseUrl }), db: api.db, logger: false, mailer: null })
  await app.ready()
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/admin/users' })).statusCode, 404)
    assert.equal((await app.inject({ method: 'POST', url: '/admin/invitations', payload: { email: 'x@example.com' } })).statusCode, 404)
  } finally {
    await app.close()
  }
})

test('the landing screen learns the email, and that it has no account yet', async () => {
  const link = await linkFor('mora@example.com')
  const response = await check({ token: link.token, email: 'Mora@example.com' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { email: 'mora@example.com', registered: false })
})

test('a link whose token or email was changed is not an invitation', async () => {
  const link = await linkFor('nati@example.com')
  for (const tampered of [
    { token: link.token, email: 'otra@example.com' },
    { token: `${link.token}x`, email: link.email },
  ]) {
    const response = await check(tampered)
    assert.equal(response.statusCode, 404)
    assert.equal(response.json().code, 'INVITATION_NOT_FOUND')
  }
})

test('an expired link says so, until the email has an account', async () => {
  const link = await linkFor('olga@example.com')
  clock = new Date(START.getTime() + (INVITATION_DAYS + 1) * DAY_MS)
  const expired = await check(link)
  assert.equal(expired.statusCode, 404)
  assert.equal(expired.json().code, 'INVITATION_EXPIRED')

  // An expired token doesn't let the email sign up.
  const refused = await signUp('olga@example.com', link.token)
  assert.equal(refused.statusCode, 403)
  assert.equal(refused.json().code, 'SIGNUP_NOT_ALLOWED')
})

test('signing up with the invitation creates the account with a verified email, and accepts it', async () => {
  const link = await linkFor('paula@example.com')
  const response = await signUp('paula@example.com', link.token)
  assert.equal(response.statusCode, 200)

  const { user } = (await me(cookiesFrom(response))).json()
  assert.equal(user.email, 'paula@example.com')
  assert.equal(user.emailVerified, true)
  assert.ok((await invitationRow('paula@example.com')).accepted_at)

  // The link now goes to sign in, even after it expires.
  clock = new Date(START.getTime() + (INVITATION_DAYS + 1) * DAY_MS)
  assert.deepEqual((await check(link)).json(), { email: 'paula@example.com', registered: true })
})

test('an invited email cannot sign up without its token', async () => {
  await linkFor('quela@example.com')
  const response = await signUp('quela@example.com')
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().code, 'SIGNUP_NOT_ALLOWED')
  assert.equal(await userCount('quela@example.com'), 0)
})

test('an invitation does not let another email sign up', async () => {
  const link = await linkFor('rocio@example.com')
  const response = await signUp('intrusa@example.com', link.token)
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().code, 'INVITATION_OTHER_EMAIL')
  assert.equal(await userCount('intrusa@example.com'), 0)
  assert.equal((await invitationRow('rocio@example.com')).accepted_at, null)
})

test('an invited Google account signs up verified and comes back to Bienvenida', async () => {
  const link = await linkFor('sol@example.com')
  const response = await signUpWithGoogle({ sub: 'google-sol', email: 'Sol@example.com', email_verified: true, name: 'Sol' }, link)
  assert.equal(response.statusCode, 302)
  assert.equal(response.headers.location, '/bienvenida')

  const { user } = (await me(cookiesFrom(response))).json()
  assert.equal(user.email, 'sol@example.com')
  assert.equal(user.emailVerified, true)
  assert.ok((await invitationRow('sol@example.com')).accepted_at)
})

test('a Google account with another email is sent back to the invitation, with nothing saved', async () => {
  const link = await linkFor('tami@example.com')
  const response = await signUpWithGoogle({ sub: 'google-other', email: 'otra.cuenta@example.com', email_verified: true, name: 'Tami' }, link)
  assert.equal(response.statusCode, 302)
  const location = new URL(response.headers.location ?? '', ORIGIN)
  assert.equal(location.pathname, '/invitacion')
  assert.equal(location.searchParams.get('token'), link.token)
  assert.equal(location.searchParams.get('error'), 'INVITATION_OTHER_EMAIL')
  assert.equal(await userCount('otra.cuenta@example.com'), 0)
})

test('the admin sees every account and every invitation, and no token', async () => {
  const accepted = await linkFor('ursula@example.com')
  await signUp('ursula@example.com', accepted.token)
  await linkFor('vera@example.com')
  clock = new Date(START.getTime() - (INVITATION_DAYS + 1) * DAY_MS)
  await linkFor('wanda@example.com')
  clock = START

  const response = await api.app.inject({ method: 'GET', url: '/admin/users' })
  assert.equal(response.statusCode, 200)
  const { users, invitations } = response.json()
  const statusOf = (/** @type {string} */ email) => invitations.find((/** @type {{ email: string }} */ each) => each.email === email)?.status
  assert.equal(statusOf('ursula@example.com'), 'accepted')
  assert.equal(statusOf('vera@example.com'), 'pending')
  assert.equal(statusOf('wanda@example.com'), 'expired')
  const ursula = users.find((/** @type {{ email: string }} */ user) => user.email === 'ursula@example.com')
  assert.deepEqual(Object.keys(ursula).sort(), ['createdAt', 'email', 'id', 'name'])
  assert.doesNotMatch(response.body, /token/i)
})
