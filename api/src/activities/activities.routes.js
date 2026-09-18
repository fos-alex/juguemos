import { errorBody, uuid } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./activities.controller.js').createActivitiesController>} ActivitiesController */

const reaction = { type: ['string', 'null'], enum: ['up', 'down', null] }

// A discovery game dealt with the juego (JUG-177), or null. A round's credit
// is there only when its recording's license asks for one.
const game = {
  type: ['object', 'null'],
  required: ['type', 'set', 'rounds'],
  properties: {
    type: { type: 'string', enum: ['sounds'] },
    set: { type: 'string' },
    rounds: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sound', 'options', 'answer', 'credit'],
        properties: {
          sound: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'integer' },
          credit: {
            type: ['object', 'null'],
            required: ['author', 'license', 'source'],
            properties: { author: { type: 'string' }, license: { type: 'string' }, source: { type: 'string' } },
          },
        },
      },
    },
  },
}

const activity = {
  type: 'object',
  required: ['id', 'title', 'minutes', 'place', 'why', 'needs', 'steps', 'easier', 'harder', 'game', 'reaction'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    minutes: { type: 'integer' },
    place: { type: 'string', enum: ['indoor', 'outdoor'] },
    why: { type: 'string' },
    needs: { type: 'string' },
    steps: { type: 'array', items: { type: 'string' } },
    easier: { type: 'string' },
    harder: { type: 'string' },
    game,
    reaction,
  },
}

const suggestion = {
  type: 'object',
  additionalProperties: false,
  properties: {
    // The activity on screen, when the parent asks for another one.
    after: { type: ['string', 'null'], format: 'uuid' },
    // The moment the juego is for (JUG-26): calm winds the kids down, lively
    // gets them moving, null asks for no preference. Left out, the server's
    // clock decides, so an old client still gets a calm juego before bed.
    mood: { type: ['string', 'null'], enum: ['calm', 'lively', null] },
  },
}

// The feedback tap (JUG-23): how the juego went, or null to take it back.
const reactionInput = {
  type: 'object',
  additionalProperties: false,
  required: ['reaction'],
  properties: { reaction },
}

const reacted = {
  type: 'object',
  required: ['id', 'reaction'],
  properties: { id: { type: 'string' }, reaction },
}

/**
 * Activities for an adult who has already saved a family. 404 is the catalog
 * having nothing that fits it yet, or a reaction to a juego that isn't the
 * family's.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: ActivitiesController }} options
 */
export async function activitiesRoutes(app, { controller }) {
  app.post(
    '/activities/suggestions',
    {
      config: { access: 'family' },
      schema: {
        body: suggestion,
        response: { 201: activity, 400: errorBody, 401: errorBody, 404: errorBody, 409: errorBody, 500: errorBody },
      },
    },
    controller.suggest,
  )
  app.put(
    '/activities/:id/reaction',
    {
      config: { access: 'family' },
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        body: reactionInput,
        response: { 200: reacted, 400: errorBody, 401: errorBody, 404: errorBody, 409: errorBody, 500: errorBody },
      },
    },
    controller.react,
  )
}
