import Fastify from 'fastify'
import { createAccountsController } from './accounts/accounts.controller.js'
import { accountsRoutes } from './accounts/accounts.routes.js'
import { createActivitiesController } from './activities/activities.controller.js'
import { activitiesRoutes } from './activities/activities.routes.js'
import { createActivitiesService } from './activities/activities.service.js'
import { createAuth } from './auth/auth.js'
import { authRoutes } from './auth/auth.routes.js'
import { createRequireSession } from './auth/session.js'
import { createFamiliesController } from './families/families.controller.js'
import { familiesRoutes } from './families/families.routes.js'
import { createFamiliesService } from './families/families.service.js'
import { createRequireFamily } from './families/require-family.js'
import { AppError } from './errors.js'
import { createOpenCodeLlm } from './llm/opencode.js'
import { createHealthController } from './health/health.controller.js'
import { healthRoutes } from './health/health.routes.js'
import { createStoriesController } from './stories/stories.controller.js'
import { storiesRoutes } from './stories/stories.routes.js'
import { createStoriesService } from './stories/stories.service.js'

/**
 * Builds the API with every dependency wired in, here and nowhere else.
 * Routes map URLs to controllers, controllers speak HTTP, and services hold
 * the business logic and the SQL. server.js runs the result; tests build
 * their own on a scratch database.
 * @param {{
 *   config: import('./config.js').Config,
 *   db: import('pg').Pool,
 *   logger?: import('fastify').FastifyServerOptions['logger'],
 *   random?: () => number,
 *   now?: () => Date,
 *   llm?: ReturnType<typeof createOpenCodeLlm> | null,
 * }} options `random` drives which template comes next; tests can pin it.
 * `now` picks the moment a story is written for; `llm` overrides the wire,
 * so tests can speak for the model. Without a key, stories come from templates.
 */
export function buildApp({ config, db, logger = true, random = Math.random, now = () => new Date(), llm }) {
  const families = createFamiliesService({ db })
  const activities = createActivitiesService({ db, families, random })
  const stories = createStoriesService({ db, families, random, now, llm: llm ?? createOpenCodeLlm({ config: config.llm }) })
  const auth = createAuth({ config: config.auth, db })
  const requireSession = createRequireSession(auth)
  const familyGuards = [requireSession, createRequireFamily(families)]

  const app = Fastify({ logger })
  app.decorateRequest('session', null)
  app.decorateRequest('familyId', null)
  app.setErrorHandler(handleError)
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not found' }))

  app.register(healthRoutes, { controller: createHealthController({ db }) })
  app.register(authRoutes, { auth, baseURL: config.auth.url })
  app.register(accountsRoutes, { controller: createAccountsController({ families }), requireSession })
  app.register(familiesRoutes, { controller: createFamiliesController({ families }), requireSession })
  app.register(activitiesRoutes, { controller: createActivitiesController({ activities }), guards: familyGuards })
  app.register(storiesRoutes, { controller: createStoriesController({ stories }), guards: familyGuards })

  return app
}

/**
 * One shape for every failure. A client's own mistake gets its message, plus
 * the code a service gave it; ours are logged and never described.
 * @type {Parameters<import('fastify').FastifyInstance['setErrorHandler']>[0]}
 */
function handleError(error, request, reply) {
  const status = error.statusCode ?? 500
  if (status >= 500) {
    request.log.error({ err: error }, 'request failed')
    return reply.code(500).send({ error: 'internal error' })
  }
  const code = error instanceof AppError ? error.code : undefined
  return reply.code(status).send(code ? { error: error.message, code } : { error: error.message })
}
