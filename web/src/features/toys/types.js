/**
 * The shapes the toy box works with, as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, name: string, aliases: string[], description: string | null,
 *   kidId: string | null, shared: boolean, favorite: boolean, linked: string[],
 * }} Toy
 * A toy in the toy box (JUG-18). `name` is the family's, shown exactly as
 * typed; `description` is for Ludi and never shown in its place. Whose it
 * is: `kidId`'s, `shared`, or neither. `linked` holds the ids of the toys it
 * goes with.
 */
/** @typedef {Partial<Omit<Toy, 'id' | 'linked'>>} ToyChanges */
/**
 * @typedef {{ name: string, description: string | null }} ToyCandidate
 * A toy Ludi heard in the parent's words (JUG-146), before anything is
 * saved: the family's name for it and what it is. A candidate becomes a toy
 * only once the parent confirms it.
 */
/** @typedef {{ toys: Toy[] }} ToyBox */

export {}
