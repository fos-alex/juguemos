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
  required: ['id', 'templateId', 'plotId', 'title', 'teaser', 'minutes', 'parts'],
  properties: {
    id: { type: 'string' },
    templateId: { type: ['string', 'null'] },
    plotId: { type: ['string', 'null'] },
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
    parts: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
  },
}

const savedStory = {
  type: 'object',
  required: ['id', 'title', 'teaser', 'minutes', 'createdAt'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
    createdAt: { type: 'string' },
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

const streamBody = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
}

/**
 * The stream itself has no response schema: its events are described by the
 * service's `StoryEvent`, and the errors between them are regular ones.
 * Everything else on the line answers only with what its schema lets out.
 *
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
  app.post('/stories/write', { preHandler: guards, schema: { body: streamBody } }, controller.writeStream)
  app.get(
    '/stories',
    { preHandler: guards, schema: { response: { 200: { type: 'array', items: savedStory } } } },
    controller.list,
  )
  app.get(
    '/stories/:id',
    { preHandler: guards, schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }, response: { 200: story } } },
    controller.find,
  )
}