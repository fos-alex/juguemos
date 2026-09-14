/**
 * Every call to the Juguemos API goes through `request`: JSON in and out,
 * with the session cookie, and failures turned into errors the screens know
 * how to word.
 */

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

/**
 * @param {'GET' | 'POST' | 'PUT'} method
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
    throw new ApiError(data?.message ?? data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  return data
}
