import { familyOf } from '../families/require-family.js'

/** @typedef {import('./materials.service.js').MaterialsService} MaterialsService */

/** The signed-in adult's household materials. @param {{ materials: MaterialsService }} deps */
export function createMaterialsController({ materials }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async list(request) {
      return { categories: await materials.list(familyOf(request)) }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async mark(request) {
      const { key } = /** @type {{ key: string }} */ (request.params)
      const { have } = /** @type {{ have: boolean }} */ (request.body)
      return materials.mark(familyOf(request), key, have)
    },
  }
}
