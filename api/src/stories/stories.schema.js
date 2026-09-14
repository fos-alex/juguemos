/**
 * Story templates, the plots the model proposes, and the stories written for
 * each family.
 */
import { sql } from 'drizzle-orm'
import { check, index, jsonb, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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

// The plots the model proposes for a family to choose from. They live only
// until the choice is made: a new screen of options retires the unseen ones.
export const storyPlots = pgTable(
  'story_plots',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    teaser: text().notNull(),
    minutes: smallint().notNull(),
    premise: text().notNull(),
    mood: text({ enum: ['calm', 'lively'] }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('story_plots_family_id_idx').on(table.familyId),
    check('story_plots_title_check', sql`${table.title} <> ''`),
    check('story_plots_teaser_check', sql`${table.teaser} <> ''`),
    check('story_plots_minutes_check', sql`${table.minutes} between 2 and 6`),
    check('story_plots_premise_check', sql`${table.premise} <> ''`),
    check('story_plots_mood_check', sql`${table.mood} in ('calm', 'lively')`),
  ],
)

// Stories written for a family: from a template, or by the model from a plot
// the family chose (`source`). Saved, so a story reads again exactly as it
// did the first time.
export const stories = pgTable(
  'stories',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    templateId: uuid().references(() => storyTemplates.id, { onDelete: 'set null' }),
    plotId: uuid().references(() => storyPlots.id, { onDelete: 'set null' }),
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
    uniqueIndex('stories_family_id_plot_id_key').on(table.familyId, table.plotId).where(sql`${table.plotId} is not null`),
    index('stories_family_id_created_at_idx').on(table.familyId, table.createdAt),
  ],
)
