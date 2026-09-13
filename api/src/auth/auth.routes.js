import { fromNodeHeaders } from 'better-auth/node'

/** @typedef {import('./auth.js').Auth} Auth */

/**
 * Hands /auth/* to Better Auth: sign-up, sign-in, sign-out, and sessions.
 * Caddy strips /api before proxying, and Better Auth routes on its full base
 * path, so the prefix goes back on.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ auth: Auth, baseURL: string }} options
 */
export async function authRoutes(app, { auth, baseURL }) {
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    async handler(request, reply) {
      const headers = fromNodeHeaders(request.headers)
      headers.delete('content-length')
      const response = await auth.handler(
        new Request(new URL(`/api${request.url}`, baseURL), {
          method: request.method,
          headers,
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
        }),
      )
      reply.status(response.status)
      for (const [key, value] of response.headers) if (key !== 'set-cookie') reply.header(key, value)
      const cookies = response.headers.getSetCookie()
      if (cookies.length > 0) reply.header('set-cookie', cookies)
      return reply.send(response.body ? await response.text() : null)
    },
  })
}
