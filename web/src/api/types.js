/**
 * The shapes the screens work with. The API modules translate to and from
 * the API's own shapes, so screens never see them.
 */

/**
 * @typedef {{ id?: string, name: string, age: number | null, playing?: boolean }} Kid
 * `id` is missing only for a kid the form hasn't saved yet. `playing` is whether
 * the kid plays with this parent (JUG-107); a kid without it plays.
 */
/**
 * @typedef {{ id?: string, name: string }} FamilyToy
 * A toy as the family profile knows it: the family's name for it, and its id
 * once saved, which the form sends back so the toy box keeps what it knows.
 */
/** @typedef {{ kids: Kid[], pet: string, interests: string[], toys: FamilyToy[] }} Family */
/**
 * @typedef {{
 *   id: string, name: string, aliases: string[], description: string | null,
 *   kidId: string | null, shared: boolean, favorite: boolean, linked: string[],
 * }} Toy
 * A toy in the toy box (JUG-18). `name` is the family's, shown exactly as
 * typed; `description` is for Juguemos and never shown in its place. Whose it
 * is: `kidId`'s, `shared`, or neither. `linked` holds the ids of the toys it
 * goes with.
 */
/** @typedef {Partial<Omit<Toy, 'id' | 'linked'>>} ToyChanges */
/** @typedef {{ key: string, label: string, have: boolean }} Material A household material, from the API's fixed list. */
/** @typedef {{ toys: Toy[], materials: Material[] }} ToyBox */
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
/** @typedef {{ id: string, title: string, teaser: string, minutes: number, createdAt: string }} SavedStorySummary */
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
 * @typedef {{ name: string, email: string, provider: 'email' | 'google', emailVerified: boolean, familyFromText?: boolean }} Account
 * `familyFromText` says the API can read a family from the parent's own words (an LLM is set up),
 * so first run starts at /familia/contanos instead of the form.
 */

export {}
