/** @typedef {ReturnType<typeof import('./families.controller.js').createFamiliesController>} FamiliesController */

const id = { type: 'string', format: 'uuid' }
/** @param {number} maxLength */
const text = (maxLength) => ({ type: 'string', minLength: 1, maxLength })

const named = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { type: 'string' }, name: { type: 'string' } },
}

const profile = {
  type: 'object',
  required: ['id', 'name', 'kids', 'pets', 'interests', 'toys'],
  properties: {
    id: { type: 'string' },
    name: { type: ['string', 'null'] },
    kids: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'age', 'playing'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: ['integer', 'null'] },
          // Whether the kid plays with the signed-in adult (JUG-107).
          playing: { type: 'boolean' },
        },
      },
    },
    pets: { type: 'array', items: named },
    interests: { type: 'array', items: { type: 'string' } },
    toys: { type: 'array', items: named },
  },
}

// The whole profile, as the parent last saw it. Items that carry the id of an
// existing row update it; the rest are new.
const profileInput = {
  type: 'object',
  additionalProperties: false,
  required: ['kids', 'pets', 'interests', 'toys'],
  properties: {
    name: { type: ['string', 'null'], maxLength: 80 },
    kids: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'age'],
        properties: { id, name: text(80), age: { type: ['integer', 'null'], minimum: 0, maximum: 17 } },
      },
    },
    pets: {
      type: 'array',
      maxItems: 10,
      items: { type: 'object', additionalProperties: false, required: ['name'], properties: { id, name: text(80) } },
    },
    interests: { type: 'array', maxItems: 30, items: text(80) },
    toys: {
      type: 'array',
      maxItems: 200,
      items: { type: 'object', additionalProperties: false, required: ['name'], properties: { id, name: text(120) } },
    },
  },
}

// The kids playing with the signed-in adult; the family's other kids sit out.
const playingInput = {
  type: 'object',
  additionalProperties: false,
  required: ['kids'],
  properties: { kids: { type: 'array', minItems: 1, maxItems: 12, uniqueItems: true, items: id } },
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: FamiliesController }} options
 */
export async function familiesRoutes(app, { controller }) {
  app.get('/family', { schema: { response: { 200: profile } } }, controller.get)
  app.put('/family', { schema: { body: profileInput, response: { 200: profile } } }, controller.save)
  app.put('/family/playing', { schema: { body: playingInput, response: { 200: profile } } }, controller.choosePlaying)
}
