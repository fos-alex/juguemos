/**
 * The toy box (JUG-18), against the real API. Every change also updates the
 * cached family's toys, so Mi familia and the family form see it at once.
 */
import { read, write } from '../shared/store'
import { request } from '../shared/http'

/** @typedef {import('./types').Toy} Toy */
/** @typedef {import('./types').ToyBox} ToyBox */
/** @typedef {import('./types').ToyChanges} ToyChanges */

/** Caches the box, and the family's toys in the box's order. @param {ToyBox} box @returns {ToyBox} */
function keep(box) {
  write('toyBox', box)
  const family = read('family')
  if (family) write('family', { ...family, toys: box.toys.map(({ id, name }) => ({ id, name })) })
  return box
}

/**
 * Applies a change the API just made to the cached box, or loads the box when
 * this device has none yet.
 * @param {(box: ToyBox) => ToyBox} change
 */
function merge(change) {
  const box = read('toyBox')
  return box ? keep(change(box)) : loadToyBox()
}

/** @returns {Promise<ToyBox>} */
export async function loadToyBox() {
  const [{ toys }, { materials }] = await Promise.all([request('GET', '/family/toys'), request('GET', '/family/materials')])
  return keep({ toys, materials })
}

/** Adds a toy at the end of the box. @param {ToyChanges & { name: string }} toy @returns {Promise<Toy>} */
export async function addToy(toy) {
  /** @type {Toy} */
  const added = await request('POST', '/family/toys', toy)
  await merge((box) => ({ ...box, toys: [...box.toys, added] }))
  return added
}

/** Changes or renames a toy. @param {string} id @param {ToyChanges} changes @returns {Promise<Toy>} */
export async function editToy(id, changes) {
  /** @type {Toy} */
  const edited = await request('PATCH', `/family/toys/${id}`, changes)
  await merge((box) => ({ ...box, toys: box.toys.map((toy) => (toy.id === id ? edited : toy)) }))
  return edited
}

/** Takes a toy out of the box, for good ("ya no lo tenemos"). @param {string} id */
export async function removeToy(id) {
  await request('DELETE', `/family/toys/${id}`)
  await merge((box) => ({
    ...box,
    toys: box.toys.filter((toy) => toy.id !== id).map((toy) => ({ ...toy, linked: toy.linked.filter((other) => other !== id) })),
  }))
}

/**
 * Makes `ids` the whole set of toys this one goes with; an empty list unlinks
 * it. Several toys can change, so the API sends the whole box back.
 * @param {string} id
 * @param {string[]} ids
 */
export async function linkToy(id, ids) {
  /** @type {{ toys: Toy[] }} */
  const { toys } = await request('PUT', `/family/toys/${id}/links`, { toys: ids })
  await merge((box) => ({ ...box, toys }))
}

/** Says which household materials the family has. @param {string[]} keys @returns {Promise<ToyBox>} */
export async function chooseMaterials(keys) {
  /** @type {{ materials: import('./types').Material[] }} */
  const { materials } = await request('PUT', '/family/materials', { have: keys })
  return merge((box) => ({ ...box, materials }))
}
