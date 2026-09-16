/**
 * The household materials each family has. A material the family hasn't
 * answered is at its default from materials.js, so a family that never opens
 * Materiales still has what almost every home has.
 */
import { eq } from 'drizzle-orm'
import { ValidationError } from '../errors.js'
import { MATERIAL_CATEGORIES, MATERIALS } from './materials.js'
import { householdMaterials } from './materials.schema.js'

/** @typedef {{ key: string, label: string, have: boolean }} Material */
/** @typedef {{ key: string, label: string, materials: Material[] }} MaterialGroup */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {ReturnType<typeof createMaterialsService>} MaterialsService */

/** @param {{ db: Db }} deps */
export function createMaterialsService({ db }) {
  /**
   * Whether the family has each material, by key: its answer, or the default.
   * @param {string} familyId
   * @returns {Promise<Map<string, boolean>>}
   */
  async function answers(familyId) {
    const rows = await db
      .select({ material: householdMaterials.material, have: householdMaterials.have })
      .from(householdMaterials)
      .where(eq(householdMaterials.familyId, familyId))
    const given = new Map(rows.map((row) => [row.material, row.have]))
    return new Map(MATERIALS.map((material) => [material.key, given.get(material.key) ?? material.common]))
  }

  return {
    /**
     * Every material, by category, with whether the family has it.
     * @param {string} familyId
     * @returns {Promise<MaterialGroup[]>}
     */
    async list(familyId) {
      const have = await answers(familyId)
      return MATERIAL_CATEGORIES.map((category) => ({
        key: category.key,
        label: category.label,
        materials: category.materials.map(({ key, label }) => ({ key, label, have: /** @type {boolean} */ (have.get(key)) })),
      }))
    },

    /**
     * The keys of the materials the family doesn't have, which is what rules
     * an activity out.
     * @param {string} familyId
     * @returns {Promise<Set<string>>}
     */
    async missing(familyId) {
      const have = await answers(familyId)
      return new Set([...have].filter(([, has]) => !has).map(([key]) => key))
    },

    /**
     * Records whether the family has one material. The answer holds even when
     * it matches the default.
     * @param {string} familyId
     * @param {string} key
     * @param {boolean} have
     * @returns {Promise<Material>}
     */
    async mark(familyId, key, have) {
      const material = MATERIALS.find((each) => each.key === key)
      if (!material) throw new ValidationError('No such material', 'UNKNOWN_MATERIAL')
      await db
        .insert(householdMaterials)
        .values({ familyId, material: key, have })
        .onConflictDoUpdate({ target: [householdMaterials.familyId, householdMaterials.material], set: { have } })
      return { key, label: material.label, have }
    },
  }
}
