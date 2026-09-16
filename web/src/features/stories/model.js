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
 * The waiting animation a story gets (JUG-132). A story is written for the
 * youngest kid playing, so its wait follows that age too: the ronda for the
 * littlest, jacarandá petals in the middle, and la rayuela once they are old
 * enough to play it. The bands are the API's own story bands, and an age
 * nobody gave falls where the API puts it, at three years old.
 * @param {number | null} ageMonths the age the story is written for
 * @returns {'ronda' | 'petals' | 'rayuela'}
 */
export function waitingVariant(ageMonths) {
  const months = ageMonths ?? 36
  if (months < 36) return 'ronda'
  if (months < 60) return 'petals'
  return 'rayuela'
}
