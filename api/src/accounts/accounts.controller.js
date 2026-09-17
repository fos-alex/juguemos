import { userOf } from '../auth/session.js'

/** @typedef {import('./accounts.service.js').AccountsService} AccountsService */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/understanding.js').UnderstandingService} UnderstandingService */

/**
 * The signed-in adult's own account, and the admin removing one.
 * @param {{ accounts: AccountsService, families: FamiliesService, understanding: UnderstandingService }} deps
 */
export function createAccountsController({ accounts, families, understanding }) {
  return {
    /**
     * `familyFromText` says whether an LLM can read a family from the parent's
     * own words, so the web knows where first run starts.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async me(request) {
      const user = userOf(request)
      return { user, family: await families.familyOf(user.id), familyFromText: understanding.available }
    },

    /**
     * The admin removing an account, with the family it owns (JUG-175).
     * @type {import('fastify').RouteHandlerMethod}
     */
    async remove(request, reply) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      await accounts.remove(id)
      return reply.code(204).send()
    },
  }
}
