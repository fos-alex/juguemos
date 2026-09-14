import { fromNodeHeaders } from 'better-auth/node'

/** @typedef {import('./auth.js').Auth} Auth */

/**
 * A preHandler for routes that need a signed-in adult. It puts their session
 * on `request.session`, or answers 401.
 * @param {Auth} auth
 * @returns {import('fastify').preHandlerAsyncHookHandler}
 */
export function createRequireSession(auth) {
  return async function requireSession(request, reply) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
    if (!session) return reply.code(401).send({ error: 'unauthorized' })
    request.session = session
  }
}
