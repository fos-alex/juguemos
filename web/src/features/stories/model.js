/** A story's logic, with no React. */

/**
 * The paragraphs that have arrived so far, grouped into the story's parts.
 * @param {{ part: number, text: string }[]} paragraphs
 */
export function groupByPart(paragraphs) {
  /** @type {string[][]} */
  const parts = []
  for (const { part, text } of paragraphs) (parts[part] ??= []).push(text)
  return parts.filter(Boolean)
}

/**
 * A paragraph in pieces, with the sounds the parent acts out set apart
 * (JUG-170). The text marks each one between brackets, and the brackets never
 * reach the screen.
 * @param {string} paragraph
 * @returns {{ text: string, sound: boolean }[]}
 */
export function soundPieces(paragraph) {
  return paragraph
    .split(/(\[[^[\]]+\])/)
    .filter(Boolean)
    .map((piece) => (/^\[[^[\]]+\]$/.test(piece) ? { text: piece.slice(1, -1), sound: true } : { text: piece, sound: false }))
}

/**
 * What draws while a story is written (JUG-132, JUG-160). A story is written
 * for the youngest kid playing, so its wait follows that age too: a crayon for
 * the littlest, a pencil in the middle, and a pen once they are old enough to
 * write. The bands are the API's own story bands, and an age nobody gave falls
 * where the API puts it, at three years old.
 * @param {number | null} ageMonths the age the story is written for
 * @returns {'crayon' | 'pencil' | 'pen'}
 */
export function waitingTool(ageMonths) {
  const months = ageMonths ?? 36
  if (months < 36) return 'crayon'
  if (months < 60) return 'pencil'
  return 'pen'
}

/**
 * How many episodes a series has, in words. It counts what there is to read,
 * never progress: a series is not a goal to finish.
 * @param {number} episodes
 */
export const episodesLine = (episodes) => (episodes === 1 ? '1 episodio' : `${episodes} episodios`)

/**
 * What a story request says, one row for each thing, in the order a parent
 * reads it: who is in it, where, its theme, and what happens (JUG-156). The
 * family comes first, then the characters the note asked for, all by the
 * words they were heard as. Voice pass pending.
 * @param {import('./types').StoryRequest} request
 * @returns {{ label: string, value: string }[]}
 */
export function requestRows(request) {
  const who = [...request.family, ...request.characters]
  const rows = [
    { label: 'Con', value: who.join(', ') },
    { label: 'Dónde', value: request.setting ?? '' },
    { label: 'Tema', value: request.theme ?? '' },
    // A plot that only says the summary again isn't worth a row.
    { label: 'Qué pasa', value: request.plot && !sameText(request.plot, request.summary) ? request.plot : '' },
  ]
  return rows.filter((row) => row.value)
}

/** Whether two lines say the same words, whatever the case and the final stop. @param {string} a @param {string} b */
const sameText = (a, b) => {
  const plain = (/** @type {string} */ text) => text.toLocaleLowerCase('es').replace(/[.\s]+$/, '').trim()
  return plain(a) === plain(b)
}
