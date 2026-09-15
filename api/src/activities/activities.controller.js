import { userOf } from '../auth/session.js'
import { familyOf } from '../families/require-family.js'

/** @typedef {import('./activities.service.js').ActivitiesService} ActivitiesService */

/** Activities for the signed-in adult's family. @param {{ activities: ActivitiesService }} deps */
export function createActivitiesController({ activities }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async suggest(request, reply) {
      const { after = null } = /** @type {{ after?: string | null }} */ (request.body ?? {})
      const activity = await activities.suggest(familyOf(request), { after, userId: userOf(request).id })
      return reply.code(201).send(activity)
    },
  }
}
