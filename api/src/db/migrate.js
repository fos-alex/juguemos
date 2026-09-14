import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))

/**
 * Applies the migrations in api/migrations that haven't run yet, in order.
 * Safe to run any number of times: applied migrations are recorded in
 * `pgmigrations`, each runs in its own transaction, and an advisory lock
 * makes a second run wait for the first and then find nothing to apply.
 * @param {{ databaseUrl: string, log?: (message: string) => void }} options
 * @returns {Promise<string[]>} the migrations it applied
 */
export async function migrate({ databaseUrl, log = () => {} }) {
  const applied = await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    migrationsTable: 'pgmigrations',
    direction: 'up',
    checkOrder: true,
    advisoryLockMode: 'wait',
    log,
  })
  return applied.map((migration) => migration.name)
}
