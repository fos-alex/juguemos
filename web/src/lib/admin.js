/**
 * Plain logic for the catalog admin: how a template's tags read, and the
 * checks the form makes before the API makes them again.
 */
import { ApiError } from '../api'
import { failureText } from '../shared/format'

/** @typedef {import('../api/types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('../api/types').ActivityTemplateFields} ActivityTemplateFields */

/** The slots code can fill. The API refuses any other, from its own list in catalog/slots.js. */
export const SLOTS = ['kid', 'pet', 'toy', 'toy2', 'toy3', 'interest']

/** @type {[string, string][]} */
export const CATEGORIES = [
  ['pretend', 'Imaginar'],
  ['create', 'Crear'],
  ['move', 'Moverse'],
  ['explore', 'Explorar'],
  ['low_energy', 'Tranqui'],
  ['helpers', 'Ayudar'],
  ['learn', 'Aprender'],
  ['out_and_about', 'Salir'],
]

/** @type {[ActivityTemplateFields['energy'], string][]} */
export const ENERGIES = [
  ['low', 'Baja'],
  ['medium', 'Media'],
  ['high', 'Alta'],
]

/** @type {[ActivityTemplateFields['place'], string][]} */
export const PLACES = [
  ['indoor', 'Adentro'],
  ['outdoor', 'Afuera'],
]

const PLACEHOLDER = /\{([^{}]*)\}/g

/** Placeholders in a text that aren't slots, as written. @param {string} text */
export function unknownSlots(text) {
  return [...text.matchAll(PLACEHOLDER)].filter(([, name]) => !SLOTS.includes(name)).map(([match]) => match)
}

/** A slug from a title: "El cumple de {toy}" becomes "el-cumple-de". @param {string} title */
export function slugFrom(title) {
  return title
    .replace(PLACEHOLDER, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The tags a row in the list shows. @param {ActivityTemplate} template */
export function templateLine(template) {
  const place = PLACES.find(([value]) => value === template.place)?.[1].toLowerCase()
  return `${template.minAgeMonths}–${template.maxAgeMonths} meses · ${template.minutes} min · ${place}`
}

/** @param {string[]} categories */
export function categoryNames(categories) {
  return categories.map((category) => CATEGORIES.find(([value]) => value === category)?.[1] ?? category).join(' · ')
}

/** What the API saves for a template: everything but its id, slug, and when it changed. @param {ActivityTemplate} template @returns {ActivityTemplateFields} */
export function fieldsOf({ id: _id, slug: _slug, updatedAt: _updatedAt, ...fields }) {
  return fields
}

/**
 * What the admin says when a request fails. A 404 means the API isn't serving
 * the admin, and a 400 carries the API's own reason. @param {unknown} error
 */
export function adminFailure(error) {
  if (error instanceof ApiError && error.status === 404) {
    return 'El admin está apagado. Poné ADMIN_ENABLED=true en .env y reiniciá la API.'
  }
  if (error instanceof ApiError && error.status === 400) return error.message
  return failureText(error)
}
