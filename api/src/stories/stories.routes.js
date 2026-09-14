/** @typedef {ReturnType<typeof import('./stories.controller.js').createStoriesController>} StoriesController */

const option = {
  type: 'object',
  required: ['id', 'title', 'teaser', 'minutes'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
  },
}

const story = {
  type: 'object',
  required: ['id', 'templateId', 'title', 'teaser', 'minutes', 'parts'],
  properties: {
    id: { type: 'string' },
    templateId: { type: ['string', 'null'] },
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
    parts: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
  },
}

const optionsQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    // The options already on screen, for "Otras opciones".
    exclude: { type: 'array', maxItems: 20, items: { type: 'string', format: 'uuid' } },
  },
}

const writeBody = {
  type: 'object',
  additionalProperties: false,
  required: ['templateId'],
  properties: { templateId: { type: 'string', format: 'uuid' } },
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: StoriesController, guards: import('fastify').preHandlerAsyncHookHandler[] }} options
 */
export async function storiesRoutes(app, { controller, guards }) {
  app.get(
    '/stories/options',
    { preHandler: guards, schema: { querystring: optionsQuery, response: { 200: { type: 'array', items: option } } } },
    controller.options,
  )
  app.post('/stories', { preHandler: guards, schema: { body: writeBody, response: { 200: story } } }, controller.write)
}
