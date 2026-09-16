import { errorBody, lines, text, uuid } from '../http/schemas.js'
import { MATERIAL_KEYS } from '../materials/materials.js'
import { THEME_KEYS } from './themes.js'

/** @typedef {ReturnType<typeof import('./catalog.controller.js').createCatalogController>} CatalogController */

const CATEGORIES = ['move', 'create', 'pretend', 'explore', 'learn', 'low_energy', 'helpers', 'out_and_about']

// Bad input is 400, an unknown template 404, and a slug already taken 409.
const errors = { 400: errorBody, 404: errorBody, 409: errorBody, 500: errorBody }

// A template's fields, except its slug.
const fields = {
  title: text(120),
  active: { type: 'boolean' },
  minutes: { type: 'integer', minimum: 1, maximum: 240 },
  place: { type: 'string', enum: ['indoor', 'outdoor'] },
  minAgeMonths: { type: 'integer', minimum: 0, maximum: 215 },
  maxAgeMonths: { type: 'integer', minimum: 0, maximum: 215 },
  energy: { type: 'string', enum: ['low', 'medium', 'high'] },
  categories: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', enum: CATEGORIES } },
  smallSpace: { type: 'boolean' },
  // By key: what the template can't be played without (JUG-153).
  materials: { type: 'array', uniqueItems: true, maxItems: MATERIAL_KEYS.length, items: { type: 'string', enum: MATERIAL_KEYS } },
  // By key: what it is about, for the ranking (JUG-104).
  themes: { type: 'array', uniqueItems: true, maxItems: THEME_KEYS.length, items: { type: 'string', enum: THEME_KEYS } },
  skills: lines(20),
  safety: lines(20),
  why: text(600),
  needs: text(600),
  steps: lines(10, 1),
  easier: text(600),
  harder: text(600),
}
const requiredFields = Object.keys(fields).filter((name) => name !== 'active' && name !== 'themes')
const slug = { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', maxLength: 80 }

const templateInput = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', ...requiredFields],
  properties: { slug, ...fields },
}

// The slug names a template for the seeds, so an edit never changes it.
const templateUpdate = {
  type: 'object',
  additionalProperties: false,
  required: requiredFields,
  properties: fields,
}

const template = {
  type: 'object',
  required: ['id', 'slug', 'updatedAt', ...Object.keys(fields)],
  properties: {
    id: { type: 'string' },
    slug: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    ...fields,
  },
}

// The list a template's themes are picked from.
const themes = {
  type: 'array',
  items: { type: 'object', required: ['key', 'label'], properties: { key: { type: 'string' }, label: { type: 'string' } } },
}

// The list a template's materials are picked from, by category.
const materialCategories = {
  type: 'array',
  items: {
    type: 'object',
    required: ['key', 'label', 'materials'],
    properties: {
      key: { type: 'string' },
      label: { type: 'string' },
      materials: {
        type: 'array',
        items: {
          type: 'object',
          required: ['key', 'label'],
          properties: { key: { type: 'string' }, label: { type: 'string' } },
        },
      },
    },
  },
}

const params = {
  type: 'object',
  required: ['id'],
  properties: { id: uuid },
}

/**
 * The catalog admin. It has no login yet, so its routes are public, and
 * app.js registers them only when ADMIN_ENABLED turns the admin on.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: CatalogController }} options
 */
export async function catalogRoutes(app, { controller }) {
  const config = { access: 'public' }
  const url = '/admin/activity-templates'
  app.get(
    url,
    { config, schema: { response: { 200: { type: 'array', items: template }, ...errors } } },
    controller.listTemplates,
  )
  app.post(
    url,
    { config, schema: { body: templateInput, response: { 201: template, ...errors } } },
    controller.createTemplate,
  )
  app.get(`${url}/:id`, { config, schema: { params, response: { 200: template, ...errors } } }, controller.getTemplate)
  app.put(
    `${url}/:id`,
    { config, schema: { params, body: templateUpdate, response: { 200: template, ...errors } } },
    controller.updateTemplate,
  )
  app.delete(`${url}/:id`, { config, schema: { params, response: errors } }, controller.deleteTemplate)
  app.get('/admin/materials', { config, schema: { response: { 200: materialCategories } } }, controller.materials)
  app.get('/admin/themes', { config, schema: { response: { 200: themes } } }, controller.themes)
}
