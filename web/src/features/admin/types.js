/**
 * The shapes the catalog admin works with, as the API sends them.
 */

/**
 * @typedef {{
 *   title: string, active: boolean, minutes: number, place: 'indoor' | 'outdoor',
 *   minAgeMonths: number, maxAgeMonths: number, energy: 'low' | 'medium' | 'high',
 *   categories: string[], smallSpace: boolean, materials: string[], themes: string[], skills: string[], safety: string[],
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} ActivityTemplateFields
 * A catalog template as the admin edits it, with its slots ({kid}, {toy}…) unfilled.
 * `materials` are keys from the API's list: what it can't be played without.
 * `themes` are keys from the API's list too: what it is about (JUG-104).
 */
/** @typedef {ActivityTemplateFields & { id: string, slug: string, updatedAt: string }} ActivityTemplate */
/**
 * @typedef {{ key: string, label: string, materials: { key: string, label: string }[] }} MaterialCategory
 * The materials a template can name, by category (JUG-153).
 */

/** @typedef {{ key: string, label: string }} Theme What a template can be about (JUG-104). */

/** @typedef {{ id: string, name: string, email: string, createdAt: string }} AdminAccount An account, as the Usuarios page lists it. */

/**
 * @typedef {{ id: string, email: string, status: 'pending' | 'expired' | 'accepted', sentAt: string, expiresAt: string }} Invitation
 * An invitation to sign up (JUG-34). `accepted` once the email has an account.
 */

export {}
