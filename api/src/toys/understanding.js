/**
 * Reading toys from the parent's own words (JUG-147). The LLM reads the
 * text and proposes toy candidates, and this module checks what came back
 * before the parent sees them. Nothing is saved here: the parent confirms
 * each candidate, and only then does POST /family/toys save it.
 *
 * The parent's text never goes into a log or an error message, and the
 * model's answer can repeat it, so errors leave that out too.
 */
import { UnavailableError, UpstreamError } from '../errors.js'
import { jsonIn } from '../llm/prompt.js'
import toysPrompt from './prompts/toys.js'

/** How long the model gets before the parent is asked to try again. */
const TIMEOUT_MS = 60_000

const LIMITS = { toys: 20, name: 120, description: 500 }

/**
 * @typedef {object} ToysUnderstanding
 * @property {{ name: string, description: string | null }[]} toys candidates for the parent to confirm, not saved
 */
/** @typedef {ReturnType<typeof createToysUnderstanding>} ToysUnderstandingService */

/** @param {{ llm: import('../llm/client.js').Llm | null }} deps */
export function createToysUnderstanding({ llm }) {
  return {
    /** Whether an LLM can read a toy description. */
    available: Boolean(llm),

    /**
     * @param {string} text the parent's own words
     * @returns {Promise<ToysUnderstanding>}
     */
    async understand(text) {
      if (!llm) throw new UnavailableError('No LLM is configured to read toys', 'LLM_OFF')
      let answer = ''
      const signal = AbortSignal.timeout(TIMEOUT_MS)
      for await (const piece of llm.stream({ system: toysPrompt, user: text, signal })) answer += piece
      const understood = readToysUnderstanding(answer, text)
      if (!understood) throw new UpstreamError('The model answered with no readable toys')
      return understood
    },
  }
}

/**
 * Reads the model's JSON and holds it to the rules: names spelled as the
 * parent wrote them, descriptions only from the text. Null when no JSON.
 * @param {string} answer the model's reply
 * @param {string} text the parent's words
 * @returns {ToysUnderstanding | null}
 */
export function readToysUnderstanding(answer, text) {
  const parsed = jsonIn(answer)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (!Array.isArray(parsed.toys)) return { toys: [] }

  const seen = new Set()
  /** @type {ToysUnderstanding['toys']} */
  const toys = []
  for (const toy of parsed.toys) {
    if (toys.length >= LIMITS.toys) break
    const name = (asWritten(toy?.name, text) ?? cleanText(toy?.name)).slice(0, LIMITS.name)
    if (!name) continue
    const key = name.toLocaleLowerCase('es')
    if (seen.has(key)) continue
    seen.add(key)
    const description = cleanText(toy?.description).slice(0, LIMITS.description) || null
    toys.push({ name, description })
  }
  return { toys }
}

/**
 * The value as the parent spelled it, found regardless of case.
 * @param {unknown} value
 * @param {string} text
 */
function asWritten(value, text) {
  const wanted = cleanText(value)
  if (!wanted) return null
  const at = text.toLocaleLowerCase('es').indexOf(wanted.toLocaleLowerCase('es'))
  return at >= 0 ? text.slice(at, at + wanted.length) : null
}

/** @param {unknown} value */
const cleanText = (value) => (typeof value === 'string' ? value.trim() : '')
