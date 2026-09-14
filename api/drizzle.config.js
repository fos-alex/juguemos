import { defineConfig } from 'drizzle-kit'

// drizzle-kit compares the schema with the latest snapshot in migrations/meta
// and writes the SQL that brings the database up to it:
// `npm run migration:generate -w api -- --name <name>`. The casing must match
// the one in src/db/client.js.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.js',
  out: './migrations',
  casing: 'snake_case',
})
