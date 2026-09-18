/** ¿Qué suena? in words, with no React (JUG-177). */

/** @typedef {import('../activities').Round} Round */

/**
 * The answer as the screen shows it and the phone says it: "¡Una vaca!". The
 * family's own words keep their spelling, with only the first letter raised,
 * as a slot that opens a sentence does.
 * @param {Round} round
 */
export function answerLine(round) {
  const words = round.options[round.answer]
  return `¡${words.charAt(0).toLocaleUpperCase('es')}${words.slice(1)}!`
}

/**
 * Who recorded a sound, for the licenses that ask for it.
 * @param {NonNullable<Round['credit']>} credit
 */
export function creditLine(credit) {
  return `Sonido de ${credit.author}, ${credit.license}, en ${credit.source}.`
}
