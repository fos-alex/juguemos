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
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: ActivitiesController, guards: import('fastify').preHandlerAsyncHookHandler[] }} options
 */
export async function activitiesRoutes(app, { controller, guards }) {
  app.post(
    '/activities/suggestions',
    { preHandler: guards, schema: { body: suggestion, response: { 201: activity } } },
    controller.suggest,
  )
}
