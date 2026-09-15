/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/understanding.js').UnderstandingService} UnderstandingService */

/**
 * The signed-in adult's own account.
 * @param {{ families: FamiliesService, understanding: UnderstandingService }} deps
 */
export function createAccountsController({ families, understanding }) {
  return {
    /**
     * `familyFromText` says whether an LLM can read a family from the parent's
     * own words, so the web knows where first run starts.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async me(request) {
      const { user } = request.session
      return { user, family: await families.familyOf(user.id), familyFromText: understanding.available }
    },
  }
}
