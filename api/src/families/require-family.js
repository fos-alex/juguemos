/** @typedef {import('./families.service.js').FamiliesService} FamiliesService */

/**
 * A preHandler for routes about the family, run after requireSession. It puts
 * the signed-in adult's family on `request.familyId`, or answers 409 when
 * they haven't told us about their family yet.
 * @param {FamiliesService} families
 * @returns {import('fastify').preHandlerAsyncHookHandler}
 */
export function createRequireFamily(families) {
  return async function requireFamily(request, reply) {
    const familyId = await families.idOf(request.session.user.id)
    if (!familyId) return reply.code(409).send({ error: 'family required' })
    request.familyId = familyId
  }
}
