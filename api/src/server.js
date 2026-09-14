import { buildApp } from './app.js'
import { ConfigError, loadConfig } from './config.js'
import { createDb } from './db/client.js'

let config
try {
  config = loadConfig()
} catch (error) {
  if (!(error instanceof ConfigError)) throw error
  console.error(`Configuration error: ${error.message}`)
  process.exit(1)
}

const db = createDb(config.databaseUrl)
const app = buildApp({ config, db })

app.addHook('onClose', async () => {
  await db.$client.end()
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close()
    process.exit(0)
  })
}

await app.listen({ port: config.port, host: '0.0.0.0' })
