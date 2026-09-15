import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./activities.controller.js').createActivitiesController>} ActivitiesController */

const activity = {
  type: 'object',
  required: ['id', 'title', 'minutes', 'place', 'why', 'needs', 'steps', 'easier', 'harder'],
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
  },
}

const suggestion = {
  type: 'object',
  additionalProperties: false,
  properties: {
    // The activity on screen, when the parent asks for another one.
    after: { type: ['string', 'null'], format: 'uuid' },
  },
}

/**
 * Activities for an adult who has already saved a family. 404 is the catalog
 * having nothing that fits it yet.
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
}
