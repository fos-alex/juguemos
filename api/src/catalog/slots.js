/**
 * Template slots: placeholders in catalog text that code fills from the
 * family profile. Templates can use {kid}, {pet}, {toy}, {toy2}, {toy3}, and
 * {interest}; anything else is refused when a template is added.
 *
 * Values are the family's words exactly as typed. Only two things change
 * around them: "de el" and "a el" contract to "del" and "al", and a value
 * that opens a sentence gets a capital letter.
 */

/** @typedef {import('../families/families.service.js').Profile} Profile */
/**
 * @typedef {{ kid: string, pet?: string, toy?: string, toy2?: string, toy3?: string, interest?: string }} Fill
 */
/** @typedef {{ texts: string[], minAgeMonths: number, maxAgeMonths: number }} Slotted */

export const SLOTS = ['kid', 'pet', 'toy', 'toy2', 'toy3', 'interest']

const PLACEHOLDER = /\{([^{}]*)\}/g
const TOY_SLOTS = ['toy', 'toy2', 'toy3']
// What comes right before a value that opens a sentence.
const SENTENCE_OPENING = /(?:^\s*|[.!?…]\s+|[¡¿—]\s*)$/

/** Every placeholder these texts use. @param {string[]} texts */
export function placeholdersIn(texts) {
  /** @type {Set<string>} */
  const found = new Set()
  for (const text of texts) for (const [, name] of text.matchAll(PLACEHOLDER)) found.add(name)
  return found
}

/** Placeholders that aren't slots. @param {string[]} texts */
export function unknownPlaceholders(texts) {
  return [...placeholdersIn(texts)].filter((name) => !SLOTS.includes(name))
}

/**
 * Whether a kid's age overlaps a range in months. Knowing only the years, a
 * kid of 2 is anywhere from 24 to 35 months; a kid whose age isn't known fits
 * any range.
 * @param {{ age: number | null }} kid
 * @param {{ minAgeMonths: number, maxAgeMonths: number }} range
 */
export function fitsAge(kid, { minAgeMonths, maxAgeMonths }) {
  if (kid.age == null) return true
  return kid.age * 12 <= maxAgeMonths && kid.age * 12 + 11 >= minAgeMonths
}

/**
 * The values for a template's slots, or null when the family can't fill them:
 * no kid in the age range, or no pet, enough toys, or an interest where the
 * template needs one. Choices are drawn from `random`, so a seeded random
 * always fills the same way. `everyKid` asks that every kid fits the age
 * range, not just one: an activity's safety rules hold only within its range.
 * @param {Profile} profile
 * @param {Slotted} template
 * @param {() => number} random
 * @param {{ everyKid?: boolean }} [options]
 * @returns {Fill | null}
 */
export function fillFor(profile, template, random, { everyKid = false } = {}) {
  const used = placeholdersIn(template.texts)
  const kid = profile.kids.find((candidate) => fitsAge(candidate, template))
  if (!kid) return null
  if (everyKid && !profile.kids.every((candidate) => fitsAge(candidate, template))) return null

  const toysNeeded = TOY_SLOTS.findLastIndex((slot) => used.has(slot)) + 1
  if (profile.toys.length < toysNeeded) return null
  if (used.has('pet') && profile.pets.length === 0) return null
  if (used.has('interest') && profile.interests.length === 0) return null

  const toys = shuffle(
    profile.toys.map((toy) => toy.name),
    random,
  )
  return {
    kid: kid.name,
    pet: profile.pets[0]?.name,
    toy: toys[0],
    toy2: toys[1],
    toy3: toys[2],
    interest: shuffle(profile.interests, random)[0],
  }
}

/**
 * Fills a text's slots. A value that opens a sentence is capitalized, except
 * at the very start when `keepStart` is set: those texts start lowercase so a
 * toy's name keeps the family's spelling, and the layout capitalizes them.
 * @param {string} text
 * @param {Fill} fill
 * @param {{ keepStart?: boolean }} [options]
 */
export function render(text, fill, { keepStart = false } = {}) {
  const filled = text.replace(PLACEHOLDER, (_match, name, offset) => {
    const value = fill[/** @type {keyof Fill} */ (name)]
    if (value == null) throw new Error(`No value for {${name}}`)
    const opensSentence = offset === 0 ? !keepStart : SENTENCE_OPENING.test(text.slice(0, offset))
    return opensSentence ? capitalize(value) : value
  })
  return contract(filled)
}

/**
 * A deterministic random in [0, 1), seeded from a string: mulberry32 over an
 * FNV-1a hash. The same seed always gives the same sequence.
 * @param {string} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619)
  let state = hash >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @template T
 * @param {T[]} items
 * @param {() => number} random
 * @returns {T[]}
 */
export function shuffle(items, random) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

/** @param {string} value */
function capitalize(value) {
  return value.charAt(0).toLocaleUpperCase('es') + value.slice(1)
}

/** "de el" and "a el" become "del" and "al", as Spanish requires. @param {string} text */
function contract(text) {
  return text.replace(/(?<!\p{L})([Dd])e el(?!\p{L})/gu, '$1el').replace(/(?<!\p{L})([Aa]) el(?!\p{L})/gu, '$1l')
}
