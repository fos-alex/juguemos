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
