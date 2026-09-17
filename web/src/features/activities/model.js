/** An activity in words, with no React. */
import { isNight, nextSwitch } from '../../shared/theme'

/** @typedef {import('./types').Activity} Activity */
/** @typedef {import('./types').Mood} Mood */
/** @typedef {import('./types').MoodChoice} MoodChoice */

/** Where an activity happens, as the parent reads it. @param {Activity['place']} place */
export function placeText(place) {
  return place === 'outdoor' ? 'afuera' : 'adentro'
}

/**
 * The moment the next juego is for (JUG-26): tranqui in the evening, so an
 * energetic game doesn't come up just before bed, unless the parent's own tap
 * still holds. The rest of the day Ludi asks for nothing in particular, which
 * is `null`. The evening is night mode's window, 19:00 to 07:00.
 * @param {{ now: Date, choice?: MoodChoice | null }} input
 * @returns {Mood | null}
 */
export function moodNow({ now, choice = null }) {
  if (choice && now.getTime() < choice.until) return choice.mood
  return isNight(now) ? 'calm' : null
}

/**
 * A tap on Tranqui or Con pilas, which holds until the next switch, so
 * tranqui comes back on its own the next evening.
 * @param {Mood} mood
 * @param {Date} now
 * @returns {MoodChoice}
 */
export function chooseMood(mood, now) {
  return { mood, until: nextSwitch(now) }
}
