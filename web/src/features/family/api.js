/**
 * The family profile, against the real API. The screens keep 0.1's shape (one
 * pet, toys by name and id) and this module translates to and from the API's,
 * which has room for more pets. The rest of what is known about each toy is
 * the toy box's (./toys).
 */
import { read, write } from '../../shared/store'
import { ApiError, request } from '../../shared/http'

/** @typedef {import('../../api/types').Family} Family */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, age: number | null, playing?: boolean }[], pets: { name: string }[],
 *   interests: string[], toys: { id?: string, name: string }[],
 * }} Profile
 */

/** @param {Profile} profile @returns {Family} */
function toFamily(profile) {
  return {
    kids: profile.kids.map(({ id, name, age, playing }) => ({ id, name, age, playing })),
    pet: profile.pets[0]?.name ?? '',
    interests: profile.interests,
    toys: profile.toys.map(({ id, name }) => ({ id, name })),
  }
}

/**
 * Kids and toys keep their ids, so the API updates them instead of adding new
 * ones: a kid keeps who's playing, and a toy keeps what the toy box knows.
 * @param {Family} family @returns {Profile}
 */
function toProfile(family) {
  return {
    kids: family.kids.map(({ id, name, age }) => (id ? { id, name, age } : { name, age })),
    pets: family.pet ? [{ name: family.pet }] : [],
    interests: family.interests,
    toys: family.toys.map(({ id, name }) => (id ? { id, name } : { name })),
  }
}

/**
 * A family cached before the toy box has its toys as bare names. They become
 * toys without ids until the next load brings the ids.
 */
export function upgradeCachedFamily() {
  const family = read('family')
  if (!family?.toys.some((/** @type {unknown} */ toy) => typeof toy === 'string')) return
  write('family', {
    ...family,
    toys: family.toys.map((/** @type {string | import('../../api/types').FamilyToy} */ toy) => (typeof toy === 'string' ? { name: toy } : toy)),
  })
}

/** Brings the account's family into this browser, or forgets it if there is none yet. @returns {Promise<Family | null>} */
export async function loadFamily() {
  try {
    const family = toFamily(await request('GET', '/family'))
    write('family', family)
    return family
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    write('family', null)
    return null
  }
}

/**
 * Sends the parent's own words to the API, whose LLM reads the family in them,
 * and keeps the result for the review card. Nothing is saved until the parent
 * confirms it.
 * @param {string} text
 * @returns {Promise<import('../../api/types').ParseResult>}
 */
export async function understandFamily(text) {
  const { family, unsure, note } = await request('POST', '/family/understanding', { text })
  /** @type {import('../../api/types').ParseResult} */
  const parse = { family: toFamily(family), flagged: unsure, note }
  write('parseResult', parse)
  return parse
}

/** @param {Family} family @returns {Promise<Family>} */
export async function saveFamily(family) {
  const saved = toFamily(await request('PUT', '/family', toProfile(family)))
  write('family', saved)
  write('parseResult', null)
  write('familyDraft', null)
  return saved
}

/**
 * Says which kids are playing, for this parent on every device; the rest sit
 * out. Juegos and stories are for these kids until the parent changes it.
 * @param {string[]} kidIds
 * @returns {Promise<Family>}
 */
export async function choosePlaying(kidIds) {
  const family = toFamily(await request('PUT', '/family/playing', { kids: kidIds }))
  write('family', family)
  return family
}
