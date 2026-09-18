/**
 * Lo que jugamos (JUG-188), against the real API. The last history the API
 * sent is kept in the store, so the screen opens with it offline and while
 * the API answers.
 */
import { write } from '../../shared/store'
import { request } from '../../shared/http'

/** @typedef {import('./types').History} History */

/**
 * The juegos the family played and the stories they read in the last month.
 * @returns {Promise<History>}
 */
export async function loadHistory() {
  /** @type {History} */
  const history = await request('GET', '/history')
  write('history', history)
  return history
}
