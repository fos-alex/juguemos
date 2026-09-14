import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
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
 * A migrations folder with numbered .sql files (no _journal.json or snapshots).
 * @param {{ tag: string, sql: string }[]} migrations
 */
async function migrationsFolder(migrations) {
  const folder = await mkdtemp(join(scratch, 'folder-'))
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
  const expected = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  await withEmptyDatabase(async (databaseUrl) => {
    const runs = await Promise.all([migrate({ databaseUrl }), migrate({ databaseUrl })])
    assert.deepEqual(
      runs.flat(),
      expected.map((f) => f.replace('.sql', '')),
    )
  })
})

const first = { tag: '0000_first', sql: 'create table first (id int);' }
const third = { tag: '0002_third', sql: 'create table third (id int);' }

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
    const second = { tag: '0001_second', sql: 'create table second (id int);' }
    const merged = await migrationsFolder([first, second, third])
    await assert.rejects(migrate({ databaseUrl, migrationsFolder: merged }), /0001_second is older than the latest/)
  })
})

test('all migration files apply cleanly to a fresh database', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    const applied = await migrate({ databaseUrl })
    const expected = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    assert.equal(applied.length, expected.length, 'every .sql file was applied')
  })
})
