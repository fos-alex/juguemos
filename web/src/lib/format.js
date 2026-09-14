import { AccountError, OfflineError } from '../api'

/** @typedef {import('../api/types').Family} Family */
/** @typedef {import('../api/types').Activity} Activity */

/** @param {number} age */
export function ageText(age) {
  return age === 1 ? '1 año' : `${age} años`
}

/** The Home header line: the kids only. The pet turns up in ideas and stories. @param {Family} family */
export function familyLine(family) {
  return family.kids.map((kid) => (kid.age == null ? kid.name : `${kid.name}, ${ageText(kid.age)}`)).join(' · ')
}

/** Where an activity happens, as the parent reads it. @param {Activity['place']} place */
export function placeText(place) {
  return place === 'outdoor' ? 'afuera' : 'adentro'
}

/** @param {number} seconds */
export function clockText(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** What to tell the parent when a request fails: no blame, no error codes. @param {unknown} error */
export function failureText(error) {
  if (error instanceof AccountError) return error.message
  return error instanceof OfflineError ? 'Estás sin conexión.' : 'Uy, algo falló. ¿Probamos de nuevo?'
}
