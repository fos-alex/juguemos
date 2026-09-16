/**
 * The family profile, against the real API. The screens keep 0.1's shape (one
 * pet, toys by name and id) and this module translates to and from the API's,
 * which has room for more pets. The rest of what is known about each toy is
 * the toy box's (./toys).
 */
import { read, write } from '../../shared/store'
import { ApiError, request } from '../../shared/http'

/** @typedef {import('./types').Family} Family */
/** @typedef {import('./types').Kid} Kid */
/**
 * @typedef {Omit<Kid, 'ageMonths' | 'interests'> & { ageMonths?: number | null, age?: number | null, interests?: string[] }} CachedKid
 * A kid as an older version of the app cached it: its age in whole years, and
 * no interests of its own.
 */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, ageMonths: number | null, playing?: boolean, interests?: string[] }[],
 *   pets: { name: string }[], toys: { id?: string, name: string }[],
 * }} Profile
 */

/** @param {Profile} profile @returns {Family} */
function toFamily(profile) {
  return {
    kids: profile.kids.map(({ id, name, ageMonths, playing, interests = [] }) => ({ id, name, ageMonths, playing, interests })),
    pet: profile.pets[0]?.name ?? '',
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
    kids: family.kids.map(({ id, name, ageMonths, interests }) =>
      id ? { id, name, ageMonths, interests } : { name, ageMonths, interests },
    ),
    pets: family.pet ? [{ name: family.pet }] : [],
    toys: family.toys.map(({ id, name }) => (id ? { id, name } : { name })),
  }
}

/**
 * Brings a family cached by an older version up to date until the next load
 * replaces it: toys cached as bare names become toys without ids, the family's
 * own interests, from before each kid had theirs (JUG-144), go to every kid, as
 * the API's migration did, and an age in whole years becomes months (JUG-145).
 */
export function upgradeCachedFamily() {
  const family = read('family')
  if (!family) return
  const bareToys = family.toys.some((/** @type {unknown} */ toy) => typeof toy === 'string')
  const yearsOnly = family.kids.some((/** @type {CachedKid} */ kid) => kid.ageMonths === undefined)
  if (!bareToys && !yearsOnly && !Array.isArray(family.interests)) return
  const { interests = [], ...rest } = family
  write('family', {
    ...rest,
    kids: family.kids.map((/** @type {CachedKid} */ kid) => {
      const { age, ...kept } = kid
      return {
        ...kept,
        ageMonths: kid.ageMonths ?? (typeof age === 'number' ? age * 12 : null),
        interests: kid.interests ?? interests,
      }
    }),
    toys: family.toys.map((/** @type {string | import('./types').FamilyToy} */ toy) => (typeof toy === 'string' ? { name: toy } : toy)),
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
 * @returns {Promise<import('./types').ParseResult>}
 */
export async function understandFamily(text) {
  const { family, unsure, note } = await request('POST', '/family/understanding', { text })
  /** @type {import('./types').ParseResult} */
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

/** Keeps what the parent has written on 2d so far, so a reload doesn't lose it. @param {string} text */
export function keepDraft(text) {
  write('familyDraft', text)
}

/** A voice note's words go after whatever is already in the draft. @param {string} text */
export function addToDraft(text) {
  const current = read('familyDraft')?.trim()
  write('familyDraft', current ? `${current} ${text}` : text)
}

/**
 * Shows who's playing on this device at once, before `choosePlaying` saves it.
 * @param {Kid[]} kids
 */
export function markPlaying(kids) {
  const family = read('family')
  if (family) write('family', { ...family, kids })
}
