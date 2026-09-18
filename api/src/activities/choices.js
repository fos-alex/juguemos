/**
 * What the parent asked the juego to be (JUG-31): where it is played,
 * whether it plays sound on the phone, and the kind of play. Each choice is
 * firm, so the juegos that match all of them are the only ones ranked. When
 * none matches all of them, the ones that match the most are, and the juego
 * is the closest there is. Tranqui and Con pilas aren't here: they are the
 * moment (JUG-26), which leans the ranking instead.
 */

/** @typedef {import('../catalog/catalog.service.js').FillableActivityTemplate} Template */
/** @typedef {import('../catalog/slots.js').Fill} Fill */
/** @typedef {import('../games/sounds.js').GameKind} GameKind */
/** @typedef {Template['place']} Place */
/**
 * @typedef {'move' | 'create' | 'pretend' | 'explore' | 'learn' | 'low_energy' | 'helpers' | 'out_and_about'} Category
 */
/**
 * @typedef {object} Choices null for any
 * @property {Place | null} place
 * @property {boolean | null} sound true for a juego that plays sound on the phone, false for one that doesn't
 * @property {Category | null} category
 */

/** No choice at all: every juego that fits. @type {Choices} */
export const ANY = { place: null, sound: null, category: null }

/**
 * Whether a juego plays sound on the phone. Today that is ¿Qué suena?
 * (JUG-177), the one game whose sound is the point.
 * @param {Template} template
 */
export function playsSound(template) {
  return /** @type {GameKind | null} */ (template.game)?.type === 'sounds'
}

/**
 * The candidates that match the most of the choices, and whether that is
 * fewer than all of them.
 * @template {{ template: Template, fill: Fill }} C
 * @param {C[]} candidates the templates that fit, never empty
 * @param {Choices} choices
 * @returns {{ chosen: C[], closest: boolean }}
 */
export function matching(candidates, choices) {
  const { place, sound, category } = choices
  /** @type {((template: Template) => boolean)[]} */
  const asked = []
  if (place != null) asked.push((template) => template.place === place)
  if (sound != null) asked.push((template) => playsSound(template) === sound)
  if (category != null) asked.push((template) => template.categories.includes(category))
  if (asked.length === 0) return { chosen: candidates, closest: false }

  const scored = candidates.map((candidate) => ({
    candidate,
    matches: asked.filter((test) => test(candidate.template)).length,
  }))
  const most = Math.max(...scored.map((each) => each.matches))
  return {
    chosen: scored.filter((each) => each.matches === most).map((each) => each.candidate),
    closest: most < asked.length,
  }
}
