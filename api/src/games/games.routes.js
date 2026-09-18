import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./games.controller.js').createGamesController>} GamesController */

const soundParams = {
  type: 'object',
  required: ['set', 'file'],
  properties: { set: { type: 'string', pattern: '^[a-z]+$' }, file: { type: 'string', pattern: '^[a-z0-9-]+\\.mp3$' } },
}

/**
 * The recordings ¿Qué suena? plays (JUG-177), for a signed-in adult. The
 * answer is the MP3 itself, so only the errors have a schema.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: GamesController }} options
 */
export async function gamesRoutes(app, { controller }) {
  app.get(
    '/sounds/:set/:file',
    { schema: { params: soundParams, response: { 400: errorBody, 401: errorBody, 404: errorBody, 500: errorBody } } },
    controller.sound,
  )
}
