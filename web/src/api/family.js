/**
 * The family profile, against the real API. The screens keep 0.1's shape (one
 * pet, toys by name) and this module translates to and from the API's, which
 * has room for more pets and for toy details later.
 */
import { write } from '../lib/store'
import { ApiError, request } from './http'

/** @typedef {import('./types').Family} Family */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, age: number | null, playing?: boolean }[], pets: { name: string }[],
 *   interests: string[], toys: { name: string }[],
 * }} Profile
 */

/** @param {Profile} profile @returns {Family} */
function toFamily(profile) {
  return {
    kids: profile.kids.map(({ id, name, age, playing }) => ({ id, name, age, playing })),
    pet: profile.pets[0]?.name ?? '',
    interests: profile.interests,
    toys: profile.toys.map((toy) => toy.name),
  }
}

/**
 * A kid keeps their id, so the API updates them instead of adding someone new
 * and forgetting who's playing.
 * @param {Family} family @returns {Profile}
 */
function toProfile(family) {
  return {
    kids: family.kids.map(({ id, name, age }) => (id ? { id, name, age } : { name, age })),
    pets: family.pet ? [{ name: family.pet }] : [],
    interests: family.interests,
    toys: family.toys.map((name) => ({ name })),
  }
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
