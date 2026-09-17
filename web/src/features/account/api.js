/**
 * The account, against the real API (Better Auth under /api/auth). The session
 * lives in an httpOnly cookie; the store keeps only what the screens show.
 * Email verification is still mocked in ./mock.
 */
import { clearAll, read, write } from '../../shared/store'
import { loadFamily } from '../family'
import { ApiError, endSession, request, WordedError } from '../../shared/http'

/** @typedef {import('./types').Account} Account */

/** A failure the parent can fix, with the words to tell them. */
export class AccountError extends WordedError {}

/** Account copy still needs a voice pass. */
const MESSAGES = {
  USER_ALREADY_EXISTS: 'Ya hay una cuenta con ese email. Probá entrar.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya hay una cuenta con ese email. Probá entrar.',
  INVALID_EMAIL_OR_PASSWORD: 'El email o la contraseña no coinciden.',
  INVALID_EMAIL: 'Revisá el email: parece que le falta algo.',
  PASSWORD_TOO_SHORT: 'Tiene que tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'Esa contraseña es demasiado larga.',
  SIGNUP_NOT_ALLOWED: 'Por ahora Ludi es solo por invitación.',
  PROVIDER_NOT_FOUND: 'Entrar con Google todavía no está disponible.',
  // Google says the email isn't verified, so it can't join the account that has it.
  account_not_linked: 'Ya hay una cuenta con ese email. Entrá con tu contraseña.',
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

/**
 * @param {{ name: string, email: string, emailVerified: boolean }} user
 * @param {boolean} [familyFromText] from /me; kept from the device's copy when not given
 */
function remember(user, familyFromText = read('account')?.familyFromText) {
  /** @type {Account} */
  const account = { name: user.name, email: user.email, emailVerified: user.emailVerified, familyFromText }
  write('account', account)
  write('sessionEnded', null)
  lastCheck = { at: Date.now(), account: Promise.resolve(account) }
  return account
}

/** @param {{ name: string, email: string, password: string }} input @returns {Promise<Account>} */
export async function createAccount(input) {
  const { user } = await post('/sign-up/email', input)
  const account = remember(user)
  // The next navigation asks /me, which says where the family starts.
  lastCheck = null
  return account
}

/** Signs in and brings the account's family into this browser. @param {{ email: string, password: string }} input @returns {Promise<Account>} */
export async function signIn(input) {
  const { user } = await post('/sign-in/email', input)
  await loadFamily()
  const account = remember(user)
  lastCheck = null
  return account
}

/**
 * Leaves the app for Google's sign-in page. Google sends the parent back
 * through the API, which starts the session and opens Home, or Bienvenida for
 * an account it has just created (JUG-173). The guard confirms the session
 * there as on any first load. When it fails, the parent comes back to
 * `returnTo` with the failure's code in `?error=`, for `googleFailure()`.
 * Signing in and creating an account are the same trip.
 * @param {string} returnTo the path of the screen the parent tapped it on
 */
export async function signInWithGoogle(returnTo) {
  const { url } = await post('/sign-in/social', {
    provider: 'google',
    callbackURL: '/',
    newUserCallbackURL: '/bienvenida',
    errorCallbackURL: returnTo,
  })
  window.location.assign(url)
}

/**
 * The words for the code a failed Google sign-in came back with, or null when
 * there is nothing to say: no code, or the parent chose not to go on at Google.
 * @param {string | undefined} code
 */
export function googleFailure(code) {
  if (!code || code === 'access_denied') return null
  return MESSAGES[code] ?? 'No pudimos entrar con Google. Probá de nuevo.'
}

/**
 * Ends the session on the server, then forgets the device's copy. It waits for
 * the API because the session cookie is httpOnly: only the server can end it,
 * and a device that forgot early would be signed back in by the next check.
 * Offline, or when the API fails, it throws and the parent stays signed in.
 */
export async function signOut() {
  try {
    await post('/sign-out', {})
  } catch (error) {
    // A refusal means there was no session left to end.
    if (!(error instanceof ApiError && error.status < 500)) throw error
  }
  clearAll()
  lastCheck = { at: Date.now(), account: Promise.resolve(null) }
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
  // A 401 from any call clears the store between checks, and that counts too.
  return lastCheck.account.then((account) => (account && read('account') ? account : null))
}

/** @returns {Promise<Account | null>} */
async function checkSession() {
  if (!navigator.onLine) return read('account')
  try {
    const response = await fetch('/api/me', { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })
    if (response.status === 401) {
      endSession()
      return null
    }
    if (!response.ok) return read('account')
    const { user, family, familyFromText } = await response.json()
    const account = remember(user, familyFromText)
    // A family saved before this browser was cleared, or on another one, comes back too.
    if (family && !read('family')) await loadFamily()
    return account
  } catch {
    return read('account')
  }
}
