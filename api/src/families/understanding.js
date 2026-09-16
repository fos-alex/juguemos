/**
 * Reading a family from the parent's own words (JUG-11). The LLM reads the
 * text and proposes a profile, and this module checks what came back before
 * the parent sees it. Nothing is saved here: the parent confirms the card or
 * corrects the form, and only then does PUT /family save the family.
 *
 * The parent's text never goes into a log or an error message, and the
 * model's answer can repeat it, so errors leave that out too. It is stored
 * only in audit_transcripts, while AUDIT_TRANSCRIPTS is on (JUG-116).
 */
import { UnavailableError, UpstreamError } from '../errors.js'
import { jsonIn } from '../llm/prompt.js'
import familyPrompt from './prompts/family.js'

/** How long the model gets before the parent is asked to try again. */
const TIMEOUT_MS = 60_000

/** The limits PUT /family accepts, so a confirmed card always saves. */
const LIMITS = { kids: 12, pets: 10, interests: 30, toys: 200, name: 80, toy: 120, note: 300 }

/** The fields the review card can flag. */
const FIELD = /^(kids\.\d+|pet|interests|toys)$/

/** Shown when this module flags a field and the model gave no note. Voice pass pending. */
const CHECK_NOTE = 'Revisá lo marcado: no lo encontré tal cual en lo que escribiste.'

/**
 * @typedef {object} Understanding
 * @property {{ kids: { name: string, ageMonths: number | null, interests: string[] }[], pets: { name: string }[], toys: { name: string }[] }} family
 *   a profile for the parent to confirm, not saved. Each kid has their age in
 *   months (JUG-145) and what the text says they love, plus what it doesn't tie
 *   to one kid (JUG-144).
 * @property {string[]} unsure fields the parent should check: 'kids.0', 'pet', 'interests', 'toys'
 * @property {string | null} note one line saying what may be wrong
 */
/** @typedef {ReturnType<typeof createUnderstanding>} UnderstandingService */

/**
 * @param {{ llm: import('../llm/client.js').Llm | null, audit: import('../audit/audit.service.js').AuditService }} deps
 */
export function createUnderstanding({ llm, audit }) {
  return {
    /** Whether an LLM can read a family's text. Without one, first run starts at the form. */
    available: Boolean(llm),

    /**
     * The text goes into the audit trail first, so a reading that fails is
     * recorded too.
     * @param {string} text the parent's own words
     * @param {{ userId: string, familyId: string | null }} sender who sent it, for the audit trail
     * @returns {Promise<Understanding>}
     */
    async understand(text, { userId, familyId }) {
      await audit.recordTranscript({ userId, familyId, source: 'family_text', text })
      if (!llm) throw new UnavailableError('No LLM is configured to read a family', 'LLM_OFF')
      let answer = ''
      const signal = AbortSignal.timeout(TIMEOUT_MS)
      for await (const piece of llm.stream({ system: familyPrompt, user: text, signal })) answer += piece
      const understood = readUnderstanding(answer, text)
      if (!understood) throw new UpstreamError('The model answered with no readable family')
      return understood
    },
  }
}

/**
 * Reads the model's JSON and holds it to the rules: names spelled as the
 * parent wrote them, a flag on any kid or pet the text doesn't name, and the
 * model's own doubts kept. Returns null when there is no JSON to read.
 * @param {string} answer the model's reply
 * @param {string} text the parent's words
 * @returns {Understanding | null}
 */
export function readUnderstanding(answer, text) {
  const parsed = jsonIn(answer)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const doubts = new Set(listOf(parsed.unsure).filter((field) => typeof field === 'string' && FIELD.test(field)))
  /** @type {Set<string>} */
  const unsure = new Set([...doubts].filter((field) => !field.startsWith('kids.')))
  let flaggedHere = false

  /** @type {Understanding['family']['kids']} */
  const kids = []
  listOf(parsed.kids).forEach((kid, index) => {
    const found = asWritten(kid?.name, text)
    const name = (found ?? cleanText(kid?.name)).slice(0, LIMITS.name)
    if (!name || kids.length === LIMITS.kids) return
    // A name the text doesn't contain was changed or invented: the parent checks it.
    if (!found) flaggedHere = true
    if (!found || doubts.has(`kids.${index}`)) unsure.add(`kids.${kids.length}`)
    kids.push({ name, ageMonths: monthsOf(kid?.ageMonths), interests: wordsOf(kid?.interests, text, LIMITS.name) })
  })

  // What the text doesn't tie to one kid goes on every kid (JUG-144).
  const shared = wordsOf(parsed.interests, text, LIMITS.name)
  for (const kid of kids) kid.interests = [...new Set([...kid.interests, ...shared])].slice(0, LIMITS.interests)

  /** @type {Understanding['family']['pets']} */
  const pets = []
  for (const pet of listOf(parsed.pets)) {
    const found = asWritten(pet?.name, text)
    const name = (found ?? cleanText(pet?.name)).slice(0, LIMITS.name)
    if (!name || pets.length === LIMITS.pets) continue
    if (!found) {
      flaggedHere = true
      unsure.add('pet')
    }
    pets.push({ name })
  }
  // The card shows one pet in 0.1, so a second one is flagged for the parent to check.
  if (pets.length > 1) unsure.add('pet')

  const toys = wordsOf(parsed.toys, text, LIMITS.toy)
    .slice(0, LIMITS.toys)
    .map((name) => ({ name }))

  const modelNote = cleanText(parsed.note).slice(0, LIMITS.note) || null
  const note = unsure.size === 0 ? null : (modelNote ?? (flaggedHere ? CHECK_NOTE : null))
  return { family: { kids, pets, toys }, unsure: [...unsure], note }
}

/**
 * The value as the parent spelled it: the matching stretch of their text,
 * found regardless of case. Null when the text doesn't contain it.
 * @param {unknown} value
 * @param {string} text
 */
function asWritten(value, text) {
  const wanted = cleanText(value)
  if (!wanted) return null
  const at = text.toLocaleLowerCase('es').indexOf(wanted.toLocaleLowerCase('es'))
  return at >= 0 ? text.slice(at, at + wanted.length) : null
}

/**
 * A list of words, each as the parent spelled it when the text has it, without repeats.
 * @param {unknown} values
 * @param {string} text
 * @param {number} maxLength
 */
function wordsOf(values, text, maxLength) {
  const words = listOf(values).map((value) => (asWritten(value, text) ?? cleanText(value)).slice(0, maxLength))
  return [...new Set(words.filter(Boolean))]
}

/** An age in whole months from 0 to 215 (17 years and 11 months), or null. @param {unknown} age */
function monthsOf(age) {
  const months = Math.floor(Number(age))
  return age !== null && age !== '' && Number.isFinite(months) && months >= 0 && months <= 215 ? months : null
}

/** @param {unknown} value */
const cleanText = (value) => (typeof value === 'string' ? value.trim() : '')

/** @param {unknown} value @returns {any[]} */
const listOf = (value) => (Array.isArray(value) ? value : [])
