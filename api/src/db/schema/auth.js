/**
 * Better Auth's tables, named like the rest of the schema: plural tables and
 * snake_case columns. Its Drizzle adapter reads and writes them through these
 * definitions, so a Better Auth upgrade or plugin that needs more columns adds
 * them here and generates a migration.
 */
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core'
import { createdAt, timestamptz } from './columns.js'

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: createdAt(),
  updatedAt: timestamptz().notNull().defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    expiresAt: timestamptz().notNull(),
    token: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: timestamptz().notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamptz(),
    refreshTokenExpiresAt: timestamptz(),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: timestamptz().notNull(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamptz().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)
