/**
 * The casting draw (JUG-139). Before the model is asked for anything, code
 * decides who a story is about: whether the anchor kid is in it, who leads,
 * whether the pet and a toy are in, and which of the family's interests is
 * the theme. Every decision is one random number compared to one weight, and
 * both the numbers and the weights are kept on the casting, so an audit row
 * is enough to replay a draw and to tell whether the weights need moving.
 *
 * Pure: it takes the random function it uses, so a test with a seeded one
 * gets the same screen every time.
 */
import { anchorOf } from './storytelling.js'

/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {{ type: 'kid' | 'pet' | 'toy' | 'new', id: string | null, name: string }} Lead */
/**
 * @typedef {object} Weights
 * @property {number} anchorIn how often the anchor kid is in the story
 * @property {number} anchorLead how often the anchor leads it, when in
 * @property {number} petIn how often the pet is in, when the family has one
 * @property {number} toyIn how often a toy is in, when the family has any
 * @property {number} themeIn how often a family interest is the theme
 * @property {number} wildcard how often one option of a screen is a wildcard
 * @property {number} recentPenalty what a toy or a theme used lately weighs
 */
/**
 * @typedef {object} Draws the random numbers each decision came from, null
 *   for a decision the family's profile never offered
 * @property {number | null} anchorIn
 * @property {number | null} anchorLead
 * @property {number | null} petIn
 * @property {number | null} toyIn
 * @property {number | null} themeIn
 * @property {number | null} wildcard one draw for the whole screen
 */
/**
 * @typedef {object} Casting who one story is about
 * @property {'cast' | 'wildcard' | 'keyword'} kind a wildcard drops the family's
 *   props and asks the model to invent the setting or a secondary character; a
 *   keyword casting is one the parent asked for by tapping an interest
 * @property {boolean} anchorIn
 * @property {Lead} lead
 * @property {string[]} kids the ids of the kids in the story
 * @property {{ id: string, name: string } | null} pet
 * @property {{ id: string, name: string } | null} toy
 * @property {string | null} theme one of the family's interests, as typed
 * @property {Draws} draws
 * @property {Weights} weights
 */

/** The weights a screen is drawn with until a family has its own. @type {Weights} */
export const DEFAULT_WEIGHTS = {
  anchorIn: 0.85,
  anchorLead: 0.6,
  petIn: 0.5,
  toyIn: 0.6,
  themeIn: 0.7,
  wildcard: 0.5,
  recentPenalty: 0.3,
}

/** What the model is told to invent when nobody from the family can lead. */
const NEW_CHARACTER = 'un personaje nuevo'

/** How many times a lead that another option already has is drawn again. */
const LEAD_TRIES = 4

/**
 * The castings for one screen of options, each different from the others:
 * different leads while the family has enough of them, and toys and themes
 * drawn without replacement while there are enough to go round. One draw per
 * screen decides whether one of them — chosen uniformly — is a wildcard.
 * @param {Profile} profile the kids playing, with the pets, toys and interests
 * @param {{ count: number, weights?: Weights, random: () => number, recent?: (Casting | null)[] }} options
 *   `recent` is the castings of the family's last stories, whose toys and
 *   themes weigh less; `random` is the only source of chance.
 * @returns {Casting[]}
 */
export function castScreen(profile, { count, weights = DEFAULT_WEIGHTS, random, recent = [] }) {
  const recentToys = new Set(recent.map((casting) => casting?.toy?.id).filter(Boolean))
  const recentThemes = new Set(recent.map((casting) => casting?.theme).filter(Boolean))
  const usedToys = new Set()
  const usedThemes = new Set()
  const usedLeads = new Set()

  const castings = []
  for (let index = 0; index < count; index += 1) {
    castings.push(castOne(profile, { weights, random, recentToys, recentThemes, usedToys, usedThemes, usedLeads }))
  }

  // One draw for the screen: when it hits, one option steps outside the
  // family's props altogether, to see how often that one gets chosen.
  const wildcard = random()
  const wild = wildcard < weights.wildcard ? Math.min(castings.length - 1, Math.floor(random() * castings.length)) : -1
  return castings.map((casting, index) => ({
    ...(index === wild ? wildcardOf(casting, profile) : casting),
    draws: { ...casting.draws, wildcard },
  }))
}

/**
 * The casting of a story the parent asked for by tapping one of the family's
 * interests (JUG-140). It is drawn like any other, except that the theme is
 * the keyword they tapped and the story is never a wildcard: they already
 * said what they want the story to be about.
 * @param {Profile} profile
 * @param {{ keyword: string, weights?: Weights, random: () => number }} options
 * @returns {Casting}
 */
export function castKeyword(profile, { keyword, weights = DEFAULT_WEIGHTS, random }) {
  const casting = castOne(profile, {
    weights,
    random,
    recentToys: new Set(),
    recentThemes: new Set(),
    usedToys: new Set(),
    usedThemes: new Set(),
    usedLeads: new Set(),
    theme: keyword,
  })
  return { ...casting, kind: 'keyword' }
}

/**
 * The same casting without the family's props: the kids star as they were
 * drawn, and the model invents the rest. A pet or a toy that was leading
 * hands the lead back to the kids, since they are all that is left.
 * @param {Casting} casting
 * @param {Profile} profile
 * @returns {Casting}
 */
function wildcardOf(casting, profile) {
  const stillIn = casting.lead.type === 'kid' && casting.kids.includes(/** @type {string} */ (casting.lead.id))
  const first = profile.kids.find((kid) => kid.id === casting.kids[0])
  const lead = stillIn
    ? casting.lead
    : first
      ? /** @type {Lead} */ ({ type: 'kid', id: first.id, name: first.name })
      : /** @type {Lead} */ ({ type: 'new', id: null, name: NEW_CHARACTER })
  return { ...casting, kind: 'wildcard', lead, pet: null, toy: null, theme: null }
}

/**
 * One casting, drawn in a fixed order so a seeded random gives a fixed
 * answer: the anchor, the lead, the pet, the toy, and the theme.
 * @param {Profile} profile
 * @param {{
 *   weights: Weights,
 *   random: () => number,
 *   recentToys: Set<unknown>,
 *   recentThemes: Set<unknown>,
 *   usedToys: Set<string>,
 *   usedThemes: Set<string>,
 *   usedLeads: Set<string>,
 *   theme?: string | null,
 * }} screen `theme` is the theme the story must have, when the parent chose it
 *   instead of the draw
 * @returns {Casting}
 */
function castOne(profile, { weights, random, recentToys, recentThemes, usedToys, usedThemes, usedLeads, theme: fixed = null }) {
  const { anchor } = anchorOf(profile)
  /** @type {Draws} */
  const draws = { anchorIn: null, anchorLead: null, petIn: null, toyIn: null, themeIn: null, wildcard: null }

  if (anchor) draws.anchorIn = random()
  const anchorIn = anchor != null && /** @type {number} */ (draws.anchorIn) < weights.anchorIn
  if (anchorIn) draws.anchorLead = random()

  const others = profile.kids.filter((kid) => kid.id !== anchor?.id)
  const kids = anchorIn ? profile.kids : others

  /** @type {{ id: string, name: string } | null} */
  let pet = null
  if (profile.pets.length > 0) {
    draws.petIn = random()
    if (draws.petIn < weights.petIn) pet = { id: profile.pets[0].id, name: profile.pets[0].name }
  }

  /** @type {{ id: string, name: string } | null} */
  let toy = null
  if (profile.toys.length > 0) {
    draws.toyIn = random()
    if (draws.toyIn < weights.toyIn) {
      const pool = fresh(profile.toys, usedToys, (item) => item.id)
      const picked = weightedPick(pool, (item) => (recentToys.has(item.id) ? weights.recentPenalty : 1), random)
      usedToys.add(picked.id)
      toy = { id: picked.id, name: picked.name }
    }
  }

  /** @type {string | null} */
  let theme = fixed
  if (!theme && profile.interests.length > 0) {
    draws.themeIn = random()
    if (draws.themeIn < weights.themeIn) {
      const pool = fresh(profile.interests, usedThemes, (item) => item)
      theme = weightedPick(pool, (item) => (recentThemes.has(item) ? weights.recentPenalty : 1), random)
      usedThemes.add(theme)
    }
  }

  // The anchor leads when the draw says so, and also when nobody else can.
  // An anchor that already led another option on this screen steps aside, so
  // the three options don't all open with the same name.
  /** @type {Lead[]} */
  const pool = [
    ...others.map((kid) => /** @type {Lead} */ ({ type: 'kid', id: kid.id, name: kid.name })),
    ...(pet ? [/** @type {Lead} */ ({ type: 'pet', id: pet.id, name: pet.name })] : []),
    ...(toy ? [/** @type {Lead} */ ({ type: 'toy', id: toy.id, name: toy.name })] : []),
  ]
  const anchorLead = anchor ? /** @type {Lead} */ ({ type: 'kid', id: anchor.id, name: anchor.name }) : null
  const anchorWins = anchorIn && (/** @type {number} */ (draws.anchorLead) < weights.anchorLead || pool.length === 0)
  /** @type {Lead} */
  let lead
  if (anchorLead && anchorWins && (pool.length === 0 || !usedLeads.has(keyOf(anchorLead)))) {
    lead = anchorLead
  } else if (pool.length > 0) {
    lead = pickLead(pool, usedLeads, random)
  } else {
    // The anchor is out and there is nobody else: the model invents the lead.
    lead = { type: 'new', id: null, name: NEW_CHARACTER }
  }
  usedLeads.add(keyOf(lead))

  return {
    kind: 'cast',
    anchorIn,
    lead,
    kids: kids.map((kid) => kid.id),
    pet,
    toy,
    theme,
    draws,
    weights,
  }
}

/** A lead nobody else on the screen has, if a few draws find one. @param {Lead[]} pool @param {Set<string>} used @param {() => number} random */
function pickLead(pool, used, random) {
  let lead = pool[0]
  for (let tries = 0; tries < LEAD_TRIES; tries += 1) {
    lead = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
    if (!used.has(keyOf(lead))) return lead
  }
  return lead
}

/** @param {Lead} lead */
const keyOf = (lead) => `${lead.type}:${lead.id ?? lead.name}`

/**
 * What is left to draw from: whatever this screen hasn't used yet, or all of
 * it again once the family's own list has run out.
 * @template T
 * @param {T[]} items
 * @param {Set<string>} used
 * @param {(item: T) => string} keyOf
 */
function fresh(items, used, keyOf) {
  const left = items.filter((item) => !used.has(keyOf(item)))
  return left.length > 0 ? left : items
}

/**
 * One of the items, each as likely as its weight.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} weightOf
 * @param {() => number} random
 * @returns {T}
 */
function weightedPick(items, weightOf, random) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0)
  let ticket = random() * total
  for (const item of items) {
    ticket -= weightOf(item)
    if (ticket < 0) return item
  }
  return items[items.length - 1]
}

/**
 * The casting as the prompt says it, in Spanish and built by code, so the
 * model is told who is in the story instead of choosing for itself. Names are
 * exactly as the family typed them.
 * @param {Casting} casting
 * @param {Profile} profile
 * @returns {string}
 */
export function castingLines(casting, profile) {
  const named = new Map(profile.kids.map((kid) => [kid.id, kid.name]))
  const rest = casting.kids
    .filter((id) => !(casting.lead.type === 'kid' && id === casting.lead.id))
    .map((id) => named.get(id))
    .filter(Boolean)
  const props = [
    ...(casting.pet && casting.lead.id !== casting.pet.id ? [casting.pet.name] : []),
    ...(casting.toy && casting.lead.id !== casting.toy.id ? [casting.toy.name] : []),
  ]

  const sentences = []
  if (casting.kind === 'wildcard') {
    sentences.push('Reparto libre: inventá el escenario o un personaje secundario nuevo que la familia no mencionó.')
  }
  sentences.push(`Protagonista: ${casting.lead.name}.`)
  const also = [...rest, ...props]
  if (also.length > 0) sentences.push(`También aparecen: ${also.join(', ')}.`)
  if (casting.theme) sentences.push(`Tema: ${casting.theme}.`)

  const missing = []
  if (!casting.pet) missing.push('sin mascota')
  if (!casting.toy) missing.push('sin juguetes')
  if (!casting.theme) missing.push(casting.kind === 'wildcard' ? 'sin tema de la familia' : 'sin tema fijo')
  if (missing.length > 0) {
    const line = missing.join(', ')
    sentences.push(`${line[0].toUpperCase()}${line.slice(1)}.`)
  }
  return sentences.join(' ')
}
