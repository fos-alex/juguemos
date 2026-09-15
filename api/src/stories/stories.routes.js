import { errorBody, uuid } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./stories.controller.js').createStoriesController>} StoriesController */

// Every route here needs a session and a family, so 401 and 409 are always
// possible; a route that names a story can answer that there is no such story.
const errors = { 400: errorBody, 401: errorBody, 409: errorBody, 500: errorBody }
const storyErrors = { ...errors, 404: errorBody }

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
    exclude: { type: 'array', maxItems: 20, items: uuid },
  },
}

const writeBody = {
  type: 'object',
  additionalProperties: false,
  required: ['templateId'],
  properties: { templateId: uuid },
}

const streamBody = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: { id: uuid },
}

/**
 * Stories for an adult who has already saved a family. The two streams have
 * no schema for their 200: they hijack the reply and send server-sent
 * events, described by the service's `OptionEvent` and `StoryEvent`. What
 * they can refuse with before the stream starts is a regular response, so
 * they declare those statuses.
 *
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: StoriesController }} options
 */
export async function storiesRoutes(app, { controller }) {
  const config = { access: 'family' }
  app.get('/stories/options', { config, schema: { querystring: optionsQuery, response: errors } }, controller.options)
  app.post(
    '/stories',
    { config, schema: { body: writeBody, response: { 200: story, ...storyErrors } } },
    controller.write,
  )
  app.post('/stories/write', { config, schema: { body: streamBody, response: storyErrors } }, controller.writeStream)
  app.get(
    '/stories',
    { config, schema: { response: { 200: { type: 'array', items: savedStory }, ...errors } } },
    controller.list,
  )
  app.get(
    '/stories/:id',
    {
      config,
      schema: { params: { type: 'object', properties: { id: uuid } }, response: { 200: story, ...storyErrors } },
    },
    controller.find,
  )
}