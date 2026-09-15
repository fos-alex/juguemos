import { userOf } from '../auth/session.js'

/** @typedef {import('./families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../auth/session.js').AppRequest} AppRequest */

/**
 * A preHandler for routes about the family, which app.js runs after
 * requireSession on every route whose access is `family`. It puts the
 * signed-in adult's family on `request.familyId`, or answers 409 when they
 * haven't told us about their family yet.
 * @param {FamiliesService} families
 * @returns {import('fastify').preHandlerAsyncHookHandler}
 */
export function createRequireFamily(families) {
  return async function requireFamily(request, reply) {
    const familyId = await families.idOf(userOf(request).id)
    if (!familyId) return reply.code(409).send({ error: 'family required' })
    request.familyId = familyId
  }
}

/**
 * The signed-in adult's family. Only call it from a route whose access is
 * `family`, since that is what put the id on the request.
 * @param {import('fastify').FastifyRequest} request
 * @returns {string}
 */
export function familyOf(request) {
  return /** @type {string} */ (/** @type {AppRequest} */ (request).familyId)
}
