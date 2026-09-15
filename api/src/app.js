import { DrizzleQueryError } from 'drizzle-orm'
import Fastify from 'fastify'
import { createAccountsController } from './accounts/accounts.controller.js'
import { accountsRoutes } from './accounts/accounts.routes.js'
import { createActivitiesController } from './activities/activities.controller.js'
import { activitiesRoutes } from './activities/activities.routes.js'
import { createActivitiesService } from './activities/activities.service.js'
import { createAdminController } from './admin/admin.controller.js'
import { adminRoutes } from './admin/admin.routes.js'
import { createAuditService } from './audit/audit.service.js'
import { createAuth } from './auth/auth.js'
import { authRoutes } from './auth/auth.routes.js'
import { createRequireSession } from './auth/session.js'
import { createFamiliesController } from './families/families.controller.js'
import { familiesRoutes } from './families/families.routes.js'
import { createFamiliesService } from './families/families.service.js'
import { createRequireFamily } from './families/require-family.js'
import { createUnderstanding } from './families/understanding.js'
import { AppError } from './errors.js'
import { createLlm } from './llm/llm.js'
import { createHealthController } from './health/health.controller.js'
import { healthRoutes } from './health/health.routes.js'
import { createStoriesController } from './stories/stories.controller.js'
import { storiesRoutes } from './stories/stories.routes.js'
import { createStoriesService } from './stories/stories.service.js'
import { createToysController } from './toys/toys.controller.js'
import { toysRoutes } from './toys/toys.routes.js'
import { createToysService } from './toys/toys.service.js'
import { createTranscriber } from './voice/transcriber.js'
import { createVoiceController } from './voice/voice.controller.js'
import { voiceRoutes } from './voice/voice.routes.js'
import { createVoiceService } from './voice/voice.service.js'

/**
 * Builds the API with every dependency wired in, here and nowhere else.
 * Routes map URLs to controllers, controllers speak HTTP, and services hold
 * the business logic and the queries. server.js runs the result; tests build
 * their own on a scratch database.
 * @param {{
 *   config: import('./config.js').Config,
 *   db: import('./db/client.js').Db,
 *   logger?: import('fastify').FastifyServerOptions['logger'],
 *   random?: () => number,
 *   now?: () => Date,
 *   llm?: ReturnType<typeof createLlm> | null,
 *   transcriber?: ReturnType<typeof createTranscriber> | null,
 * }} options `random` drives which template comes next; tests can pin it.
 * `now` picks the moment a story is written for; `llm` and `transcriber`
 * override the wire, so tests can speak for the model and the speech-to-text
 * service. Without a key, stories come from templates; without STT_URL, voice
 * notes are off.
 */
export function buildApp({ config, db, logger = true, random = Math.random, now = () => new Date(), llm, transcriber }) {
  const families = createFamiliesService({ db })
  const toys = createToysService({ db })
  const activities = createActivitiesService({ db, families, random })
  // One LLM for stories and for reading a family's text; null without a key.
  const model = llm ?? createLlm({ config: config.llm })
  const stories = createStoriesService({ db, families, random, now, llm: model })
  // Keeps what parents send in their own words, only while AUDIT_TRANSCRIPTS is on.
  const audit = createAuditService({ db, enabled: config.audit.transcripts })
  const understanding = createUnderstanding({ llm: model, audit })
  const voice = createVoiceService({ transcriber: transcriber ?? createTranscriber({ config: config.stt }), families, audit })
  const auth = createAuth({ config: config.auth, db })
  const requireSession = createRequireSession(auth)
  // After the session hook below: routes about the family need one saved.
  const familyGuards = [createRequireFamily(families)]

  const app = Fastify({ logger })
  app.decorateRequest('session', null)
  app.decorateRequest('familyId', null)
  app.setErrorHandler(handleError)
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not found' }))

  // Every route needs a signed-in adult unless its config says `public: true`.
  app.addHook('preHandler', async (request, reply) => {
    if (request.is404 || request.routeOptions.config.public) return
    return requireSession(request, reply)
  })

  app.register(healthRoutes, { controller: createHealthController({ db }) })
  app.register(authRoutes, { auth, baseURL: config.auth.url })
  app.register(accountsRoutes, { controller: createAccountsController({ families, understanding }) })
  app.register(familiesRoutes, { controller: createFamiliesController({ families, understanding }) })
  app.register(toysRoutes, { controller: createToysController({ toys }), guards: familyGuards })
  app.register(activitiesRoutes, { controller: createActivitiesController({ activities }), guards: familyGuards })
  app.register(storiesRoutes, { controller: createStoriesController({ stories }), guards: familyGuards })
  // No family guard: onboarding records a note before the family exists.
  app.register(voiceRoutes, { controller: createVoiceController({ voice }) })
  // The admin has no login yet, so it exists only where ADMIN_ENABLED turns it on.
  if (config.admin.enabled) app.register(adminRoutes, { controller: createAdminController({ activities }) })

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
    // A failed query's message carries its parameters, which can be a family's
    // names; log the query and what Postgres said instead.
    const logged = error instanceof DrizzleQueryError ? { err: error.cause, query: error.query } : { err: error }
    request.log.error(logged, 'request failed')
    return reply.code(500).send({ error: 'internal error' })
  }
  const code = error instanceof AppError ? error.code : undefined
  return reply.code(status).send(code ? { error: error.message, code } : { error: error.message })
}
