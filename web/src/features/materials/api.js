/**
 * The household materials (JUG-153), against the real API. The categories are
 * cached, so Materiales opens offline with what was last saved.
 */
import { read, write } from '../../shared/store'
import { request } from '../../shared/http'

/** @typedef {import('./types').MaterialCategory} MaterialCategory */

/** @returns {Promise<MaterialCategory[]>} */
export async function loadMaterials() {
  /** @type {{ categories: MaterialCategory[] }} */
  const { categories } = await request('GET', '/family/materials')
  write('materials', categories)
  return categories
}

/**
 * Shows one material's change on this device at once, before `saveMaterial`
 * saves it.
 * @param {string} key
 * @param {boolean} have
 */
export function markMaterial(key, have) {
  /** @type {MaterialCategory[] | null} */
  const categories = read('materials')
  if (!categories) return
  write(
    'materials',
    categories.map((category) => ({
      ...category,
      materials: category.materials.map((material) => (material.key === key ? { ...material, have } : material)),
    })),
  )
}

/** Says whether the family has one material. @param {string} key @param {boolean} have */
export async function saveMaterial(key, have) {
  await request('PUT', `/family/materials/${key}`, { have })
}
