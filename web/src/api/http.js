/**
 * Every call to the Juguemos API goes through `request`: JSON in and out,
 * with the session cookie, and failures turned into errors the screens know
 * how to word. A 401 means the session ended, and the device forgets it.
 */
import { clearAll, read, write } from '../lib/store'

export class OfflineError extends Error {}

/**
 * The API no longer knows this device's session: forget the device's copy. If
 * the device was signed in, mark the session as ended, so the guard sends the
 * parent to sign in again rather than to the entry.
 */
export function endSession() {
  const wasSignedIn = read('account') !== null
  clearAll()
  if (wasSignedIn) write('sessionEnded', true)
}

/** A request the API answered with an error, with its status and code when it sent one. */
export class ApiError extends Error {
  /** @param {string} message @param {number} status @param {string} [code] */
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * @param {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method
 * @param {string} path under /api
 * @param {unknown} [body]
 */
export async function request(method, path, body) {
  if (!navigator.onLine) throw new OfflineError('Sin conexión')

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new OfflineError('Sin conexión')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Under /auth a 401 is a wrong password, not an ended session.
    if (response.status === 401 && !path.startsWith('/auth/')) endSession()
    throw new ApiError(data?.message ?? data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  return data
}
