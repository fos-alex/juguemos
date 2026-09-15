/**
 * The toy box's logic, with no React: the toy form's state and how it becomes
 * a toy, noticing two toys with the same name, and a toy's line in the list.
 */

/** @typedef {import('./types').Toy} Toy */
/** @typedef {import('./types').ToyBox} ToyBox */
/** @typedef {import('../family').Kid} Kid */
/**
 * @typedef {{
 *   name: string, aliases: string[], description: string,
 *   whose: string | null, favorite: boolean, linked: string[],
 * }} FormState
 * `whose` is a kid's id, SHARED, or null when the family hasn't said.
 */

/** The id in /juguetes/nuevo, which adds a toy instead of editing one. */
export const NEW = 'nuevo'
/** `whose` for a toy that belongs to all the kids. */
export const SHARED = 'shared'

/** @type {FormState} */
export const EMPTY = { name: '', aliases: [], description: '', whose: null, favorite: false, linked: [] }

/** @param {Toy} toy @returns {FormState} */
export function toForm(toy) {
  return {
    name: toy.name,
    aliases: toy.aliases,
    description: toy.description ?? '',
    whose: toy.kidId ?? (toy.shared ? SHARED : null),
    favorite: toy.favorite,
    linked: toy.linked,
  }
}

/** @param {FormState['whose']} whose @returns {{ kidId: string | null, shared: boolean }} */
export function owner(whose) {
  if (whose === SHARED) return { kidId: null, shared: true }
  return { kidId: whose, shared: false }
}

/**
 * Names as they sound, only to notice two that may be the same toy: no case,
 * accents, or extra spaces. What's saved is always the name as typed.
 * @param {string} name
 */
const heard = (name) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Another toy in the box that already goes by this name, or by it as another name.
 * @param {string} name @param {Toy[]} toys @param {string | null} self
 */
export function sameName(name, toys, self) {
  const wanted = heard(name)
  return toys.find((toy) => toy.id !== self && [toy.name, ...toy.aliases].some((each) => heard(each) === wanted))
}

/**
 * Adds a toy to the ones this toy goes with, along with the toys it already
 * goes with, so this toy joins that set instead of pulling the toy out of it.
 * @param {string[]} linked
 * @param {Toy} toy
 * @param {string | null} self
 */
export const joining = (linked, toy, self) => [...new Set([...linked, toy.id, ...toy.linked])].filter((each) => each !== self)

/** @param {string[]} a @param {string[]} b */
export const sameSet = (a, b) => a.length === b.length && a.every((each) => b.includes(each))

/**
 * The rest of what the box knows about a toy, in words: whose it is, whether
 * it's a favorite, and the toys it goes with, by their family names. The
 * description stays on the toy's own screen.
 * @param {Toy} toy
 * @param {ToyBox} box
 * @param {Kid[]} kids
 */
export function toyLine(toy, box, kids) {
  const parts = []
  const kid = kids.find((each) => each.id === toy.kidId)
  if (kid) parts.push(`de ${kid.name}`)
  else if (toy.shared) parts.push('de todos')
  if (toy.favorite) parts.push('favorito')
  const linked = toy.linked.map((id) => box.toys.find((other) => other.id === id)?.name).filter(Boolean)
  if (linked.length > 0) parts.push(`va con ${linked.join(' y ')}`)
  return parts.join(' · ')
}
