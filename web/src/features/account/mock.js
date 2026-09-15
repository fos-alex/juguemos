/**
 * What the API can't do yet: email verification, which needs an email
 * sender. Each function is async and shaped like the endpoint it stands in
 * for, with a realistic delay.
 */
import { read, write } from '../../shared/store'
import { OfflineError } from '../../shared/http'

/** What the real verification will throw for a code that doesn't match. */
export class WrongCodeError extends Error {}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function respond(ms) {
  if (!navigator.onLine) throw new OfflineError('Sin conexión')
  await wait(ms)
}

/** @param {string} code */
export async function verifyEmail(code) {
  await respond(700)
  void code
  write('account', { ...read('account'), emailVerified: true })
}

export async function resendCode() {
  await respond(500)
}
