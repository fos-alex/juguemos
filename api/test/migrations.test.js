import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { migrate } from '../src/db/migrate.js'
import { createDatabase, startApi } from './helpers.js'

const API_DIR = fileURLToPath(new URL('..', import.meta.url))
const MIGRATIONS_DIR = join(API_DIR, 'migrations')

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {string} scratch folders, removed at the end */
let scratch
before(async () => {
  api = await startApi()
  scratch = await mkdtemp(join(tmpdir(), 'juguemos-migrations-'))
})
after(async () => {
  await api.close()
  await rm(scratch, { recursive: true })
})

/**
 * A migrations folder laid out the way drizzle-kit writes one.
 * @param {{ tag: string, when: number, sql: string }[]} migrations
 */
async function migrationsFolder(migrations) {
  const folder = await mkdtemp(join(scratch, 'folder-'))
  await mkdir(join(folder, 'meta'))
  const entries = migrations.map(({ tag, when }, idx) => ({ idx, version: '7', when, tag, breakpoints: true }))
  await writeFile(join(folder, 'meta', '_journal.json'), JSON.stringify({ version: '7', dialect: 'postgresql', entries }))
  for (const { tag, sql } of migrations) await writeFile(join(folder, `${tag}.sql`), sql)
  return folder
}

/** @param {(databaseUrl: string) => Promise<void>} work */
async function withEmptyDatabase(work) {
  const database = await createDatabase()
  try {
    await work(database.url)
  } finally {
    await database.drop()
  }
}

test('running the migrations again changes nothing', async () => {
  assert.deepEqual(await migrate({ databaseUrl: api.databaseUrl }), [])
})

test('two first runs at once apply each migration once', async () => {
  /** @type {{ entries: { tag: string }[] }} */
  const journal = JSON.parse(await readFile(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'))
  await withEmptyDatabase(async (databaseUrl) => {
    const runs = await Promise.all([migrate({ databaseUrl }), migrate({ databaseUrl })])
    assert.deepEqual(
      runs.flat(),
      journal.entries.map((entry) => entry.tag),
    )
  })
})

const first = { tag: '0000_first', when: 1000, sql: 'create table first (id int);' }
const third = { tag: '0002_third', when: 3000, sql: 'create table third (id int);' }

test('a migration edited after it ran is refused', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    await migrate({ databaseUrl, migrationsFolder: await migrationsFolder([first]) })
    const edited = await migrationsFolder([{ ...first, sql: 'create table first (id bigint);' }])
    await assert.rejects(migrate({ databaseUrl, migrationsFolder: edited }), /0000_first was edited after it ran/)
  })
})

test('a migration older than the latest one applied is refused, not skipped', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    await migrate({ databaseUrl, migrationsFolder: await migrationsFolder([first, third]) })
    const second = { tag: '0001_second', when: 2000, sql: 'create table second (id int);' }
    const merged = await migrationsFolder([first, second, third])
    await assert.rejects(migrate({ databaseUrl, migrationsFolder: merged }), /0001_second is older than the latest/)
  })
})

test('the migrations are up to date with the schema', async () => {
  // drizzle-kit writes a new migration only if the schema changed since the last one.
  const out = join(scratch, 'generated')
  await cp(MIGRATIONS_DIR, out, { recursive: true })
  // The real config, writing to the copy. drizzle-kit ignores a config file
  // once any setting comes on the command line.
  const config = join(scratch, 'drizzle.config.js')
  await writeFile(
    config,
    `import config from ${JSON.stringify(join(API_DIR, 'drizzle.config.js'))}\nexport default { ...config, out: ${JSON.stringify(out)} }\n`,
  )
  await promisify(execFile)('npx', ['--no', 'drizzle-kit', 'generate', `--config=${config}`], { cwd: API_DIR })
  assert.deepEqual(await readdir(out), await readdir(MIGRATIONS_DIR), 'run `npm run migration:generate -w api`')
})
