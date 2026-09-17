/** @typedef {import('./invitations.service.js').InvitationsService} InvitationsService */

/** Invitations: the admin's Usuarios page, and the link's landing screen. @param {{ invitations: InvitationsService }} deps */
export function createInvitationsController({ invitations }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async check(request) {
      return invitations.check(/** @type {{ token: string, email: string }} */ (request.body))
    },

    /** The accounts and the invitations, for the admin. @type {import('fastify').RouteHandlerMethod} */
    async users() {
      const [accounts, sent] = await Promise.all([invitations.accounts(), invitations.list()])
      return { users: accounts, invitations: sent }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async invite(request, reply) {
      const { email } = /** @type {{ email: string }} */ (request.body)
      return reply.code(201).send(await invitations.invite(email))
    },
  }
}
