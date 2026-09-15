/**
 * Activities, against the real API. Each suggestion is also kept in the
 * local store, which is what keeps the last one readable offline.
 */
import { read, write } from '../shared/store'
import { ApiError, request } from '../shared/http'

/** @typedef {import('./types').Activity} Activity */

/** Nothing in the catalog fits this family yet: a state to word plainly, not a failure. */
export class NothingFitsError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** @param {{ after?: string | null }} [options] the activity to move on from @returns {Promise<Activity>} */
export async function suggestActivity({ after = null } = {}) {
  let activity
  try {
    // Ids cached before activities came from the API aren't the API's.
    activity = await request('POST', '/activities/suggestions', { after: after && UUID.test(after) ? after : null })
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NO_FITTING_ACTIVITY') throw new NothingFitsError(error.message)
    throw error
  }
  write('activities', { ...read('activities'), [activity.id]: activity })
  write('lastActivityId', activity.id)
  return activity
}
