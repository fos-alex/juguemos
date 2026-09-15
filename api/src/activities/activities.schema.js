/**
 * The activities suggested to each family, from the catalog's templates.
 */
import { sql } from 'drizzle-orm'
import { index, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { activityTemplates } from '../catalog/catalog.schema.js'
import { createdAt } from '../db/columns.js'
import { families } from '../families/families.schema.js'

// Activities suggested to a family, as they were tailored: the text stays what
// the parent saw, even if the template or the family changes later.
export const activities = pgTable(
  'activities',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    templateId: uuid().references(() => activityTemplates.id, { onDelete: 'set null' }),
    title: text().notNull(),
    minutes: smallint().notNull(),
    place: text({ enum: ['indoor', 'outdoor'] }).notNull(),
    why: text().notNull(),
    needs: text().notNull(),
    steps: text().array().notNull(),
    easier: text().notNull(),
    harder: text().notNull(),
    // The kids who played (JUG-107), for the recommendations and the journal.
    // No foreign key: the record outlives a kid removed from the profile.
    kidIds: uuid().array().notNull().default(sql`'{}'`),
    createdAt: createdAt(),
  },
  (table) => [index('activities_family_id_created_at_idx').on(table.familyId, table.createdAt.desc())],
)
