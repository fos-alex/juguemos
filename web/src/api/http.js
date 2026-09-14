/**
 * Every call to the Juguemos API goes through `request`: JSON in and out,
 * with the session cookie, and failures turned into errors the screens know
 * how to word. The /demo switches (offline, slow, fail the next request)
 * apply here, so those states stay reviewable against the real API.
 */
import { demoSettings, updateDemo } from '../lib/demo'

export class OfflineError extends Error {}

/** A request the API answered with an error, with its status and code when it sent one. */
export class ApiError extends Error {
  /** @param {string} message @param {number} status @param {string} [code] */
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const SLOW_MS = 7500

/**
 * @param {'GET' | 'POST' | 'PUT'} method
 * @param {string} path under /api
 * @param {unknown} [body]
 */
export async function request(method, path, body) {
  const demo = demoSettings()
  if (!navigator.onLine || demo.offline) throw new OfflineError('Sin conexión')
  if (demo.slow) await new Promise((resolve) => setTimeout(resolve, SLOW_MS))
  if (demo.failNext) {
    updateDemo({ failNext: false })
    throw new ApiError('Falla simulada', 0)
  }

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
    throw new ApiError(data?.message ?? data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  return data
}
