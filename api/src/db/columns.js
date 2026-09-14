import { timestamp } from 'drizzle-orm/pg-core'

/** Every timestamp is a timestamptz. */
export const timestamptz = () => timestamp({ withTimezone: true })

/** When the row was created, set by the database. */
export const createdAt = () => timestamptz().notNull().defaultNow()
