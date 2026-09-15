import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startApi } from './helpers.js'

const TAILSCALE = 'https://omarchy.tailnet.ts.net:8443'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: ['uno@example.com', 'dos@example.com'], trustedOrigins: [TAILSCALE] })
})
after(() => api.close())

/** @param {string} email @param {string} origin */
const signUpFrom = (email, origin) =>
  api.app.inject({
    method: 'POST',
    url: '/auth/sign-up/email',
    headers: { origin },
    payload: { name: 'Alex', email, password: 'una-clave-larga' },
  })

test('a listed origin, such as the phone over Tailscale, can sign up', async () => {
  const response = await signUpFrom('uno@example.com', TAILSCALE)
  assert.equal(response.statusCode, 200)
})

test('an origin that is not listed is refused', async () => {
  const response = await signUpFrom('dos@example.com', 'https://elsewhere.example.com')
  assert.equal(response.statusCode, 403)
})
