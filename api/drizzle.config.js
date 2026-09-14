import { defineConfig } from 'drizzle-kit'

// drizzle-kit compares the schema with the latest snapshot in migrations/meta
// and writes the SQL that brings the database up to it:
// `npm run migration:generate -w api -- --name <name>`. The casing must match
// the one in src/db/client.js. meta/ is gitignored; on a fresh clone run
// `drizzle-kit push` first to create it, then `generate` works.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './migrations',
  casing: 'snake_case',
})
