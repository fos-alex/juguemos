/**
 * The clock every domain reads. The families are in Buenos Aires and the
 * server may be anywhere (UTC in Docker), so the hour is always read there.
 */

const hourInBuenosAires = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: 'numeric',
  hourCycle: 'h23',
})

/** @typedef {'calm' | 'lively'} Mood */

/**
 * The moment the family is in: calm from 19:00 to 07:00, the window night
 * mode uses too, and lively the rest of the day. A story follows it
 * (JUG-139) and so does a juego (JUG-26), so an energetic game doesn't come
 * up just before bed. The child's own routine arrives with the fuller data
 * model and replaces the clock.
 * @param {Date} now
 * @returns {Mood}
 */
export function moodAt(now) {
  const hour = Number(hourInBuenosAires.format(now))
  return hour >= 19 || hour < 7 ? 'calm' : 'lively'
}
