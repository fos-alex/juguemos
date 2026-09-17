/**
 * The choices the family profile keeps as keys (JUG-21): what animal a pet is,
 * and the kind of home. Keys never change once a family has chosen one; the
 * web shows each with its own label.
 */

/**
 * What animal a pet is, with the word a story uses for it. `otro` has none,
 * so a story names that pet and says nothing of its kind.
 * @type {Record<string, string | null>}
 */
export const PET_KINDS = {
  perro: 'perro',
  gato: 'gato',
  pajaro: 'pájaro',
  pez: 'pez',
  conejo: 'conejo',
  tortuga: 'tortuga',
  otro: null,
}

/** A pet the family didn't say the kind of is a dog. */
export const DEFAULT_PET_KIND = 'perro'

/** The kind of home. Nothing reads it yet: activities will suit it later. */
export const HOMES = ['departamento', 'casa', 'casa_con_parque']

/** What the kids call a parent, when the family didn't say. */
export const DEFAULT_CALLED_AS = 'Mamá'
