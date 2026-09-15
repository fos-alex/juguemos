import { OfflineError, WordedError } from './http'

/** @typedef {import('../api/types').Activity} Activity */

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
  if (error instanceof WordedError) return error.message
  return error instanceof OfflineError ? 'Estás sin conexión.' : 'Uy, algo falló. ¿Probamos de nuevo?'
}
