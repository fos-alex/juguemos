/** @typedef {import('./activities.service.js').ActivitiesService} ActivitiesService */

/** Activities for the signed-in adult's family. @param {{ activities: ActivitiesService }} deps */
export function createActivitiesController({ activities }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async suggest(request, reply) {
      const { after = null } = /** @type {{ after?: string | null }} */ (request.body ?? {})
      const activity = await activities.suggest(/** @type {string} */ (request.familyId), {
        after,
        userId: request.session.user.id,
      })
      return reply.code(201).send(activity)
    },
  }
}
