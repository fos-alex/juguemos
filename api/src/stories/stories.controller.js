/** @typedef {import('./stories.service.js').StoriesService} StoriesService */

/** Stories for the signed-in adult's family. @param {{ stories: StoriesService }} deps */
export function createStoriesController({ stories }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async options(request) {
      const { exclude = [] } = /** @type {{ exclude?: string[] }} */ (request.query)
      return stories.options(/** @type {string} */ (request.familyId), { exclude })
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async write(request) {
      const { templateId } = /** @type {{ templateId: string }} */ (request.body)
      return stories.write(/** @type {string} */ (request.familyId), templateId)
    },
  }
}
