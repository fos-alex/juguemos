import Fastify from 'fastify'
import { createAccountsController } from './accounts/accounts.controller.js'
import { accountsRoutes } from './accounts/accounts.routes.js'
import { createAuth } from './auth/auth.js'
import { authRoutes } from './auth/auth.routes.js'
import { createRequireSession } from './auth/session.js'
import { createFamiliesService } from './families/families.service.js'
import { createHealthController } from './health/health.controller.js'
import { healthRoutes } from './health/health.routes.js'

/**
 * Builds the API with every dependency wired in, here and nowhere else.
 * Routes map URLs to controllers, controllers speak HTTP, and services hold
 * the business logic and the SQL. server.js runs the result; tests build
 * their own on a scratch database.
 * @param {{
 *   config: import('./config.js').Config,
 *   db: import('pg').Pool,
 *   logger?: import('fastify').FastifyServerOptions['logger'],
 * }} options
 */
export function buildApp({ config, db, logger = true }) {
  const families = createFamiliesService({ db })
  const auth = createAuth({ config: config.auth, db, families })
  const requireSession = createRequireSession(auth)

  const app = Fastify({ logger })
  app.decorateRequest('session', null)
  app.setErrorHandler(handleError)
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not found' }))

  app.register(healthRoutes, { controller: createHealthController({ db }) })
  app.register(authRoutes, { auth, baseURL: config.auth.url })
  app.register(accountsRoutes, { controller: createAccountsController({ families }), requireSession })

  return app
}

/**
 * One shape for every failure. A client's own mistake gets its message; ours
 * are logged and never described.
 * @type {Parameters<import('fastify').FastifyInstance['setErrorHandler']>[0]}
 */
function handleError(error, request, reply) {
  const status = error.statusCode ?? 500
  if (status >= 500) {
    request.log.error({ err: error }, 'request failed')
    return reply.code(500).send({ error: 'internal error' })
  }
  return reply.code(status).send({ error: error.message })
}
