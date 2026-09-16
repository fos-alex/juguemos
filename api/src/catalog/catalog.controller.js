import { MATERIAL_CATEGORIES } from '../materials/materials.js'
import { THEMES } from './themes.js'

/** @typedef {import('./catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('./catalog.service.js').ActivityTemplateInput} ActivityTemplateInput */
/** @typedef {import('./catalog.service.js').ActivityTemplateUpdate} ActivityTemplateUpdate */

/** The catalog admin's activity templates. @param {{ catalog: CatalogService }} deps */
export function createCatalogController({ catalog }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async listTemplates() {
      return catalog.listTemplates()
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async getTemplate(request) {
      return catalog.templateById(idOf(request))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async createTemplate(request, reply) {
      const template = await catalog.createTemplate(/** @type {ActivityTemplateInput} */ (request.body))
      return reply.code(201).send(template)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async updateTemplate(request) {
      return catalog.updateTemplate(idOf(request), /** @type {ActivityTemplateUpdate} */ (request.body))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async deleteTemplate(request, reply) {
      await catalog.deleteTemplate(idOf(request))
      return reply.code(204).send()
    },

    /** The materials a template can name. @type {import('fastify').RouteHandlerMethod} */
    async materials() {
      return MATERIAL_CATEGORIES
    },

    /** The themes a template can be about. @type {import('fastify').RouteHandlerMethod} */
    async themes() {
      return THEMES.map(({ key, label }) => ({ key, label }))
    },
  }
}

/** @param {import('fastify').FastifyRequest} request */
const idOf = (request) => /** @type {{ id: string }} */ (request.params).id
