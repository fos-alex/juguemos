/**
 * Lo que jugamos as days (JUG-188): pure, with no React. The days are the
 * phone's own, like night mode's clock.
 */

/** @typedef {import('./types').Day} Day */
/** @typedef {import('./types').Entry} Entry */
/** @typedef {import('./types').History} History */

const WEEKDAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long' })
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })

/**
 * The juegos and stories together, one day after another, latest first.
 * @param {History} history
 * @param {Date} [now]
 * @returns {Day[]}
 */
export function historyDays(history, now = new Date()) {
  /** @type {Entry[]} */
  const entries = [
    ...history.activities.map((activity) => ({ kind: /** @type {const} */ ('activity'), at: new Date(activity.playedAt), activity })),
    ...history.stories.map((story) => ({ kind: /** @type {const} */ ('story'), at: new Date(story.readAt), story })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  /** @type {Day[]} */
  const days = []
  for (const entry of entries) {
    const key = startOfDay(entry.at).toISOString()
    const day = days.at(-1)
    if (day?.key === key) day.entries.push(entry)
    else days.push({ key, label: dayLabel(entry.at, now), entries: [entry] })
  }
  return days
}

/**
 * A day's heading: Hoy, Ayer, the weekday for the rest of the week, and the
 * date before that. Never how many days ago.
 * @param {Date} at
 * @param {Date} now
 */
export function dayLabel(at, now) {
  // Rounded, so a day an hour short or long around a clock change still counts as one.
  const ago = Math.round((startOfDay(now).getTime() - startOfDay(at).getTime()) / 86_400_000)
  if (ago <= 0) return 'Hoy'
  if (ago === 1) return 'Ayer'
  return capitalized(ago < 7 ? WEEKDAY.format(at) : DATE.format(at))
}

/** Midnight at the start of the day, on the phone's clock. @param {Date} at */
function startOfDay(at) {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate())
}

/** @param {string} text */
function capitalized(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
