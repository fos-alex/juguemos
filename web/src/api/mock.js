/**
 * What the API can't do yet: Google sign-in (0.3) and email verification,
 * which needs an email sender. Each function is async and shaped like the
 * endpoint it stands in for, with a realistic delay.
 */
import { demoSettings, updateDemo } from '../lib/demo'
import { read, write } from '../lib/store'
import { AccountError } from './auth'
import { OfflineError } from './http'

export class WrongCodeError extends Error {}

/** A code that the mock always rejects, to show the wrong-code state. */
export const WRONG_CODE = '000000'

const SLOW_MS = 7500

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function respond(ms) {
  if (!navigator.onLine || demoSettings().offline) throw new OfflineError('Sin conexión')
  await wait(demoSettings().slow ? SLOW_MS : ms)
  if (demoSettings().failNext) {
    updateDemo({ failNext: false })
    throw new Error('Falla simulada')
  }
}

/** Sign in with Google arrives in 0.3; until then the button says so. Voice pass pending. */
export async function continueWithGoogle() {
  await respond(600)
  throw new AccountError('Entrar con Google llega pronto. Por ahora, usá tu email.')
}

/** @param {string} code */
export async function verifyEmail(code) {
  await respond(700)
  if (code === WRONG_CODE) throw new WrongCodeError('Código incorrecto')
  write('account', { ...read('account'), emailVerified: true })
}

export async function resendCode() {
  await respond(500)
}
