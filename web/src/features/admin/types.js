/**
 * The shapes the catalog admin works with, as the API sends them.
 */

/**
 * @typedef {{
 *   title: string, active: boolean, minutes: number, place: 'indoor' | 'outdoor',
 *   minAgeMonths: number, maxAgeMonths: number, energy: 'low' | 'medium' | 'high',
 *   categories: string[], smallSpace: boolean, materials: string[], skills: string[], safety: string[],
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} ActivityTemplateFields
 * A catalog template as the admin edits it, with its slots ({kid}, {toy}…) unfilled.
 * `materials` are keys from the API's list: what it can't be played without.
 */
/** @typedef {ActivityTemplateFields & { id: string, slug: string, updatedAt: string }} ActivityTemplate */
/**
 * @typedef {{ key: string, label: string, materials: { key: string, label: string }[] }} MaterialCategory
 * The materials a template can name, by category (JUG-153).
 */

export {}
