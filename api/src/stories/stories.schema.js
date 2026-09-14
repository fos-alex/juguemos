/**
 * Story templates, and the stories written for each family.
 */
import { sql } from 'drizzle-orm'
import { check, jsonb, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAt, timestamptz } from '../db/columns.js'
import { families } from '../families/families.schema.js'

export const storyTemplates = pgTable(
  'story_templates',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    teaser: text().notNull(),
    minutes: smallint().notNull(),
    mood: text({ enum: ['calm', 'lively'] }).notNull(),
    minAgeMonths: smallint().notNull(),
    maxAgeMonths: smallint().notNull(),
    // Parts, each a list of paragraphs.
    parts: jsonb().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    check('story_templates_minutes_check', sql`${table.minutes} > 0`),
    check('story_templates_mood_check', sql`${table.mood} in ('calm', 'lively')`),
    check('story_templates_min_age_months_check', sql`${table.minAgeMonths} >= 0`),
    check('story_templates_age_range_check', sql`${table.maxAgeMonths} >= ${table.minAgeMonths}`),
    check('story_templates_parts_check', sql`jsonb_typeof(${table.parts}) = 'array'`),
  ],
)

// Stories written for a family: from a template for now, by an LLM later
// (`source`). Saved, so a story reads again exactly as it did the first time.
export const stories = pgTable(
  'stories',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    templateId: uuid().references(() => storyTemplates.id, { onDelete: 'set null' }),
    source: text({ enum: ['template', 'generated'] }).notNull(),
    title: text().notNull(),
    teaser: text().notNull(),
    minutes: smallint().notNull(),
    parts: jsonb().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('stories_source_check', sql`${table.source} in ('template', 'generated')`),
    check('stories_parts_check', sql`jsonb_typeof(${table.parts}) = 'array'`),
    uniqueIndex('stories_family_id_template_id_key')
      .on(table.familyId, table.templateId)
      .where(sql`${table.templateId} is not null`),
  ],
)
