import Fastify from 'fastify'
import pg from 'pg'

const port = Number(process.env.PORT ?? 3000)
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://juguemos:juguemos@localhost:5432/juguemos'

const pool = new pg.Pool({ connectionString: databaseUrl })

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