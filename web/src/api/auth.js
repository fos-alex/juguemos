/**
 * The account, against the real API (Better Auth under /api/auth). The session
 * lives in an httpOnly cookie; the store keeps only what the screens show.
 * Email verification is still mocked in ./mock, and Google arrives in 0.3.
 */
import { clearAll, read, write } from '../lib/store'
import { loadFamily } from './family'
import { ApiError, request } from './http'

/** @typedef {import('./types').Account} Account */

/** A failure the parent can fix, with the words to tell them. */
export class AccountError extends Error {}

/** Account copy still needs a voice pass. */
const MESSAGES = {
  USER_ALREADY_EXISTS: 'Ya hay una cuenta con ese email. Probá entrar.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya hay una cuenta con ese email. Probá entrar.',
  INVALID_EMAIL_OR_PASSWORD: 'El email o la contraseña no coinciden.',
  INVALID_EMAIL: 'Revisá el email: parece que le falta algo.',
  PASSWORD_TOO_SHORT: 'Tiene que tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'Esa contraseña es demasiado larga.',
  SIGNUP_NOT_ALLOWED: 'Por ahora Juguemos es solo por invitación.',
}

/** How long a session check stands before the next navigation asks again. */
const RECHECK_MS = 5 * 60_000
/** On a weak signal the check gives up after this, and the device's copy stands. */
const CHECK_TIMEOUT_MS = 3000

/** @type {{ at: number, account: Promise<Account | null> } | null} */
let lastCheck = null

/** @param {string} path @param {object} body */
async function post(path, body) {
  try {
    return await request('POST', `/auth${path}`, body)
  } catch (error) {
    const message = error instanceof ApiError && error.code ? MESSAGES[error.code] : undefined
    throw message ? new AccountError(message) : error
  }
}

/** @param {{ name: string, email: string, emailVerified: boolean }} user */
function remember(user) {
  /** @type {Account} */
  const account = { name: user.name, email: user.email, provider: 'email', emailVerified: user.emailVerified }
  write('account', account)
  lastCheck = { at: Date.now(), account: Promise.resolve(account) }
  return account
}

/** @param {{ name: string, email: string, password: string }} input @returns {Promise<Account>} */
export async function createAccount(input) {
  const { user } = await post('/sign-up/email', input)
  return remember(user)
}

/** Signs in and brings the account's family into this browser. @param {{ email: string, password: string }} input @returns {Promise<Account>} */
export async function signIn(input) {
  const { user } = await post('/sign-in/email', input)
  await loadFamily()
  return remember(user)
}

/** Forgets the device's copy at once; the server session ends in the background. */
export function signOut() {
  clearAll()
  lastCheck = { at: Date.now(), account: Promise.resolve(null) }
  post('/sign-out', {}).catch(() => {})
}

/**
 * The signed-in account, confirmed with the API at most every few minutes.
 * Each confirmation also keeps the session alive. When the API says there is
 * no session, the device signs out. With no answer (offline, a weak signal,
 * or our own failure) the device's copy stands, so the last juego stays
 * readable in the plaza.
 * @returns {Promise<Account | null>}
 */
export function ensureSession() {
  if (!lastCheck || Date.now() - lastCheck.at > RECHECK_MS) {
    lastCheck = { at: Date.now(), account: checkSession() }
  }
  return lastCheck.account
}

/** @returns {Promise<Account | null>} */
async function checkSession() {
  if (!navigator.onLine) return read('account')
  try {
    const response = await fetch('/api/me', { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })
    if (response.status === 401) {
      clearAll()
      return null
    }
    if (!response.ok) return read('account')
    const { user, family } = await response.json()
    const account = remember(user)
    // A family saved before this browser was cleared, or on another one, comes back too.
    if (family && !read('family')) await loadFamily()
    return account
  } catch {
    return read('account')
  }
}
