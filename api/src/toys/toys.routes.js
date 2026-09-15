import { MATERIAL_KEYS } from './materials.js'
import { MAX_TOYS } from './toys.service.js'

/** @typedef {ReturnType<typeof import('./toys.controller.js').createToysController>} ToysController */

const id = { type: 'string', format: 'uuid' }
/** @param {number} maxLength */
const text = (maxLength) => ({ type: 'string', minLength: 1, maxLength })

const toy = {
  type: 'object',
  required: ['id', 'name', 'aliases', 'description', 'kidId', 'shared', 'favorite', 'linked'],
  properties: {
    id: { type: 'string' },
    // The family's own name, the only one the parent ever sees.
    name: { type: 'string' },
    aliases: { type: 'array', items: { type: 'string' } },
    // What the toy actually is, for the AI. Never shown in place of the name.
    description: { type: ['string', 'null'] },
    kidId: { type: ['string', 'null'] },
    shared: { type: 'boolean' },
    favorite: { type: 'boolean' },
    // The other toys the kid tells this one apart from, by id.
    linked: { type: 'array', items: { type: 'string' } },
  },
}

const toyList = {
  type: 'object',
  required: ['toys'],
  properties: { toys: { type: 'array', items: toy } },
}

const materialList = {
  type: 'object',
  required: ['materials'],
  properties: {
    materials: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'label', 'have'],
        properties: { key: { type: 'string' }, label: { type: 'string' }, have: { type: 'boolean' } },
      },
    },
  },
}

// Names stay exactly as typed: nothing here trims, corrects, or capitalizes them.
const toyFields = {
  name: text(120),
  aliases: { type: 'array', maxItems: 20, uniqueItems: true, items: text(120) },
  description: { type: ['string', 'null'], minLength: 1, maxLength: 500 },
  kidId: { type: ['string', 'null'], format: 'uuid' },
  shared: { type: 'boolean' },
  favorite: { type: 'boolean' },
}

const newToy = { type: 'object', additionalProperties: false, required: ['name'], properties: toyFields }
const toyChanges = { type: 'object', additionalProperties: false, minProperties: 1, properties: toyFields }
const toyParams = { type: 'object', required: ['id'], properties: { id } }

const linksInput = {
  type: 'object',
  additionalProperties: false,
  required: ['toys'],
  properties: { toys: { type: 'array', maxItems: MAX_TOYS, uniqueItems: true, items: id } },
}

const materialsInput = {
  type: 'object',
  additionalProperties: false,
  required: ['have'],
  properties: { have: { type: 'array', uniqueItems: true, items: { type: 'string', enum: MATERIAL_KEYS } } },
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: ToysController, guards: import('fastify').preHandlerAsyncHookHandler[] }} options
 */
export async function toysRoutes(app, { controller, guards }) {
  app.get('/family/toys', { preHandler: guards, schema: { response: { 200: toyList } } }, controller.list)
  app.post('/family/toys', { preHandler: guards, schema: { body: newToy, response: { 201: toy } } }, controller.add)
  app.patch(
    '/family/toys/:id',
    { preHandler: guards, schema: { params: toyParams, body: toyChanges, response: { 200: toy } } },
    controller.edit,
  )
  app.delete('/family/toys/:id', { preHandler: guards, schema: { params: toyParams } }, controller.remove)
  app.put(
    '/family/toys/:id/links',
    { preHandler: guards, schema: { params: toyParams, body: linksInput, response: { 200: toyList } } },
    controller.link,
  )
  app.get('/family/materials', { preHandler: guards, schema: { response: { 200: materialList } } }, controller.materials)
  app.put(
    '/family/materials',
    { preHandler: guards, schema: { body: materialsInput, response: { 200: materialList } } },
    controller.chooseMaterials,
  )
}
