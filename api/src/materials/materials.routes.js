import { errorBody } from '../http/schemas.js'
import { MATERIAL_KEYS } from './materials.js'

/** @typedef {ReturnType<typeof import('./materials.controller.js').createMaterialsController>} MaterialsController */

// Every route here needs a session and a family, so 401 and 409 are always possible.
const errors = { 401: errorBody, 409: errorBody, 500: errorBody }

const material = {
  type: 'object',
  required: ['key', 'label', 'have'],
  properties: { key: { type: 'string' }, label: { type: 'string' }, have: { type: 'boolean' } },
}

const categoryList = {
  type: 'object',
  required: ['categories'],
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'label', 'materials'],
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          materials: { type: 'array', items: material },
        },
      },
    },
  },
}

const materialParams = {
  type: 'object',
  required: ['key'],
  properties: { key: { type: 'string', enum: MATERIAL_KEYS } },
}

const markInput = {
  type: 'object',
  additionalProperties: false,
  required: ['have'],
  properties: { have: { type: 'boolean' } },
}

/**
 * The household materials, for an adult who has already saved a family. Each
 * tap saves one material, so two phones changing different ones never undo
 * each other.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: MaterialsController }} options
 */
export async function materialsRoutes(app, { controller }) {
  const config = { access: 'family' }
  app.get('/family/materials', { config, schema: { response: { 200: categoryList, ...errors } } }, controller.list)
  app.put(
    '/family/materials/:key',
    { config, schema: { params: materialParams, body: markInput, response: { 200: material, ...errors, 400: errorBody } } },
    controller.mark,
  )
}
