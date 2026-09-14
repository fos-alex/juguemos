import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))

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
    await client.query(`select pg_advisory_lock(hashtext('juguemos:migrations'))`)
    await client.query(`
      create table if not exists public.juguemosigrations (
        name      text primary key,
        hash      text not null,
        applied_at timestamptz not null default now()
      )
    `)

    const pending = await pendingMigrations(client, migrationsFolder)
    for (const name of pending) {
      log(`Applying ${name}`)
      const sql = readFileSync(`${migrationsFolder}/${name}.sql`, 'utf8')
      const hash = createHash('sha256').update(sql).digest('hex')
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into public.juguemosigrations (name, hash) values ($1, $2)', [name, hash])
        await client.query('commit')
      } catch (err) {
        await client.query('rollback')
        throw err
      }
    }
    return pending
  } finally {
    await client.end()
  }
}

/**
 * The migrations that haven't been applied yet, by name.
 * Refuses edited or out-of-order migrations.
 * @param {pg.Client} client
 * @param {string} migrationsFolder
 */
async function pendingMigrations(client, migrationsFolder) {
  const files = readdirSync(migrationsFolder)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  /** @type {Map<string, string>} applied migration name → hash */
  const applied = new Map()
  const { rows } = await client.query('select to_regclass($1) is not null as "exists"', ['public.juguemosigrations'])
  if (rows[0].exists) {
    const { rows: records } = await client.query('select name, hash from public.juguemosigrations')
    for (const record of records) applied.set(record.name, record.hash)
  }
  let latestIndex = -1
  for (const name of applied.keys()) {
    const idx = files.indexOf(`${name}.sql`)
    if (idx > latestIndex) latestIndex = idx
  }

  const pending = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const name = file.replace('.sql', '')
    const sql = readFileSync(`${migrationsFolder}/${file}`, 'utf8')
    const hash = createHash('sha256').update(sql).digest('hex')

    if (applied.has(name)) {
      if (applied.get(name) === hash) continue
      throw new Error(`Migration ${name} was edited after it ran. Undo the edit and put the change in a new migration.`)
    }
    if (i <= latestIndex) {
      throw new Error(
        `Migration ${name} is older than the latest one applied, so it would never run. Delete it and generate it again on top of main.`,
      )
    }
    pending.push(name)
  }
  return pending
}
