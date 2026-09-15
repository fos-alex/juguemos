/**
 * The toy box: the family's toys by their own names, with what the AI may know
 * about each, and the household materials the family has. Activities and
 * stories name a toy only by its family name; the description never replaces
 * it, and nothing is inferred from the name.
 */
import { randomUUID } from 'node:crypto'
import { and, asc, count, eq, inArray, max } from 'drizzle-orm'
import { kids } from '../families/families.schema.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'
import { MATERIALS } from './materials.js'
import { householdMaterials, toys } from './toys.schema.js'

/**
 * @typedef {{
 *   id: string, name: string, aliases: string[], description: string | null,
 *   kidId: string | null, shared: boolean, favorite: boolean, linked: string[],
 * }} Toy
 * Whose it is: `kidId`'s, `shared`, or neither when the family hasn't said.
 * `linked` holds the ids of the other toys in its set.
 */
/**
 * @typedef {{
 *   name?: string, aliases?: string[], description?: string | null,
 *   kidId?: string | null, shared?: boolean, favorite?: boolean,
 * }} ToyInput
 * Only the fields given change. Giving a kid makes the toy not shared, and
 * `shared` takes it from its kid.
 */
/** @typedef {{ key: string, label: string, have: boolean }} Material */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {ReturnType<typeof createToysService>} ToysService */

// The family form takes up to this many toys, so the toy box stops there too.
export const MAX_TOYS = 200

const columns = {
  id: toys.id,
  name: toys.name,
  aliases: toys.aliases,
  description: toys.description,
  kidId: toys.kidId,
  shared: toys.shared,
  favorite: toys.favorite,
  linkGroup: toys.linkGroup,
}

/** @param {{ db: Db }} deps */
export function createToysService({ db }) {
  /** @param {string} familyId @returns {Promise<Toy[]>} */
  async function list(familyId) {
    const rows = await db.select(columns).from(toys).where(eq(toys.familyId, familyId)).orderBy(asc(toys.position))
    return rows.map(({ linkGroup, ...toy }) => ({
      ...toy,
      linked: linkGroup ? rows.filter((other) => other.linkGroup === linkGroup && other.id !== toy.id).map((other) => other.id) : [],
    }))
  }

  /** @param {string} familyId @param {string} toyId @returns {Promise<Toy>} */
  async function one(familyId, toyId) {
    const toy = (await list(familyId)).find((row) => row.id === toyId)
    if (!toy) throw new NotFoundError('No such toy')
    return toy
  }

  /**
   * The columns for whose the toy is. A kid and `shared` exclude each other,
   * so setting one clears the other.
   * @param {string} familyId
   * @param {ToyInput} input
   */
  async function ownerOf(familyId, { kidId, shared }) {
    if (kidId && shared) throw new ValidationError('A toy is one kid’s or shared, not both', 'TOY_OWNER')
    if (kidId) {
      const [kid] = await db
        .select({ id: kids.id })
        .from(kids)
        .where(and(eq(kids.id, kidId), eq(kids.familyId, familyId)))
      if (!kid) throw new ValidationError('No such kid in the family', 'UNKNOWN_KID')
      return { kidId, shared: false }
    }
    if (shared) return { kidId: null, shared: true }
    return { ...(kidId === null && { kidId: null }), ...(shared === false && { shared: false }) }
  }

  /** @param {string} familyId @returns {Promise<Material[]>} */
  async function materials(familyId) {
    const rows = await db
      .select({ material: householdMaterials.material })
      .from(householdMaterials)
      .where(eq(householdMaterials.familyId, familyId))
    const have = new Set(rows.map((row) => row.material))
    return MATERIALS.map((material) => ({ ...material, have: have.has(material.key) }))
  }

  return {
    list,
    materials,

    /**
     * Adds a toy at the end of the box, with its name exactly as given.
     * @param {string} familyId
     * @param {ToyInput & { name: string }} input
     * @returns {Promise<Toy>}
     */
    async add(familyId, input) {
      const values = { ...detailsOf(input), ...(await ownerOf(familyId, input)) }
      const [{ total, last }] = await db
        .select({ total: count(), last: max(toys.position) })
        .from(toys)
        .where(eq(toys.familyId, familyId))
      if (total >= MAX_TOYS) throw new ConflictError('The toy box is full', 'TOY_BOX_FULL')
      const [row] = await db
        .insert(toys)
        .values({ familyId, position: (last ?? -1) + 1, name: input.name, ...values })
        .returning({ id: toys.id })
      return one(familyId, row.id)
    },

    /**
     * Changes, or renames, one of the family's toys.
     * @param {string} familyId
     * @param {string} toyId
     * @param {ToyInput} input
     * @returns {Promise<Toy>}
     */
    async edit(familyId, toyId, input) {
      const values = { ...detailsOf(input), ...(await ownerOf(familyId, input)) }
      const [row] = await db
        .update(toys)
        .set(values)
        .where(and(eq(toys.id, toyId), eq(toys.familyId, familyId)))
        .returning({ id: toys.id })
      if (!row) throw new NotFoundError('No such toy')
      return one(familyId, toyId)
    },

    /**
     * Takes a toy out of the box, for good (“ya no lo tenemos”).
     * @param {string} familyId
     * @param {string} toyId
     */
    async remove(familyId, toyId) {
      const [row] = await db
        .delete(toys)
        .where(and(eq(toys.id, toyId), eq(toys.familyId, familyId)))
        .returning({ id: toys.id })
      if (!row) throw new NotFoundError('No such toy')
    },

    /**
     * Makes `toyIds` the whole set this toy is linked with. Each of them
     * leaves the set it was in, and the toys left behind in the old sets stay
     * linked with each other. No ids unlinks the toy. A set of one links
     * nothing, so it needs no cleaning up.
     * @param {string} familyId
     * @param {string} toyId
     * @param {string[]} toyIds
     * @returns {Promise<Toy[]>} the whole box, since several toys change
     */
    async link(familyId, toyId, toyIds) {
      const others = toyIds.filter((id) => id !== toyId)
      const members = [toyId, ...others]
      await db.transaction(async (tx) => {
        const found = await tx
          .select({ id: toys.id })
          .from(toys)
          .where(and(eq(toys.familyId, familyId), inArray(toys.id, members)))
        if (!found.some((row) => row.id === toyId)) throw new NotFoundError('No such toy')
        if (found.length < members.length) throw new ValidationError('No such toy in the family', 'UNKNOWN_TOY')
        await tx
          .update(toys)
          .set({ linkGroup: others.length > 0 ? randomUUID() : null })
          .where(inArray(toys.id, members))
      })
      return list(familyId)
    },

    /**
     * Says which household materials the family has; the rest it doesn't.
     * @param {string} familyId
     * @param {string[]} keys
     * @returns {Promise<Material[]>}
     */
    async chooseMaterials(familyId, keys) {
      await db.transaction(async (tx) => {
        await tx.delete(householdMaterials).where(eq(householdMaterials.familyId, familyId))
        if (keys.length > 0) await tx.insert(householdMaterials).values(keys.map((material) => ({ familyId, material })))
      })
      return materials(familyId)
    },
  }
}

/** The fields of a toy other than whose it is, only those given. @param {ToyInput} input */
function detailsOf({ name, aliases, description, favorite }) {
  return Object.fromEntries(Object.entries({ name, aliases, description, favorite }).filter(([, value]) => value !== undefined))
}
