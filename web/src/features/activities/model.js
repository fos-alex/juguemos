/** An activity in words, with no React. */
import { isNight, nextSwitch } from '../../shared/theme'

/** @typedef {import('./types').Activity} Activity */
/** @typedef {import('./types').Choices} Choices */
/** @typedef {import('./types').StoredChoices} StoredChoices */
/** @typedef {import('./types').Outside} Outside */
/** @typedef {import('../../shared/ui/Moments').Sky} Sky */

/** Where an activity happens, as the parent reads it. @param {Activity['place']} place */
export function placeText(place) {
  return place === 'outdoor' ? 'afuera' : 'adentro'
}

/** Nothing chosen: any juego. @type {Choices} */
const ANY = { mood: null, place: null, sound: null, category: null }

/**
 * What the next juego is for (JUG-31): the parent's own choices while they
 * hold, and otherwise the clock's, which is tranqui in the evening, so an
 * energetic game doesn't come up just before bed (JUG-26), and nothing in
 * particular the rest of the day. The evening is night mode's window, 19:00
 * to 07:00.
 * @param {{ now: Date, stored?: StoredChoices | null }} input
 * @returns {Choices}
 */
export function choicesNow({ now, stored = null }) {
  if (stored && now.getTime() < stored.until) {
    const { mood, place, sound, category } = stored
    return { mood, place, sound, category }
  }
  return { ...ANY, mood: isNight(now) ? 'calm' : null }
}

/**
 * The choices with some answers changed, or all of them taken back when
 * `change` is null. Either holds until the next switch, so tranqui comes back
 * on its own the next evening.
 * @param {Choices} choices
 * @param {Partial<Choices> | null} change
 * @param {Date} now
 * @returns {StoredChoices}
 */
export function choose(choices, change, now) {
  return { ...(change ? { ...choices, ...change } : ANY), until: nextSwitch(now) }
}

/**
 * The questions ¿Algo en especial? asks, in order, each with its answers.
 * Voice pass pending: every label here.
 * @type {{ key: keyof Choices, label: string, answers: { value: string | boolean, label: string }[] }[]}
 */
export const QUESTIONS = [
  {
    key: 'mood',
    label: '¿Cómo están?',
    answers: [
      { value: 'calm', label: 'Tranqui' },
      { value: 'lively', label: 'Con pilas' },
    ],
  },
  {
    key: 'place',
    label: '¿Dónde?',
    answers: [
      { value: 'indoor', label: 'Adentro' },
      { value: 'outdoor', label: 'Afuera' },
    ],
  },
  {
    key: 'sound',
    label: '¿Con sonido?',
    answers: [
      { value: true, label: 'Con sonido' },
      { value: false, label: 'En silencio' },
    ],
  },
  {
    key: 'category',
    label: '¿Qué tienen ganas de hacer?',
    answers: [
      { value: 'move', label: 'Moverse' },
      { value: 'create', label: 'Crear' },
      { value: 'pretend', label: 'Imaginar' },
      { value: 'explore', label: 'Explorar' },
      { value: 'learn', label: 'Aprender' },
      { value: 'helpers', label: 'Ayudar' },
    ],
  },
]

/**
 * The words of what is chosen, in the order of the questions, for the chip
 * on Home. Empty when nothing is.
 * @param {Choices} choices
 * @returns {string[]}
 */
export function choiceWords(choices) {
  return QUESTIONS.flatMap(({ key, answers }) =>
    answers.filter((answer) => answer.value === choices[key]).map((answer) => answer.label),
  )
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
