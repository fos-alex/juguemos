/** @typedef {import('./toys.service.js').ToysService} ToysService */
/** @typedef {import('./toys.service.js').ToyInput} ToyInput */

/** The signed-in adult's toy box. @param {{ toys: ToysService }} deps */
export function createToysController({ toys }) {
  /** @param {import('fastify').FastifyRequest} request */
  const familyOf = (request) => /** @type {string} */ (request.familyId)
  /** @param {import('fastify').FastifyRequest} request */
  const toyOf = (request) => /** @type {{ id: string }} */ (request.params).id

  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async list(request) {
      return { toys: await toys.list(familyOf(request)) }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async add(request, reply) {
      const toy = await toys.add(familyOf(request), /** @type {ToyInput & { name: string }} */ (request.body))
      return reply.code(201).send(toy)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async edit(request) {
      return toys.edit(familyOf(request), toyOf(request), /** @type {ToyInput} */ (request.body))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async remove(request, reply) {
      await toys.remove(familyOf(request), toyOf(request))
      return reply.code(204).send()
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async link(request) {
      const { toys: linked } = /** @type {{ toys: string[] }} */ (request.body)
      return { toys: await toys.link(familyOf(request), toyOf(request), linked) }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async materials(request) {
      return { materials: await toys.materials(familyOf(request)) }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async chooseMaterials(request) {
      const { have } = /** @type {{ have: string[] }} */ (request.body)
      return { materials: await toys.chooseMaterials(familyOf(request), have) }
    },
  }
}
