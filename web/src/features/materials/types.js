/**
 * The shapes Materiales works with, as the API sends them.
 */

/**
 * @typedef {{ key: string, label: string, have: boolean }} Material
 * A household material from the API's list (JUG-153). `have` is the family's
 * answer, or the default when they haven't given one: on for what almost
 * every home has.
 */
/** @typedef {{ key: string, label: string, materials: Material[] }} MaterialCategory */

export {}
