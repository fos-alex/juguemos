/**
 * The catalog admin's logic, with no React: how a template's tags read, the
 * form's state and how it maps to a template, and the checks the form makes
 * before the API makes them again.
 */
import { failureText } from '../../shared/format'
import { ApiError } from '../../shared/http'

/** @typedef {import('./types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('./types').ActivityTemplateFields} ActivityTemplateFields */
/**
 * @typedef {{
 *   slug: string, title: string, active: boolean, minutes: string, place: string,
 *   minAgeMonths: string, maxAgeMonths: string, energy: string, categories: string[], smallSpace: boolean,
 *   materials: string[], skills: string, safety: string,
 *   why: string, needs: string, steps: string, easier: string, harder: string,
 * }} FormState
 * Numbers as typed, and lists one item per line, except the categories and
 * the materials, which are picked.
 */
/** @typedef {Partial<Record<keyof FormState, string>>} Errors */

/** The slots code can fill. The API refuses any other, from its own list in catalog/slots.js. */
export const SLOTS = ['kid', 'pet', 'toy', 'toy2', 'toy3', 'interest']

/** The slots as a template writes them, for the form's help lines. */
export const SLOT_LIST = SLOTS.map((slot) => `{${slot}}`).join(' ')

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

/** The id in /admin/nuevo, which adds a template instead of editing one. */
export const NEW = 'nuevo'

/** @type {FormState} */
export const EMPTY = {
  slug: '',
  title: '',
  active: true,
  minutes: '15',
  place: 'indoor',
  minAgeMonths: '12',
  maxAgeMonths: '47',
  energy: 'medium',
  categories: [],
  smallSpace: true,
  materials: [],
  skills: '',
  safety: '',
  why: '',
  needs: '',
  steps: '',
  easier: '',
  harder: '',
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** @type {(keyof FormState)[]} */
const TEXTS = ['title', 'why', 'needs', 'steps', 'easier', 'harder']
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

/** @param {string} text */
const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** @param {ActivityTemplate} template @returns {FormState} */
export function toForm(template) {
  return {
    slug: template.slug,
    title: template.title,
    active: template.active,
    minutes: String(template.minutes),
    place: template.place,
    minAgeMonths: String(template.minAgeMonths),
    maxAgeMonths: String(template.maxAgeMonths),
    energy: template.energy,
    categories: template.categories,
    smallSpace: template.smallSpace,
    materials: template.materials,
    skills: template.skills.join('\n'),
    safety: template.safety.join('\n'),
    why: template.why,
    needs: template.needs,
    steps: template.steps.join('\n'),
    easier: template.easier,
    harder: template.harder,
  }
}

/** @param {FormState} form @returns {ActivityTemplateFields} */
export function toFields(form) {
  return {
    title: form.title.trim(),
    active: form.active,
    minutes: Number(form.minutes),
    place: /** @type {ActivityTemplateFields['place']} */ (form.place),
    minAgeMonths: Number(form.minAgeMonths),
    maxAgeMonths: Number(form.maxAgeMonths),
    energy: /** @type {ActivityTemplateFields['energy']} */ (form.energy),
    categories: form.categories,
    smallSpace: form.smallSpace,
    materials: form.materials,
    skills: lines(form.skills),
    safety: lines(form.safety),
    why: form.why.trim(),
    needs: form.needs.trim(),
    steps: lines(form.steps),
    easier: form.easier.trim(),
    harder: form.harder.trim(),
  }
}

/** The form's own checks, worded under each field. @param {FormState} form @param {boolean} isNew @returns {Errors} */
export function check(form, isNew) {
  /** @type {Errors} */
  const errors = {}
  if (isNew && !SLUG.test(form.slug.trim())) errors.slug = 'Solo minúsculas, números y guiones, como la-busqueda.'

  const minutes = Number(form.minutes)
  if (!form.minutes || minutes < 1 || minutes > 240) errors.minutes = 'Entre 1 y 240 minutos.'
  const min = Number(form.minAgeMonths)
  const max = Number(form.maxAgeMonths)
  if (!form.minAgeMonths || min > 215) errors.minAgeMonths = 'Entre 0 y 215 meses.'
  if (!form.maxAgeMonths || max > 215) errors.maxAgeMonths = 'Entre 0 y 215 meses.'
  else if (form.minAgeMonths && max < min) errors.maxAgeMonths = 'No puede ser menos que “desde”.'

  if (form.categories.length === 0) errors.categories = 'Elegí al menos una.'
  if (lines(form.steps).length > 10) errors.steps = 'Como mucho diez pasos.'

  for (const name of TEXTS) {
    const value = /** @type {string} */ (form[name])
    const unknown = unknownSlots(value)
    if (!value.trim()) errors[name] = 'Falta completarlo.'
    else if (unknown.length > 0) errors[name] = `${unknown.join(', ')} no es un espacio. Los que hay: ${SLOT_LIST}.`
  }
  return errors
}
