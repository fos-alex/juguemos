import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import { migrate } from '../src/db/migrate.js'

// A Postgres the tests can create databases in. `docker compose up db` is one.
const SERVER_URL = process.env.TEST_DATABASE_URL ?? 'postgres://juguemos:juguemos@localhost:5432/postgres'

export const ORIGIN = 'http://localhost:3000'

/**
 * A fresh database with every migration applied, and the API built on it.
 * Each test file starts its own, and `close` drops it.
 * @param {{ signupEmails?: string[] }} [options]
 */
export async function startApi({ signupEmails = [] } = {}) {
  const name = `juguemos_test_${randomUUID().replaceAll('-', '')}`
  const admin = new pg.Client({ connectionString: SERVER_URL })
  await admin.connect()
  await admin.query(`create database ${name}`)

  const databaseUrl = new URL(SERVER_URL)
  databaseUrl.pathname = `/${name}`
  await migrate({ databaseUrl: databaseUrl.href })

  const db = new pg.Pool({ connectionString: databaseUrl.href })
  /** @type {import('../src/config.js').Config} */
  const config = {
    port: 0,
    databaseUrl: databaseUrl.href,
    auth: { url: ORIGIN, secret: 'test-secret-that-is-at-least-32-chars', signupEmails: new Set(signupEmails) },
  }
  const app = buildApp({ config, db, logger: false })
  await app.ready()

  return {
    app,
    db,
    config,
    databaseUrl: databaseUrl.href,
    async close() {
      await app.close()
      await db.end()
      await admin.query(`drop database ${name} with (force)`)
      await admin.end()
    },
  }
}

/**
 * The Cookie header a browser would send next, from a response's Set-Cookie.
 * @param {import('light-my-request').Response} response
 */
export function cookiesFrom(response) {
  return [response.headers['set-cookie'] ?? []]
    .flat()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}
