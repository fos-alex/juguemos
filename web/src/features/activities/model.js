/** An activity in words, with no React. */
import { isNight, nextSwitch } from '../../shared/theme'

/** @typedef {import('./types').Activity} Activity */
/** @typedef {import('./types').Mood} Mood */
/** @typedef {import('./types').MoodChoice} MoodChoice */
/** @typedef {import('./types').Outside} Outside */
/** @typedef {import('../../shared/ui/Moments').Sky} Sky */

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

/**
 * Each weather's drawing and the line a tap on it shows (JUG-191), by
 * `weather` and then `reason`. Every line says what the ranking does: fine
 * weather favours outside, poor weather keeps the juego in, and fair weather
 * changes nothing, so its lines leave the choice to the family.
 * Voice pass pending: all but Hermoso día, Día lluvioso, ¡Qué frío!, and the
 * two night lines, which are Alex's.
 * @type {Record<Outside['weather'], Partial<Record<Outside['reason'], { sky: Sky, line: string }>>>}
 */
const LOOKS = {
  fine: {
    clear: { sky: 'sun', line: 'Hermoso día para jugar afuera' },
  },
  poor: {
    storm: { sky: 'storm', line: 'Se viene una tormenta: hoy jugamos bajo techo' },
    rain: { sky: 'rain', line: 'Día lluvioso, hoy nos quedamos adentro' },
    heat: { sky: 'heat', line: 'Hace un calor bárbaro: hoy jugamos adentro, fresquitos' },
    cold: { sky: 'cold', line: '¡Qué frío! Mejor jugamos en casa' },
    wind: { sky: 'wind', line: 'Hay mucho viento: hoy jugamos adentro' },
  },
  fair: {
    grey: { sky: 'cloud', line: 'Día nublado: afuera o adentro, ustedes eligen' },
    fog: { sky: 'fog', line: 'Día de niebla, como en un cuento' },
    cold: { sky: 'cold', line: 'Está fresquito: si salen, bien abrigados' },
    heat: { sky: 'heat', line: 'Hace calor: si salen, busquen la sombra' },
    wind: { sky: 'wind', line: 'Corre un vientito: si salen, con campera' },
  },
}

/**
 * What Home's corner shows for the weather (JUG-191). At night it is the
 * moon, and the line says the juego is at home, warmly when it is cold.
 * @param {Outside} outside
 * @returns {{ sky: Sky, line: string }}
 */
export function outsideLook({ weather, reason, night }) {
  if (night) {
    return { sky: 'moon', line: reason === 'cold' ? 'De noche jugamos calentitos en casa' : 'De noche jugamos en casa' }
  }
  return LOOKS[weather]?.[reason] ?? LOOKS.fair.grey
}
