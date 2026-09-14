import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

/**
 * The database, through Drizzle, on a pool of connections. Columns are
 * camelCase in code and snake_case in Postgres; the casing must match the one
 * in drizzle.config.js. `db.$client` is the pool, for closing it.
 * @param {string} databaseUrl
 */
export function createDb(databaseUrl) {
  return drizzle({ client: new pg.Pool({ connectionString: databaseUrl }), schema, casing: 'snake_case' })
}

/** @typedef {ReturnType<typeof createDb>} Db */
/** @typedef {Parameters<Parameters<Db['transaction']>[0]>[0]} Tx a transaction, which queries like `Db` */
