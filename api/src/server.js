import Fastify from 'fastify'
import { getMigrations } from 'better-auth/db/migration'
import { fromNodeHeaders } from 'better-auth/node'
import { auth, baseURL } from './auth.js'
import { pool } from './db.js'
import { familyOf, familySchema } from './families.js'

const port = Number(process.env.PORT ?? 3000)

// Schema changes run at boot until the data model brings real migrations.
const { runMigrations } = await getMigrations(auth.options)
await runMigrations()
await pool.query(familySchema)

const app = Fastify({ logger: true })

app.addHook('onClose', async () => {
  await pool.end()
})

app.get('/health', async (_request, reply) => {
  try {
    await pool.query('select 1')
    return { status: 'ok', db: 'up' }
  } catch (error) {
    app.log.error({ err: error }, 'database health check failed')
    return reply.code(503).send({ status: 'ok', db: 'down' })
  }
})

// Caddy strips /api before proxying, and Better Auth routes on its full base
// path, so the prefix goes back on.
app.route({
  method: ['GET', 'POST'],
  url: '/auth/*',
  async handler(request, reply) {
    const headers = fromNodeHeaders(request.headers)
    headers.delete('content-length')
    const response = await auth.handler(
      new Request(new URL(`/api${request.url}`, baseURL), {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      }),
    )
    reply.status(response.status)
    for (const [key, value] of response.headers) if (key !== 'set-cookie') reply.header(key, value)
    const cookies = response.headers.getSetCookie()
    if (cookies.length > 0) reply.header('set-cookie', cookies)
    return reply.send(response.body ? await response.text() : null)
  },
})

app.get('/me', async (request, reply) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (!session) return reply.code(401).send({ error: 'signed out' })
  const { id, name, email, emailVerified } = session.user
  return { user: { id, name, email, emailVerified }, family: await familyOf(id) }
})

app.setNotFoundHandler((_request, reply) => {
  reply.code(501).send({ error: 'not implemented yet' })
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close()
    process.exit(0)
  })
}

await app.listen({ port, host: '0.0.0.0' })
