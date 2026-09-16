/**
 * The household materials a family can say it has, by category. The list
 * comes from what the activity catalog needs: a template names the materials
 * it can't do without by key, and a family that has marked one off is never
 * offered it. Something every home has, like a plate or a phone, isn't here.
 *
 * `common` is what a family that hasn't said starts with: on for what almost
 * every home in Buenos Aires has, off for the rest. The database keeps only
 * the family's own answers, so a material added here later starts at its
 * default for everyone. Keys never change once a family has answered them.
 */

/** @typedef {{ key: string, label: string, common: boolean }} MaterialDefinition */
/** @typedef {{ key: string, label: string, materials: MaterialDefinition[] }} MaterialCategory */

/** @type {MaterialCategory[]} */
export const MATERIAL_CATEGORIES = [
  {
    key: 'cocina',
    label: 'De la cocina',
    materials: [
      { key: 'ollas', label: 'ollas y cacerolas', common: true },
      { key: 'cucharas', label: 'cucharas de madera', common: true },
      { key: 'tuppers', label: 'tuppers o vasos de plástico', common: true },
      { key: 'repasadores', label: 'repasadores', common: true },
      { key: 'harina', label: 'harina y sal', common: true },
      { key: 'porotos', label: 'porotos o semillas', common: true },
      { key: 'botellas', label: 'botellas de plástico con tapa', common: true },
      { key: 'envases', label: 'envases vacíos, como los de yogur', common: true },
    ],
  },
  {
    key: 'manualidades',
    label: 'Para dibujar y armar',
    materials: [
      { key: 'papel', label: 'hojas de papel', common: true },
      { key: 'crayones', label: 'crayones', common: true },
      { key: 'marcadores', label: 'marcadores o fibras', common: false },
      { key: 'tijera', label: 'una tijera', common: true },
      { key: 'cinta', label: 'cinta de papel o scotch', common: true },
      { key: 'cajas', label: 'cajas de cartón', common: true },
      { key: 'tubos', label: 'tubos de cartón', common: true },
      { key: 'cordones', label: 'cordones o lana', common: true },
      { key: 'medias', label: 'medias viejas', common: true },
    ],
  },
  {
    key: 'casa',
    label: 'En casa',
    materials: [
      { key: 'almohadones', label: 'almohadones', common: true },
      { key: 'mantas', label: 'mantas o sábanas', common: true },
      { key: 'baldes', label: 'un balde o una palangana', common: true },
      { key: 'libros', label: 'libros con dibujos', common: true },
    ],
  },
  {
    key: 'afuera',
    label: 'Para afuera',
    materials: [
      { key: 'tizas', label: 'tizas', common: false },
      { key: 'tierra', label: 'tierra para plantar', common: false },
    ],
  },
]

/** Every material, in the order the categories list them. */
export const MATERIALS = MATERIAL_CATEGORIES.flatMap((category) => category.materials)

export const MATERIAL_KEYS = MATERIALS.map((material) => material.key)
