import { NotFoundError } from '../errors.js'

/** @typedef {import('./families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('./families.service.js').ProfileInput} ProfileInput */

/** The signed-in adult's family profile. @param {{ families: FamiliesService }} deps */
export function createFamiliesController({ families }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async get(request) {
      const familyId = await families.idOf(request.session.user.id)
      if (!familyId) throw new NotFoundError('No family yet')
      return families.profileOf(familyId)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async save(request) {
      return families.saveProfile(request.session.user.id, /** @type {ProfileInput} */ (request.body))
    },
  }
}
