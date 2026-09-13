/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */

/** The signed-in adult's own account. @param {{ families: FamiliesService }} deps */
export function createAccountsController({ families }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async me(request) {
      const { user } = request.session
      return { user, family: await families.familyOf(user.id) }
    },
  }
}
