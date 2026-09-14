import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))
// Where Drizzle records the migrations it applied.
const APPLIED = 'drizzle.__drizzle_migrations'

/**
 * Applies the migrations in api/migrations that haven't run yet, in order.
 * Safe to run any number of times: Drizzle records what it applied and runs
 * the rest in one transaction, and an advisory lock makes a second run wait
 * for the first and then find nothing to apply.
 *
 * Drizzle runs only the migrations newer than the latest one applied, so this
 * first refuses a database where that would go wrong: a migration that ran
 * has since been edited, or one older than the latest applied never ran (a
 * branch merged after a newer migration).
 * @param {{ databaseUrl: string, migrationsFolder?: string, log?: (message: string) => void }} options
 * @returns {Promise<string[]>} the migrations it applied
 */
export async function migrate({ databaseUrl, migrationsFolder = MIGRATIONS_DIR, log = () => {} }) {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    // Held until the connection closes.
    await client.query(`select pg_advisory_lock(hashtext('juguemos:migrations'))`)
    const pending = await pendingMigrations(client, migrationsFolder)
    for (const name of pending) log(`Applying ${name}`)
    await runMigrations(drizzle({ client }), { migrationsFolder })
    return pending
  } finally {
    await client.end()
  }
}

/**
 * The migrations Drizzle is about to apply, by name.
 * @param {pg.Client} client
 * @param {string} migrationsFolder
 */
async function pendingMigrations(client, migrationsFolder) {
  /** @type {{ entries: { tag: string }[] }} */
  const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, 'utf8'))
  // In the journal's order, with the hash and timestamp Drizzle records.
  const files = readMigrationFiles({ migrationsFolder })

  /** @type {Map<number, string>} each applied migration's hash, by its timestamp */
  const applied = new Map()
  const { rows } = await client.query('select to_regclass($1) is not null as "exists"', [APPLIED])
  if (rows[0].exists) {
    const { rows: records } = await client.query(`select hash, created_at as "createdAt" from ${APPLIED}`)
    for (const record of records) applied.set(Number(record.createdAt), record.hash)
  }
  const latest = Math.max(-Infinity, ...applied.keys())

  return files.flatMap(({ folderMillis, hash }, index) => {
    const name = journal.entries[index].tag
    if (applied.has(folderMillis)) {
      if (applied.get(folderMillis) === hash) return []
      throw new Error(`Migration ${name} was edited after it ran. Undo the edit and put the change in a new migration.`)
    }
    if (folderMillis <= latest) {
      throw new Error(
        `Migration ${name} is older than the latest one applied, so it would never run. Delete it and generate it again on top of main.`,
      )
    }
    return [name]
  })
}
