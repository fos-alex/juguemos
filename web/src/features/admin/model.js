/**
 * The admin's logic, with no React: how a template's tags read, the form's
 * state and how it maps to a template, and the checks the form makes before
 * the API makes them again. Then how the Usuarios page words its rows.
 */
import { failureText } from '../../shared/format'
import { ApiError } from '../../shared/http'

/** @typedef {import('./types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('./types').ActivityTemplateFields} ActivityTemplateFields */
/** @typedef {import('./types').Reactions} Reactions */
/** @typedef {import('./types').AdminAccount} AdminAccount */
/** @typedef {import('./types').Invitation} Invitation */
/** @typedef {import('./types').SentInvitation} SentInvitation */
/**
 * @typedef {{
 *   slug: string, title: string, active: boolean, rating: string, minutes: string, place: string,
 *   minAgeMonths: string, maxAgeMonths: string, energy: string, categories: string[], smallSpace: boolean,
 *   materials: string[], themes: string[], skills: string, safety: string,
 *   why: string, needs: string, steps: string, easier: string, harder: string,
 * }} FormState
 * Numbers as typed, and lists one item per line, except the categories, the
 * materials, and the themes, which are picked.
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

/**
 * A template's rating in the admin (JUG-192), and how often each makes it come
 * up for every family next to a 3.
 * @type {[string, string][]}
 */
export const RATINGS = [
  ['1', '1 · sale mucho menos'],
  ['2', '2 · sale menos'],
  ['3', '3 · normal'],
  ['4', '4 · sale más'],
  ['5', '5 · sale mucho más'],
]

/** The id in /admin/nuevo, which adds a template instead of editing one. */
export const NEW = 'nuevo'

/** @type {FormState} */
export const EMPTY = {
  slug: '',
  title: '',
  active: true,
  rating: '3',
  minutes: '15',
  place: 'indoor',
  minAgeMonths: '12',
  maxAgeMonths: '47',
  energy: 'medium',
  categories: [],
  smallSpace: true,
  materials: [],
  themes: [],
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

/** A rating with at most one decimal, the way Argentina writes it: 3,8. @param {number} rating */
const ratingText = (rating) => rating.toLocaleString('es-AR', { maximumFractionDigits: 1 })

/**
 * A template's rating now and the reactions that moved it, like "3,8 · 12 a
 * favor, 3 en contra", for its row in the list and its editor. @param {Reactions} reactions
 */
export function reactionsLine({ ups, downs, rating }) {
  const counts = ups + downs === 0 ? 'sin reacciones' : `${ups} a favor, ${downs} en contra`
  return `${ratingText(rating)} · ${counts}`
}

/** @param {string[]} categories */
export function categoryNames(categories) {
  return categories.map((category) => CATEGORIES.find(([value]) => value === category)?.[1] ?? category).join(' · ')
}

/**
 * What the API saves for a template: everything but its id, slug, when it
 * changed, and its reactions. @param {ActivityTemplate} template @returns {ActivityTemplateFields}
 */
export function fieldsOf({ id: _id, slug: _slug, updatedAt: _updatedAt, reactions: _reactions, ...fields }) {
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
    rating: String(template.rating),
    minutes: String(template.minutes),
    place: template.place,
    minAgeMonths: String(template.minAgeMonths),
    maxAgeMonths: String(template.maxAgeMonths),
    energy: template.energy,
    categories: template.categories,
    smallSpace: template.smallSpace,
    materials: template.materials,
    themes: template.themes,
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
    rating: Number(form.rating),
    minutes: Number(form.minutes),
    place: /** @type {ActivityTemplateFields['place']} */ (form.place),
    minAgeMonths: Number(form.minAgeMonths),
    maxAgeMonths: Number(form.maxAgeMonths),
    energy: /** @type {ActivityTemplateFields['energy']} */ (form.energy),
    categories: form.categories,
    smallSpace: form.smallSpace,
    materials: form.materials,
    themes: form.themes,
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** @param {string} email */
export const looksLikeEmail = (email) => EMAIL.test(email.trim())

/** A day in words, like "1 de octubre". @param {string} iso */
const day = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })

/** Where an invitation stands, in words. @param {Invitation} invitation */
export function invitationLine({ status, sentAt, expiresAt }) {
  if (status === 'accepted') return 'Ya tiene cuenta'
  if (status === 'expired') return `Enviada el ${day(sentAt)} · venció el ${day(expiresAt)}`
  return `Enviada el ${day(sentAt)} · vence el ${day(expiresAt)}`
}

/** @param {AdminAccount} account */
export const accountLine = ({ email, createdAt }) => `${email} · desde el ${day(createdAt)}`

/** What the admin says when an invitation isn't sent. @param {unknown} error */
export function inviteFailure(error) {
  if (error instanceof ApiError && error.code === 'ALREADY_REGISTERED') return 'Ese email ya tiene cuenta.'
  return adminFailure(error)
}

/**
 * What the admin says after inviting: that the email went out, or, with email
 * off, that the link has to be passed on by hand.
 * @param {SentInvitation} invitation
 * @returns {{ text: string, link: string | null }}
 */
export const inviteNews = ({ email, link }) =>
  link
    ? { text: `El email está apagado, así que mandale este link a ${email}:`, link }
    : { text: `Le mandamos la invitación a ${email}.`, link: null }
