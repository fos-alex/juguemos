/** @typedef {import('../activities/activities.service.js').ActivitiesService} ActivitiesService */
/** @typedef {import('../activities/activities.service.js').ActivityTemplateInput} ActivityTemplateInput */
/** @typedef {import('../activities/activities.service.js').ActivityTemplateUpdate} ActivityTemplateUpdate */

/** The catalog admin's activity templates. @param {{ activities: ActivitiesService }} deps */
export function createAdminController({ activities }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async listTemplates() {
      return activities.listTemplates()
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async getTemplate(request) {
      return activities.templateById(idOf(request))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async createTemplate(request, reply) {
      const template = await activities.createTemplate(/** @type {ActivityTemplateInput} */ (request.body))
      return reply.code(201).send(template)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async updateTemplate(request) {
      return activities.updateTemplate(idOf(request), /** @type {ActivityTemplateUpdate} */ (request.body))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async deleteTemplate(request, reply) {
      await activities.deleteTemplate(idOf(request))
      return reply.code(204).send()
    },
  }
}

/** @param {import('fastify').FastifyRequest} request */
const idOf = (request) => /** @type {{ id: string }} */ (request.params).id
