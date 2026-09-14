/**
 * The shapes the screens work with. The API modules translate to and from
 * the API's own shapes, so screens never see them.
 */

/** @typedef {{ name: string, age: number | null }} Kid */
/** @typedef {{ kids: Kid[], pet: string, interests: string[], toys: string[] }} Family */
/**
 * @typedef {{ family: Family, flagged: string[], note: string | null }} ParseResult
 * `flagged` holds field keys ('kids.1', 'pet', 'interests', 'toys') the model was unsure about.
 */
/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} Activity
 * `needs` starts lowercase so a toy name at the start keeps its family spelling;
 * the layout capitalises the sentence where it needs to.
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption */
/** @typedef {StoryOption & { parts: string[][] }} Story */
/**
 * @typedef {{
 *   title: string, active: boolean, minutes: number, place: 'indoor' | 'outdoor',
 *   minAgeMonths: number, maxAgeMonths: number, energy: 'low' | 'medium' | 'high',
 *   categories: string[], smallSpace: boolean, materials: string[], skills: string[], safety: string[],
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} ActivityTemplateFields
 * A catalog template as the admin edits it, with its slots ({kid}, {toy}…) unfilled.
 */
/** @typedef {ActivityTemplateFields & { id: string, slug: string, updatedAt: string }} ActivityTemplate */
/**
 * @typedef {{ name: string, email: string, provider: 'email' | 'google', emailVerified: boolean }} Account
 */

export {}
