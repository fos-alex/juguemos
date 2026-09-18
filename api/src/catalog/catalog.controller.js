import { MATERIAL_CATEGORIES } from '../materials/materials.js'
import { THEMES } from './themes.js'

/** @typedef {import('./catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('./catalog.service.js').ActivityTemplate} ActivityTemplate */
/** @typedef {import('./catalog.service.js').ActivityTemplateInput} ActivityTemplateInput */
/** @typedef {import('./catalog.service.js').ActivityTemplateUpdate} ActivityTemplateUpdate */
/** @typedef {import('../activities/activities.service.js').ActivitiesService} ActivitiesService */

/**
 * The catalog admin's activity templates, each sent with what every family
 * said about it and its rating now (JUG-192).
 * @param {{ catalog: CatalogService, activities: ActivitiesService }} deps
 */
export function createCatalogController({ catalog, activities }) {
  /** @param {ActivityTemplate[]} templates */
  const withReactions = async (templates) => {
    const ratings = await activities.ratings(templates)
    return templates.map((template) => ({ ...template, reactions: ratings.get(template.id) }))
  }
  /** @param {ActivityTemplate} template */
  const oneWithReactions = async (template) => (await withReactions([template]))[0]

  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async listTemplates() {
      return withReactions(await catalog.listTemplates())
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async getTemplate(request) {
      return oneWithReactions(await catalog.templateById(idOf(request)))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async createTemplate(request, reply) {
      const template = await catalog.createTemplate(/** @type {ActivityTemplateInput} */ (request.body))
      return reply.code(201).send(await oneWithReactions(template))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async updateTemplate(request) {
      const template = await catalog.updateTemplate(idOf(request), /** @type {ActivityTemplateUpdate} */ (request.body))
      return oneWithReactions(template)
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
