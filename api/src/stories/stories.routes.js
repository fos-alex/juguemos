import { errorBody, text, uuid } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./stories.controller.js').createStoriesController>} StoriesController */

// Every route here needs a session and a family, so 401 and 409 are always
// possible; a route that names a story can answer that there is no such story.
const errors = { 400: errorBody, 401: errorBody, 409: errorBody, 500: errorBody }
const storyErrors = { ...errors, 404: errorBody }
// Writing a story from a keyword, and every series, needs the LLM, so these
// routes can also say it is off.
const writeErrors = { ...storyErrors, 503: errorBody }

/** As long as an interest the family profile lets a parent type. */
const KEYWORD_MAX = 80

// The series a story is an episode of (JUG-59), which is how the reading
// screen knows to say so. Null on a story that stands on its own.
const storySeries = {
  type: ['object', 'null'],
  required: ['id', 'title', 'episode'],
  properties: { id: { type: 'string' }, title: { type: 'string' }, episode: { type: 'integer' } },
}

const story = {
  type: 'object',
  required: ['id', 'templateId', 'plotId', 'keyword', 'series', 'title', 'teaser', 'minutes', 'parts'],
  properties: {
    id: { type: 'string' },
    templateId: { type: ['string', 'null'] },
    plotId: { type: ['string', 'null'] },
    keyword: { type: ['string', 'null'] },
    series: storySeries,
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
    parts: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
  },
}

// One series with its episodes in order, which is how the web both lists them
// and opens one.
const series = {
  type: 'object',
  required: ['id', 'title', 'storyline', 'episodes', 'maxEpisodes', 'createdAt'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    storyline: { type: 'string' },
    episodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'minutes', 'episode', 'createdAt'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          minutes: { type: 'integer' },
          episode: { type: 'integer' },
          createdAt: { type: 'string' },
        },
      },
    },
    // How many episodes this series holds in all, so the web can say when it is full.
    maxEpisodes: { type: 'integer' },
    createdAt: { type: 'string' },
  },
}

const seriesList = { type: 'object', required: ['series'], properties: { series: { type: 'array', items: series } } }

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

const idParams = { type: 'object', required: ['id'], properties: { id: uuid } }

const writeBody = {
  type: 'object',
  additionalProperties: false,
  required: ['templateId'],
  properties: { templateId: uuid },
}

// A story to read: either one the family was offered, by its id, or an
// interest they tapped, by its own words (JUG-140). Exactly one of the two.
const streamBody = {
  type: 'object',
  additionalProperties: false,
  properties: { id: uuid, keyword: text(KEYWORD_MAX) },
  oneOf: [{ required: ['id'] }, { required: ['keyword'] }],
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
  app.post('/stories/write', { config, schema: { body: streamBody, response: writeErrors } }, controller.writeStream)
  app.get(
    '/stories',
    { config, schema: { response: { 200: { type: 'array', items: savedStory }, ...errors } } },
    controller.list,
  )
  app.get('/stories/:id', { config, schema: { params: idParams, response: { 200: story, ...storyErrors } } }, controller.find)

  // Series (JUG-59). Starting one and writing an episode both need the LLM,
  // so both can say the feature is off; a series that is already as long as it
  // gets answers 409, like a story the family profile can't fill.
  app.post(
    '/stories/:id/series',
    { config, schema: { params: idParams, response: { 201: series, ...writeErrors } } },
    controller.makeSeries,
  )
  app.get('/series', { config, schema: { response: { 200: seriesList, ...errors } } }, controller.listSeries)
  app.get('/series/:id', { config, schema: { params: idParams, response: { 200: series, ...storyErrors } } }, controller.findSeries)
  app.delete('/series/:id', { config, schema: { params: idParams, response: storyErrors } }, controller.removeSeries)
  app.post('/series/:id/episodes', { config, schema: { params: idParams, response: writeErrors } }, controller.writeEpisode)
}