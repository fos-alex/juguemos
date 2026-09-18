import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./history.controller.js').createHistoryController>} HistoryController */

// A juego the family played (JUG-188), as its card shows it; the rest of it
// is one GET /activities/:id away.
const played = {
  type: 'object',
  required: ['id', 'title', 'minutes', 'place', 'reaction', 'playedAt'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    minutes: { type: 'integer' },
    place: { type: 'string', enum: ['indoor', 'outdoor'] },
    reaction: { type: ['string', 'null'], enum: ['up', 'down', null] },
    playedAt: { type: 'string' },
  },
}

// A story the family read, with the series it is an episode of while they follow it.
const read = {
  type: 'object',
  required: ['id', 'title', 'teaser', 'minutes', 'series', 'readAt'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    teaser: { type: 'string' },
    minutes: { type: 'integer' },
    series: {
      type: ['object', 'null'],
      required: ['id', 'title', 'episode'],
      properties: { id: { type: 'string' }, title: { type: 'string' }, episode: { type: 'integer' } },
    },
    readAt: { type: 'string' },
  },
}

const history = {
  type: 'object',
  required: ['activities', 'stories'],
  properties: {
    activities: { type: 'array', items: played },
    stories: { type: 'array', items: read },
  },
}

/**
 * The family's history (JUG-188), for an adult who has already saved a family.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: HistoryController }} options
 */
export async function historyRoutes(app, { controller }) {
  app.get(
    '/history',
    {
      config: { access: 'family' },
      schema: { response: { 200: history, 401: errorBody, 409: errorBody, 500: errorBody } },
    },
    controller.recent,
  )
}
