/**
 * The catalog: the activity and story templates every suggestion is made
 * from. Their slots ({kid}, {pet}, {toy}, {toy2}, {toy3}, {interest}) are
 * filled for each family by slots.js.
 */
import { sql } from 'drizzle-orm'
import { boolean, check, jsonb, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt, timestamptz } from '../db/columns.js'
import { THEME_KEYS } from './themes.js'

// Reviewed templates tagged with the full taxonomy, whose slots ({kid}, {pet},
// {toy}, {toy2}, {toy3}, {interest}) code fills for each family. Safety rules
// are part of the reviewed core.
export const activityTemplates = pgTable(
  'activity_templates',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    minutes: smallint().notNull(),
    place: text({ enum: ['indoor', 'outdoor'] }).notNull(),
    minAgeMonths: smallint().notNull(),
    maxAgeMonths: smallint().notNull(),
    energy: text({ enum: ['low', 'medium', 'high'] }).notNull(),
    categories: text().array().notNull(),
    smallSpace: boolean().notNull(),
    // Keys from src/materials/materials.js: a family that has one of these
    // marked off is never offered the template.
    materials: text().array().notNull().default(sql`'{}'`),
    // Keys from themes.js: what the template is about, matched against what
    // the kids love (JUG-104).
    themes: text().array().notNull().default(sql`'{}'`),
    skills: text().array().notNull().default(sql`'{}'`),
    safety: text().array().notNull().default(sql`'{}'`),
    // A discovery game (JUG-128), `{ type, set }`, which Empezar opens
    // instead of the timer: `{ type: 'sounds', set: 'granja' }` is ¿Qué
    // suena? with a set from src/games/sounds.js. Null for every other juego.
    game: jsonb(),
    why: text().notNull(),
    needs: text().notNull(),
    steps: text().array().notNull(),
    easier: text().notNull(),
    harder: text().notNull(),
    // Off keeps a template out of the suggestions without deleting it.
    active: boolean().notNull().default(true),
    // The admin's rating, from 1 to 5, which every family's ranking starts
    // from before their reactions move it (JUG-192). 3 is neither way.
    rating: smallint().notNull().default(3),
    createdAt: createdAt(),
    updatedAt: timestamptz().notNull().defaultNow(),
    // Deleted from the admin. The row stays so the catalog seed, which skips
    // slugs already in the database, never adds it back.
    deletedAt: timestamptz(),
  },
  (table) => [
    check('activity_templates_minutes_check', sql`${table.minutes} > 0`),
    check('activity_templates_place_check', sql`${table.place} in ('indoor', 'outdoor')`),
    check('activity_templates_min_age_months_check', sql`${table.minAgeMonths} >= 0`),
    check('activity_templates_age_range_check', sql`${table.maxAgeMonths} >= ${table.minAgeMonths}`),
    check('activity_templates_energy_check', sql`${table.energy} in ('low', 'medium', 'high')`),
    check(
      'activity_templates_categories_check',
      sql`cardinality(${table.categories}) > 0 and ${table.categories} <@ array['move', 'create', 'pretend', 'explore', 'learn', 'low_energy', 'helpers', 'out_and_about']`,
    ),
    check('activity_templates_steps_check', sql`cardinality(${table.steps}) > 0`),
    check('activity_templates_rating_check', sql`${table.rating} between 1 and 5`),
    check('activity_templates_themes_check', sql`${table.themes} <@ ${sql.raw(`array[${THEME_KEYS.map((key) => `'${key}'`).join(', ')}]`)}`),
  ],
)

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
