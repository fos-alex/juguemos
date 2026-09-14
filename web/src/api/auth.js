/**
 * The account, against the real API (Better Auth under /api/auth). The session
 * lives in an httpOnly cookie; the store keeps only what the screens show.
 */
import { clearAll, write } from '../lib/store'
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
  clearAll(['demo'])
  post('/sign-out', {}).catch(() => {})
}
