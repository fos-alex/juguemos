/**
 * The household materials a family can say it has, picked from this short
 * list. They need no family name. The database keeps the key; the parent reads
 * the label.
 */
export const MATERIALS = [
  { key: 'cajas', label: 'cajas de cartón' },
  { key: 'ollas', label: 'ollas y cucharas' },
  { key: 'mantas', label: 'mantas' },
  { key: 'tizas', label: 'tizas' },
  { key: 'almohadones', label: 'almohadones' },
  { key: 'crayones', label: 'papel y crayones' },
  { key: 'cinta', label: 'cinta de papel' },
  { key: 'tuppers', label: 'vasos y tuppers' },
]

export const MATERIAL_KEYS = MATERIALS.map((material) => material.key)
