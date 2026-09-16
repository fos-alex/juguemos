/**
 * Activities, against the real API. Each suggestion is also kept in the
 * local store, which is what keeps the last one readable offline.
 */
import { read, write } from '../../shared/store'
import { ApiError, request, WordedError } from '../../shared/http'

/** @typedef {import('./types').Activity} Activity */

/** Nothing in the catalog fits this family yet: a state to word plainly, not a failure. */
export class NothingFitsError extends WordedError {
  constructor() {
    // Voice pass pending.
    super('Todavía no tengo un juego que les quede bien. Estamos sumando más.')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** @param {{ after?: string | null }} [options] the activity to move on from @returns {Promise<Activity>} */
export async function suggestActivity({ after = null } = {}) {
  let activity
  try {
    // Ids cached before activities came from the API aren't the API's.
    activity = await request('POST', '/activities/suggestions', { after: after && UUID.test(after) ? after : null })
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NO_FITTING_ACTIVITY') throw new NothingFitsError()
    throw error
  }
  write('activities', { ...read('activities'), [activity.id]: activity })
  write('lastActivityId', activity.id)
  return activity
}

/**
 * Saves how a juego went, or takes the reaction back with null (JUG-23). The
 * store changes first, so the chip answers the tap, and changes back if the
 * API refuses.
 * @param {string} id
 * @param {Activity['reaction']} reaction
 */
export async function reactToActivity(id, reaction) {
  const activities = read('activities') ?? {}
  const before = activities[id]
  if (!before) return
  write('activities', { ...activities, [id]: { ...before, reaction } })
  try {
    await request('PUT', `/activities/${id}/reaction`, { reaction })
  } catch (error) {
    write('activities', { ...read('activities'), [id]: before })
    throw error
  }
}

/** Remembers the juego on screen as the last one, for Home's card. @param {string} id */
export function rememberLast(id) {
  write('lastActivityId', id)
}

/**
 * Starts the timer for an activity, from its own estimate. There is one
 * timer; starting it for another activity replaces it.
 * @param {string} activityId
 * @param {number} minutes
 */
export function startTimer(activityId, minutes) {
  write('timer', { activityId, endsAt: Date.now() + minutes * 60_000 })
}

/** Ends the timer. Nothing about it is kept. */
export function stopTimer() {
  write('timer', null)
}
