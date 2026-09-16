import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
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
  scratch = await mkdtemp(join(tmpdir(), 'ludi-migrations-'))
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

/** @param {string} sql */
const sha256 = (sql) => createHash('sha256').update(sql).digest('hex')

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

test('a database Drizzle migrated keeps what Drizzle applied and runs only the rest', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    // What Drizzle's migrator left behind: the table it created, and its record by the SQL's sha256.
    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    await client.query(first.sql)
    await client.query('create schema drizzle')
    await client.query('create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)')
    await client.query('insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, 1)', [sha256(first.sql)])
    await client.end()

    const second = { tag: '0001_second', sql: 'create table second (id int);' }
    assert.deepEqual(await migrate({ databaseUrl, migrationsFolder: await migrationsFolder([first, second]) }), ['0001_second'])
  })
})

test('a Drizzle record that matches no file is refused', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    await client.query('create schema drizzle')
    await client.query('create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)')
    await client.query(`insert into drizzle.__drizzle_migrations (hash, created_at) values ('not-a-file', 1)`)
    await client.end()

    await assert.rejects(migrate({ databaseUrl, migrationsFolder: await migrationsFolder([first]) }), /matches no file/)
  })
})

test('0008 gives each family its interests on every one of its kids, and drops the old table (JUG-144)', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql') && f < '0008').sort()
    const earlier = await Promise.all(
      files.map(async (f) => ({ tag: f.replace('.sql', ''), sql: await readFile(join(MIGRATIONS_DIR, f), 'utf8') })),
    )
    await migrate({ databaseUrl, migrationsFolder: await migrationsFolder(earlier) })

    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    try {
      const {
        rows: [family],
      } = await client.query(`insert into families (name) values ('Los Pérez') returning id`)
      await client.query(`insert into kids (family_id, position, name) values ($1, 0, 'Milán'), ($1, 1, 'Sofi')`, [family.id])
      await client.query(`insert into interests (family_id, position, label) values ($1, 0, 'los dinosaurios'), ($1, 1, 'dibujar')`, [
        family.id,
      ])

      const [applied] = await migrate({ databaseUrl })
      assert.equal(applied, '0008_kid-interests', 'the pending migrations run in order, 0008 first')
      const { rows } = await client.query(
        `select k.name, array_agg(i.label order by i.position) as interests
         from kid_interests i join kids k on k.id = i.kid_id group by k.name order by k.name`,
      )
      assert.deepEqual(rows, [
        { name: 'Milán', interests: ['los dinosaurios', 'dibujar'] },
        { name: 'Sofi', interests: ['los dinosaurios', 'dibujar'] },
      ])
      const {
        rows: [old],
      } = await client.query(`select to_regclass('public.interests') as regclass`)
      assert.equal(old.regclass, null)
    } finally {
      await client.end()
    }
  })
})

test('0009 turns the years a parent gave into months, keeping the day they gave them (JUG-145)', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql') && f < '0009').sort()
    const earlier = await Promise.all(
      files.map(async (f) => ({ tag: f.replace('.sql', ''), sql: await readFile(join(MIGRATIONS_DIR, f), 'utf8') })),
    )
    await migrate({ databaseUrl, migrationsFolder: await migrationsFolder(earlier) })

    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    try {
      const {
        rows: [family],
      } = await client.query(`insert into families (name) values ('Los Pérez') returning id`)
      await client.query(
        `insert into kids (family_id, position, name, age_years, age_set_on)
         values ($1, 0, 'Milán', 2, date '2026-01-10'), ($1, 1, 'Sofi', null, null)`,
        [family.id],
      )

      // Whatever came after it runs too, so only the first one is named here.
      assert.equal((await migrate({ databaseUrl }))[0], '0009_kids-age-in-months')
      const { rows } = await client.query(`select name, age_months, age_set_on from kids order by position`)
      assert.deepEqual(rows, [
        { name: 'Milán', age_months: 24, age_set_on: new Date('2026-01-10T00:00:00') },
        { name: 'Sofi', age_months: null, age_set_on: null },
      ])
    } finally {
      await client.end()
    }
  })
})

test('all migration files apply cleanly to a fresh database', async () => {
  await withEmptyDatabase(async (databaseUrl) => {
    const applied = await migrate({ databaseUrl })
    const expected = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    assert.equal(applied.length, expected.length, 'every .sql file was applied')
  })
})
