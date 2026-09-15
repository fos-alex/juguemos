/** @typedef {ReturnType<typeof import('./health.controller.js').createHealthController>} HealthController */

/** @param {import('fastify').FastifyInstance} app @param {{ controller: HealthController }} options */
export async function healthRoutes(app, { controller }) {
  app.get('/health', { config: { access: 'public' } }, controller.check)
}
