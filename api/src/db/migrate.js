import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))
// Where Drizzle's migrator recorded what it applied, before this runner.
const DRIZZLE_APPLIED = 'drizzle.__drizzle_migrations'

/** @typedef {{ name: string, sql: string, hash: string }} Migration */

/**
 * Applies the migrations in api/migrations that haven't run yet, in
 * lexicographic order. Safe to run any number of times: a tracking table
 * records what was applied, an advisory lock makes concurrent runners wait,
 * and an integrity check refuses a migration that was edited after it ran.
 *
 * Migrations are plain .sql files. Run `drizzle-kit generate` locally to
 * produce new ones from the Drizzle schema, and commit only the SQL.
 * @param {{ databaseUrl: string, migrationsFolder?: string, log?: (message: string) => void }} options
 * @returns {Promise<string[]>} the migrations it applied
 */
export async function migrate({ databaseUrl, migrationsFolder = MIGRATIONS_DIR, log = () => {} }) {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query(`select pg_advisory_lock(hashtext('ludi:migrations'))`)
    await client.query(`
      create table if not exists public.ludi_migrations (
        name      text primary key,
        hash      text not null,
        applied_at timestamptz not null default now()
      )
    `)

    const migrations = readMigrations(migrationsFolder)
    await adoptDrizzleRecords(client, migrations)
    const pending = await pendingMigrations(client, migrations)
    for (const { name, sql, hash } of pending) {
      log(`Applying ${name}`)
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into public.ludi_migrations (name, hash) values ($1, $2)', [name, hash])
        await client.query('commit')
      } catch (err) {
        await client.query('rollback')
        throw err
      }
    }
    return pending.map(({ name }) => name)
  } finally {
    await client.end()
  }
}

/**
 * The .sql files in the folder, in order, each with its SHA-256.
 * @param {string} migrationsFolder
 * @returns {Migration[]}
 */
function readMigrations(migrationsFolder) {
  return readdirSync(migrationsFolder)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const sql = readFileSync(`${migrationsFolder}/${file}`, 'utf8')
      return { name: file.replace('.sql', ''), sql, hash: createHash('sha256').update(sql).digest('hex') }
    })
}

/**
 * A database Drizzle's migrator ran on keeps what it applied: the first time
 * this runner sees it, Drizzle's records are copied over, matched to files by
 * the same SHA-256 of the SQL, so no migration runs twice.
 * @param {pg.Client} client
 * @param {Migration[]} migrations
 */
async function adoptDrizzleRecords(client, migrations) {
  const { rows } = await client.query(
    `select to_regclass($1) is not null as "exists", (select count(*)::int from public.ludi_migrations) as "recorded"`,
    [DRIZZLE_APPLIED],
  )
  if (!rows[0].exists || rows[0].recorded > 0) return

  const byHash = new Map(migrations.map((migration) => [migration.hash, migration.name]))
  const { rows: records } = await client.query(`select hash from ${DRIZZLE_APPLIED} order by created_at`)
  for (const { hash } of records) {
    const name = byHash.get(hash)
    if (!name) {
      throw new Error(
        `Drizzle recorded a migration that matches no file in api/migrations (sha256 ${hash}). Restore that file, or rebuild the database.`,
      )
    }
    await client.query('insert into public.ludi_migrations (name, hash) values ($1, $2)', [name, hash])
  }
}

/**
 * The migrations that haven't been applied yet.
 * Refuses edited or out-of-order migrations.
 * @param {pg.Client} client
 * @param {Migration[]} migrations
 */
async function pendingMigrations(client, migrations) {
  /** @type {Map<string, string>} applied migration name → hash */
  const applied = new Map()
  const { rows: records } = await client.query('select name, hash from public.ludi_migrations')
  for (const record of records) applied.set(record.name, record.hash)
  const names = migrations.map(({ name }) => name)
  const latestIndex = Math.max(-1, ...[...applied.keys()].map((name) => names.indexOf(name)))

  return migrations.filter(({ name, hash }, index) => {
    if (applied.has(name)) {
      if (applied.get(name) === hash) return false
      throw new Error(`Migration ${name} was edited after it ran. Undo the edit and put the change in a new migration.`)
    }
    if (index <= latestIndex) {
      throw new Error(
        `Migration ${name} is older than the latest one applied, so it would never run. Delete it and generate it again on top of main.`,
      )
    }
    return true
  })
}
