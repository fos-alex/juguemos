import { NotFoundError } from '../errors.js'

/** @typedef {import('./families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('./families.service.js').ProfileInput} ProfileInput */
/** @typedef {import('./understanding.js').UnderstandingService} UnderstandingService */

/**
 * The signed-in adult's family profile.
 * @param {{ families: FamiliesService, understanding: UnderstandingService }} deps
 */
export function createFamiliesController({ families, understanding }) {
  return {
    /**
     * Reads a family from the parent's own words and returns it to confirm.
     * Nothing is saved.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async understand(request) {
      const { text } = /** @type {{ text: string }} */ (request.body)
      const userId = request.session.user.id
      return understanding.understand(text, { userId, familyId: await families.idOf(userId) })
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async get(request) {
      const familyId = await families.idOf(request.session.user.id)
      if (!familyId) throw new NotFoundError('No family yet')
      return families.profileOf(familyId, request.session.user.id)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async save(request) {
      return families.saveProfile(request.session.user.id, /** @type {ProfileInput} */ (request.body))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async choosePlaying(request) {
      const { kids } = /** @type {{ kids: string[] }} */ (request.body)
      return families.choosePlaying(request.session.user.id, kids)
    },
  }
}
