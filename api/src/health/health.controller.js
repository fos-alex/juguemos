/** Whether the API can reach its database. @param {{ db: import('pg').Pool }} deps */
export function createHealthController({ db }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async check(request, reply) {
      try {
        await db.query('select 1')
        return { status: 'ok', db: 'up' }
      } catch (error) {
        request.log.error({ err: error }, 'database health check failed')
        return reply.code(503).send({ status: 'ok', db: 'down' })
      }
    },
  }
}
