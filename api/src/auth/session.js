import { fromNodeHeaders } from 'better-auth/node'

/** @typedef {import('./auth.js').Auth} Auth */
/**
 * What Better Auth hands back for a signed-in adult: `{ user, session }`.
 * @typedef {NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>} Session
 */

/**
 * A request after the access hook in app.js has run. The hook is what puts
 * these there: `session` on every route whose access is `session` or
 * `family`, and `familyId` on the ones whose access is `family`.
 * @typedef {import('fastify').FastifyRequest & {
 *   session: Session,
 *   familyId: string | null,
 * }} AppRequest
 */

/**
 * A preHandler for routes that need a signed-in adult, which app.js runs on
 * every route whose access isn't public. It puts their session on
 * `request.session`, or answers 401.
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

/**
 * The signed-in adult. Only call it from a route that needs a session, since
 * that is what put them on the request.
 * @param {import('fastify').FastifyRequest} request
 * @returns {Session['user']}
 */
export function userOf(request) {
  return /** @type {AppRequest} */ (request).session.user
}
