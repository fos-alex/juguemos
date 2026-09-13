import pg from 'pg'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://juguemos:juguemos@localhost:5432/juguemos'

export const pool = new pg.Pool({ connectionString: databaseUrl })
