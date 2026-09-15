/**
 * The shapes the toy box works with, as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, name: string, aliases: string[], description: string | null,
 *   kidId: string | null, shared: boolean, favorite: boolean, linked: string[],
 * }} Toy
 * A toy in the toy box (JUG-18). `name` is the family's, shown exactly as
 * typed; `description` is for Juguemos and never shown in its place. Whose it
 * is: `kidId`'s, `shared`, or neither. `linked` holds the ids of the toys it
 * goes with.
 */
/** @typedef {Partial<Omit<Toy, 'id' | 'linked'>>} ToyChanges */
/** @typedef {{ key: string, label: string, have: boolean }} Material A household material, from the API's fixed list. */
/** @typedef {{ toys: Toy[], materials: Material[] }} ToyBox */

export {}
