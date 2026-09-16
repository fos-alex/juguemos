/**
 * The catalog admin's activity templates. The admin has no login yet, so the
 * API serves these only where ADMIN_ENABLED turns it on.
 */
import { request } from '../../shared/http'

/** @typedef {import('./types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('./types').ActivityTemplateFields} ActivityTemplateFields */
/** @typedef {import('./types').MaterialCategory} MaterialCategory */

const TEMPLATES = '/admin/activity-templates'

/** Every template in the catalog, on or off. @returns {Promise<ActivityTemplate[]>} */
export function listTemplates() {
  return request('GET', TEMPLATES)
}

/** @param {string} id @returns {Promise<ActivityTemplate>} */
export function loadTemplate(id) {
  return request('GET', `${TEMPLATES}/${id}`)
}

/** @param {ActivityTemplateFields & { slug: string }} template @returns {Promise<ActivityTemplate>} */
export function createTemplate(template) {
  return request('POST', TEMPLATES, template)
}

/**
 * Saves everything but the slug, which never changes.
 * @param {string} id
 * @param {ActivityTemplateFields} template
 * @returns {Promise<ActivityTemplate>}
 */
export function saveTemplate(id, template) {
  return request('PUT', `${TEMPLATES}/${id}`, template)
}

/** Deletes a template for good: the catalog seed never brings it back. @param {string} id */
export async function deleteTemplate(id) {
  await request('DELETE', `${TEMPLATES}/${id}`)
}

/** The materials a template can name, by category. @returns {Promise<MaterialCategory[]>} */
export function listMaterials() {
  return request('GET', '/admin/materials')
}
