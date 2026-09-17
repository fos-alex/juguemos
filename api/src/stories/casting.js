/**
 * The casting draw (JUG-139). Before the model is asked for anything, code
 * decides who a story is about. A screen has two options, each with its own
 * role: the classic one, where the anchor kid leads and a family interest may
 * be the theme, and a new one that asks the model for a place, a character, or
 * a situation the family hasn't heard yet. In the new one, whether the kids
 * are in and whether a kid leads are drawn too, so the kid doesn't star in
 * every story (JUG-161). In both, whether the pet and a toy are in is drawn.
 * Every decision is one random number compared to one weight, and both the
 * numbers and the weights are kept on the casting, so an audit row is enough
 * to replay a draw and to tell whether the weights need moving.
 *
 * Pure: it takes the random function it uses, so a test with a seeded one
 * gets the same screen every time.
 */
import { anchorOf } from './storytelling.js'

/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {{ type: 'kid' | 'pet' | 'toy' | 'new', id: string | null, name: string }} Lead */
/**
 * @typedef {object} Weights
 * @property {number} petIn how often the pet is in, when the family has one
 * @property {number} toyIn how often a toy is in, when the family has any
 * @property {number} themeIn how often a family interest is the theme of the classic option
 * @property {number} kidsIn how often the kids playing are in the new option
 * @property {number} kidLeads how often one of them leads the new option, when they are in
 * @property {number} recentPenalty what a toy or a theme used lately weighs
 */
/**
 * @typedef {object} Draws the random numbers each decision came from, null
 *   for a decision the family's profile or the option's role never offered
 * @property {number | null} petIn
 * @property {number | null} toyIn
 * @property {number | null} themeIn
 * @property {number | null} kidsIn
 * @property {number | null} kidLeads
 * @property {number | null} lead which of those who can lead the new option does
 */
/**
 * @typedef {object} Casting who one story is about
 * @property {'cast' | 'wildcard' | 'keyword' | 'request'} kind `cast` is the
 *   classic option, led by the anchor kid; `wildcard` is the new one, which
 *   asks the model to invent a place, a character, or a situation; a keyword
 *   casting is one the parent asked for by tapping an interest, and a request
 *   casting one they asked for in a voice note
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
  petIn: 0.5,
  toyIn: 0.6,
  themeIn: 0.7,
  kidsIn: 0.6,
  kidLeads: 0.35,
  recentPenalty: 0.3,
}

/** What the model is told to invent when nobody from the family can lead. */
const NEW_CHARACTER = 'un personaje nuevo'

/** No decision drawn yet. @returns {Draws} */
const noDraws = () => ({ petIn: null, toyIn: null, themeIn: null, kidsIn: null, kidLeads: null, lead: null })

/**
 * The two castings of a screen, in the order they are shown: the classic
 * option, then the new one. The two never get
 * the same toy while the family has more than one, and a toy or a theme from
 * the family's last stories weighs less.
 * @param {Profile} profile the kids playing, with the pets, toys and interests
 * @param {{ weights?: Weights, random: () => number, recent?: (Casting | null)[] }} options
 *   `recent` is the castings of the family's last stories; `random` is the
 *   only source of chance.
 * @returns {[Casting, Casting]}
 */
export function castScreen(profile, { weights = DEFAULT_WEIGHTS, random, recent = [] }) {
  const screen = {
    weights,
    random,
    recentToys: new Set(recent.map((casting) => casting?.toy?.id).filter(Boolean)),
    recentThemes: new Set(recent.map((casting) => casting?.theme).filter(Boolean)),
    usedToys: new Set(),
  }
  return [castClassic(profile, screen), castNew(profile, screen)]
}

/**
 * The casting of a story the parent asked for by tapping one of the family's
 * interests (JUG-140): the classic option, with the keyword they tapped as its
 * theme.
 * @param {Profile} profile
 * @param {{ keyword: string, weights?: Weights, random: () => number }} options
 * @returns {Casting}
 */
export function castKeyword(profile, { keyword, weights = DEFAULT_WEIGHTS, random }) {
  const screen = { weights, random, recentToys: new Set(), recentThemes: new Set(), usedToys: new Set() }
  return { ...castClassic(profile, { ...screen, theme: keyword }), kind: 'keyword' }
}

/**
 * The casting of a story the parent asked for in a voice note (JUG-156).
 * Nothing is drawn: the parent said who is in it. The kids it names are in
 * it, or every kid in the profile when it names none, and the first pet and
 * the first toy it names come along. The lead is whoever it names first from
 * the family, or else the first character it asks for, or else the youngest
 * kid. Its theme is the request's own.
 * @param {Profile} profile the kids the story is for, with the pets and toys
 * @param {import('./requests.js').StoryRequest} request
 * @returns {Casting}
 */
export function castRequest(profile, request) {
  /** @type {Lead[]} */
  const named = []
  for (const name of request.family) {
    const kid = profile.kids.find((each) => each.name === name)
    const pet = profile.pets.find((each) => each.name === name)
    const toy = profile.toys.find((each) => each.name === name)
    if (kid) named.push({ type: 'kid', id: kid.id, name: kid.name })
    else if (pet) named.push({ type: 'pet', id: pet.id, name: pet.name })
    else if (toy) named.push({ type: 'toy', id: toy.id, name: toy.name })
  }
  const namedKids = named.filter((lead) => lead.type === 'kid').map((lead) => /** @type {string} */ (lead.id))
  const pet = named.find((lead) => lead.type === 'pet')
  const toy = named.find((lead) => lead.type === 'toy')
  const { anchor } = anchorOf(profile)

  /** @type {Lead} */
  let lead
  if (named.length > 0) lead = named[0]
  else if (request.characters.length > 0) lead = { type: 'new', id: null, name: request.characters[0] }
  else if (anchor) lead = { type: 'kid', id: anchor.id, name: anchor.name }
  else lead = { type: 'new', id: null, name: NEW_CHARACTER }

  const kids = namedKids.length > 0 ? namedKids : profile.kids.map((kid) => kid.id)
  return {
    kind: 'request',
    anchorIn: anchor != null && kids.includes(anchor.id),
    lead,
    kids,
    pet: pet ? { id: /** @type {string} */ (pet.id), name: pet.name } : null,
    toy: toy ? { id: /** @type {string} */ (toy.id), name: toy.name } : null,
    theme: request.theme,
    draws: noDraws(),
    weights: DEFAULT_WEIGHTS,
  }
}

/**
 * The casting of a story that was never drawn one: a plot from before castings
 * existed, or a template story a family is turning into a series. Everybody
 * plays, so the story still knows who it is about.
 * @param {Profile} profile
 * @returns {Casting}
 */
export function castEveryone(profile) {
  const lead = profile.kids[0]
  return {
    kind: 'cast',
    anchorIn: true,
    lead: lead ? { type: 'kid', id: lead.id, name: lead.name } : { type: 'new', id: null, name: NEW_CHARACTER },
    kids: profile.kids.map((kid) => kid.id),
    pet: profile.pets[0] ? { id: profile.pets[0].id, name: profile.pets[0].name } : null,
    toy: profile.toys[0] ? { id: profile.toys[0].id, name: profile.toys[0].name } : null,
    theme: profile.interests[0] ?? null,
    draws: noDraws(),
    weights: DEFAULT_WEIGHTS,
  }
}

/**
 * @typedef {object} Screen what the options of one screen share
 * @property {Weights} weights
 * @property {() => number} random
 * @property {Set<unknown>} recentToys
 * @property {Set<unknown>} recentThemes
 * @property {Set<string>} usedToys the toys another option of the screen already has
 * @property {string | null} [theme] the theme the story must have, when the parent chose it
 */

/**
 * The classic option: the anchor kid leads, the pet and a toy are in when
 * their draws say so, and a family interest is the theme when its draw does.
 * Drawn in a fixed order, so a seeded random gives a fixed answer.
 * @param {Profile} profile
 * @param {Screen} screen
 * @returns {Casting}
 */
function castClassic(profile, screen) {
  const { weights, random, recentThemes } = screen
  const { anchor } = anchorOf(profile)
  const draws = noDraws()
  const pet = drawPet(profile, screen, draws)
  const toy = drawToy(profile, screen, draws)

  /** @type {string | null} */
  let theme = screen.theme ?? null
  if (!theme && profile.interests.length > 0) {
    draws.themeIn = random()
    if (draws.themeIn < weights.themeIn) {
      theme = weightedPick(profile.interests, (item) => (recentThemes.has(item) ? weights.recentPenalty : 1), random)
    }
  }

  /** @type {Lead} */
  const lead = anchor
    ? { type: 'kid', id: anchor.id, name: anchor.name }
    : pet
      ? { type: 'pet', id: pet.id, name: pet.name }
      : toy
        ? { type: 'toy', id: toy.id, name: toy.name }
        : { type: 'new', id: null, name: NEW_CHARACTER }
  return { kind: 'cast', anchorIn: anchor != null, lead, kids: profile.kids.map((kid) => kid.id), pet, toy, theme, draws, weights }
}

/**
 * The new option. The pet and a toy are in when their draws say so, and so
 * are the kids playing. When the kids are in, one of them leads when that
 * draw says so; otherwise the lead is drawn evenly from the pet and the toy
 * that came in and a character the model invents. It has no family theme:
 * the model invents something the family hasn't heard. Drawn in a fixed
 * order, so a seeded random gives a fixed answer.
 * @param {Profile} profile
 * @param {Screen} screen
 * @returns {Casting}
 */
function castNew(profile, screen) {
  const { weights, random } = screen
  const draws = noDraws()
  const pet = drawPet(profile, screen, draws)
  const toy = drawToy(profile, screen, draws)

  let kidsIn = false
  if (profile.kids.length > 0) {
    draws.kidsIn = random()
    kidsIn = draws.kidsIn < weights.kidsIn
  }
  let kidLeads = false
  if (kidsIn) {
    draws.kidLeads = random()
    kidLeads = draws.kidLeads < weights.kidLeads
  }

  /** @type {Lead[]} */
  const pool = kidLeads
    ? profile.kids.map((kid) => /** @type {Lead} */ ({ type: 'kid', id: kid.id, name: kid.name }))
    : [
        ...(pet ? [/** @type {Lead} */ ({ type: 'pet', id: pet.id, name: pet.name })] : []),
        ...(toy ? [/** @type {Lead} */ ({ type: 'toy', id: toy.id, name: toy.name })] : []),
        { type: 'new', id: null, name: NEW_CHARACTER },
      ]
  draws.lead = random()
  const lead = pool[Math.min(pool.length - 1, Math.floor(draws.lead * pool.length))]
  const kids = kidsIn ? profile.kids.map((kid) => kid.id) : []
  return { kind: 'wildcard', anchorIn: kids.length > 0, lead, kids, pet, toy, theme: null, draws, weights }
}

/** The family's pet, when its draw says so. @param {Profile} profile @param {Screen} screen @param {Draws} draws */
function drawPet(profile, { weights, random }, draws) {
  if (profile.pets.length === 0) return null
  draws.petIn = random()
  return draws.petIn < weights.petIn ? { id: profile.pets[0].id, name: profile.pets[0].name } : null
}

/**
 * One of the family's toys, when its draw says so: one the screen hasn't used
 * while there is one, and one used lately less often.
 * @param {Profile} profile
 * @param {Screen} screen
 * @param {Draws} draws
 */
function drawToy(profile, { weights, random, recentToys, usedToys }, draws) {
  if (profile.toys.length === 0) return null
  draws.toyIn = random()
  if (draws.toyIn >= weights.toyIn) return null
  const left = profile.toys.filter((item) => !usedToys.has(item.id))
  const pool = left.length > 0 ? left : profile.toys
  const picked = weightedPick(pool, (item) => (recentToys.has(item.id) ? weights.recentPenalty : 1), random)
  usedToys.add(picked.id)
  return { id: picked.id, name: picked.name }
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
    sentences.push('Propuesta nueva: inventá un lugar, un personaje secundario o una situación que la familia todavía no escuchó.')
  }
  sentences.push(`Protagonista: ${casting.lead.name}.`)
  const also = [...rest, ...props]
  if (also.length > 0) sentences.push(`También aparecen: ${also.join(', ')}.`)
  if (casting.theme) sentences.push(`Tema: ${casting.theme}.`)

  const missing = []
  if (casting.kids.length === 0 && casting.lead.type !== 'kid') missing.push('sin los chicos de la familia')
  if (!casting.pet) missing.push('sin mascota')
  if (!casting.toy) missing.push('sin juguetes')
  if (!casting.theme) missing.push(casting.kind === 'wildcard' ? 'sin tema de la familia' : 'sin tema fijo')
  if (missing.length > 0) {
    const line = missing.join(', ')
    sentences.push(`${line[0].toUpperCase()}${line.slice(1)}.`)
  }
  return sentences.join(' ')
}
