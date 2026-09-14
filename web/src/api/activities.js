/**
 * Activities, against the real API. Each suggestion is also kept in the
 * local store, which is what keeps the last one readable offline.
 */
import { read, write } from '../lib/store'
import { request } from './http'

/** @typedef {import('./types').Activity} Activity */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** @param {{ after?: string | null }} [options] the activity to move on from @returns {Promise<Activity>} */
export async function suggestActivity({ after = null } = {}) {
  // Ids cached before activities came from the API aren't the API's.
  const activity = await request('POST', '/activities/suggestions', { after: after && UUID.test(after) ? after : null })
  write('activities', { ...read('activities'), [activity.id]: activity })
  write('lastActivityId', activity.id)
  return activity
}
