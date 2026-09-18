/**
 * Activities, against the real API. Each suggestion is also kept in the
 * local store, which is what keeps the last one readable offline.
 */
import { chooseMood, moodNow } from './model'
import { read, write } from '../../shared/store'
import { ApiError, request, WordedError } from '../../shared/http'

/** @typedef {import('./types').Activity} Activity */
/** @typedef {import('./types').Mood} Mood */
/** @typedef {import('./types').Outside} Outside */

/** Nothing in the catalog fits this family yet: a state to word plainly, not a failure. */
export class NothingFitsError extends WordedError {
  constructor() {
    // Voice pass pending.
    super('Todavía no tengo un juego que les quede bien. Estamos sumando más.')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The next juego, for the moment the family is in (JUG-26). Every way of
 * asking goes through here, so Otro juego carries the same moment as the tap
 * on Home.
 * @param {{ after?: string | null }} [options] the activity to move on from
 * @returns {Promise<Activity>}
 */
export async function suggestActivity({ after = null } = {}) {
  let activity
  try {
    // Ids cached before activities came from the API aren't the API's.
    activity = await request('POST', '/activities/suggestions', {
      after: after && UUID.test(after) ? after : null,
      mood: activityMood(),
    })
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

/**
 * One of the family's juegos, to play it again from the history (JUG-188):
 * the copy this device kept, or the API's, which is kept from then on.
 * @param {string} id
 * @returns {Promise<Activity>}
 */
export async function findActivity(id) {
  const cached = read('activities')?.[id]
  if (cached) return cached
  /** @type {Activity} */
  const activity = await request('GET', `/activities/${id}`)
  write('activities', { ...read('activities'), [id]: activity })
  return activity
}

/**
 * Tells the API the parent started a juego (JUG-188), which puts it in the
 * family's history. Nothing waits on it: a failure, offline included, only
 * leaves this play out of the history.
 * @param {string} id
 */
export function markPlayed(id) {
  if (UUID.test(id)) request('POST', `/activities/${id}/plays`).catch(() => {})
}

/**
 * How long the weather Home shows is kept, since a forecast is about the next
 * few hours and night comes on the clock. Past this Home shows none until the
 * API answers again.
 */
const OUTSIDE_KEPT_MS = 30 * 60_000

/**
 * The weather the next juego is picked for (JUG-191), kept in the store for
 * Home's corner, or null when there is none to show. An answer kept too long
 * is forgotten first, so offline Home shows no weather rather than an old one.
 */
export async function loadOutside() {
  const kept = read('outside')
  if (kept && Date.now() - kept.at > OUTSIDE_KEPT_MS) write('outside', null)
  /** @type {Outside | null} */
  const outside = await request('GET', '/activities/weather')
  write('outside', outside && { ...outside, at: Date.now() })
}

/**
 * The moment the next juego is for: the parent's own tap while it holds, and
 * the clock otherwise.
 * @param {Date} [now]
 * @returns {Mood | null}
 */
export function activityMood(now = new Date()) {
  return moodNow({ now, choice: read('activityMood') })
}

/** Saves a tap on Tranqui or Con pilas, until the next switch. @param {Mood} mood */
export function chooseActivityMood(mood) {
  write('activityMood', chooseMood(mood, new Date()))
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
