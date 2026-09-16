import { errorBody, text, uuid as id } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./families.controller.js').createFamiliesController>} FamiliesController */

// What every route here can refuse with: bad input, no session, or our own fault.
const errors = { 400: errorBody, 401: errorBody, 500: errorBody }

const named = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { type: 'string' }, name: { type: 'string' } },
}

const words = { type: 'array', items: { type: 'string' } }

const profile = {
  type: 'object',
  required: ['id', 'name', 'kids', 'pets', 'toys'],
  properties: {
    id: { type: 'string' },
    name: { type: ['string', 'null'] },
    kids: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'age', 'playing', 'interests'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: ['integer', 'null'] },
          // Whether the kid plays with the signed-in adult (JUG-107).
          playing: { type: 'boolean' },
          // What this kid loves (JUG-144).
          interests: words,
        },
      },
    },
    pets: { type: 'array', items: named },
    toys: { type: 'array', items: named },
  },
}

// The whole profile, as the parent last saw it. Items that carry the id of an
// existing row update it; the rest are new.
const profileInput = {
  type: 'object',
  additionalProperties: false,
  required: ['kids', 'pets', 'toys'],
  properties: {
    name: { type: ['string', 'null'], maxLength: 80 },
    kids: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'age'],
        properties: {
          id,
          name: text(80),
          age: { type: ['integer', 'null'], minimum: 0, maximum: 17 },
          // What this kid loves (JUG-144); a kid sent without them loves nothing yet.
          interests: { type: 'array', maxItems: 30, items: text(80) },
        },
      },
    },
    pets: {
      type: 'array',
      maxItems: 10,
      items: { type: 'object', additionalProperties: false, required: ['name'], properties: { id, name: text(80) } },
    },
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

// The parent's own words about their family, for the LLM to read (JUG-11).
const understandingInput = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string', minLength: 1, maxLength: 4000 } },
}

// A profile for the parent to confirm, not saved, and the fields to check.
const understanding = {
  type: 'object',
  required: ['family', 'unsure', 'note'],
  properties: {
    family: {
      type: 'object',
      required: ['kids', 'pets', 'toys'],
      properties: {
        kids: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'age', 'interests'],
            properties: { name: { type: 'string' }, age: { type: ['integer', 'null'] }, interests: words },
          },
        },
        pets: { type: 'array', items: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
        toys: { type: 'array', items: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
      },
    },
    unsure: { type: 'array', items: { type: 'string' } },
    note: { type: ['string', 'null'] },
  },
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: FamiliesController }} options
 */
export async function familiesRoutes(app, { controller }) {
  app.get('/family', { schema: { response: { 200: profile, ...errors, 404: errorBody } } }, controller.get)
  app.put('/family', { schema: { body: profileInput, response: { 200: profile, ...errors } } }, controller.save)
  app.put(
    '/family/playing',
    { schema: { body: playingInput, response: { 200: profile, ...errors, 404: errorBody } } },
    controller.choosePlaying,
  )
  // 503 with LLM_OFF when this server has no LLM to read the text with.
  app.post(
    '/family/understanding',
    { schema: { body: understandingInput, response: { 200: understanding, ...errors, 503: errorBody } } },
    controller.understand,
  )
}
