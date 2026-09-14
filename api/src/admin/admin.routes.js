/** @typedef {ReturnType<typeof import('./admin.controller.js').createAdminController>} AdminController */

const CATEGORIES = ['move', 'create', 'pretend', 'explore', 'learn', 'low_energy', 'helpers', 'out_and_about']

/** @param {number} maxLength */
const text = (maxLength) => ({ type: 'string', minLength: 1, maxLength })
/** @param {number} maxItems @param {number} [minItems] */
const lines = (maxItems, minItems = 0) => ({ type: 'array', minItems, maxItems, items: text(300) })

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
  materials: lines(20),
  skills: lines(20),
  safety: lines(20),
  why: text(600),
  needs: text(600),
  steps: lines(10, 1),
  easier: text(600),
  harder: text(600),
}
const requiredFields = Object.keys(fields).filter((name) => name !== 'active')
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

const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
}

/**
 * The catalog admin. It has no login yet, so its routes are public, and
 * app.js registers them only when ADMIN_ENABLED turns the admin on.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: AdminController }} options
 */
export async function adminRoutes(app, { controller }) {
  const config = { public: true }
  const url = '/admin/activity-templates'
  app.get(url, { config, schema: { response: { 200: { type: 'array', items: template } } } }, controller.listTemplates)
  app.post(url, { config, schema: { body: templateInput, response: { 201: template } } }, controller.createTemplate)
  app.get(`${url}/:id`, { config, schema: { params, response: { 200: template } } }, controller.getTemplate)
  app.put(
    `${url}/:id`,
    { config, schema: { params, body: templateUpdate, response: { 200: template } } },
    controller.updateTemplate,
  )
  app.delete(`${url}/:id`, { config, schema: { params } }, controller.deleteTemplate)
}
