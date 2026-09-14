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
 *   kids: { name: string, age: number | null }[], pets: { name: string }[],
 *   interests: string[], toys: { name: string }[],
 * }} Profile
 */

/** @param {Profile} profile @returns {Family} */
function toFamily(profile) {
  return {
    kids: profile.kids.map(({ name, age }) => ({ name, age })),
    pet: profile.pets[0]?.name ?? '',
    interests: profile.interests,
    toys: profile.toys.map((toy) => toy.name),
  }
}

/** @param {Family} family @returns {Profile} */
function toProfile(family) {
  return {
    kids: family.kids.map(({ name, age }) => ({ name, age })),
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
