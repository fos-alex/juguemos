/**
 * The audit trail of what parents send in their own words (JUG-116): the text
 * they write about the family, and each voice note's transcription. Rows are
 * kept only while AUDIT_TRANSCRIPTS is on, for auditing the playtest.
 */
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { users } from '../auth/auth.schema.js'
import { createdAt, timestamptz } from '../db/columns.js'
import { families } from '../families/families.schema.js'

export const auditTranscripts = pgTable(
  'audit_transcripts',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Null before the adult has a family, as on first run.
    familyId: uuid().references(() => families.id, { onDelete: 'cascade' }),
    source: text({ enum: ['family_text', 'voice_note'] }).notNull(),
    text: text().notNull(),
    // Set once the PII in `text` has been removed.
    redactedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_transcripts_user_id_idx').on(table.userId),
    index('audit_transcripts_family_id_idx').on(table.familyId),
    check('audit_transcripts_source_check', sql`${table.source} in ('family_text', 'voice_note')`),
  ],
)
