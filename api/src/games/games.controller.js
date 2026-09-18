/** @typedef {import('./games.service.js').GamesService} GamesService */

/** The recordings a game plays. @param {{ games: GamesService }} deps */
export function createGamesController({ games }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async sound(request, reply) {
      const { set, file } = /** @type {{ set: string, file: string }} */ (request.params)
      const audio = await games.sound(set, file)
      // A recording changes only with a deploy, and a day is short enough for that.
      return reply.type('audio/mpeg').header('Cache-Control', 'private, max-age=86400').send(audio)
    },
  }
}
