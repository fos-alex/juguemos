/**
 * The plots the model proposes, the stories written for each family, and the
 * series some of those stories grow into.
 */
import { sql } from 'drizzle-orm'
import { check, index, jsonb, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { storyTemplates } from '../catalog/catalog.schema.js'
import { createdAt, timestamptz } from '../db/columns.js'
import { families } from '../families/families.schema.js'

// The plots the model proposes for a family to choose from. They are kept for
// a week, since options stay on each device's screen until it asks for more.
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
    // The kids playing when the plot was proposed (JUG-107); its story stars them.
    kidIds: uuid().array().notNull().default(sql`'{}'`),
    // The casting the plot was drawn for (JUG-139): who leads, who is in, and
    // the random numbers and weights behind it. Null on plots from before it.
    casting: jsonb(),
    createdAt: createdAt(),
  },
  (table) => [
    index('story_plots_family_id_idx').on(table.familyId),
    check('story_plots_title_check', sql`${table.title} <> ''`),
    check('story_plots_teaser_check', sql`${table.teaser} <> ''`),
    check('story_plots_minutes_check', sql`${table.minutes} between 2 and 8`),
    check('story_plots_premise_check', sql`${table.premise} <> ''`),
    check('story_plots_mood_check', sql`${table.mood} in ('calm', 'lively')`),
  ],
)

// A series of stories that share a world (JUG-59). It starts as one story the
// family asked to keep going, which becomes its first episode; from then on
// each episode continues the ones before it. The storyline and the casting are
// fixed when the series starts and no episode changes them, which is what
// keeps a series recognisable however long it grows. A series the family
// stopped following keeps `removedAt`: it shows up nowhere, and its stories go
// back to the library on their own.
export const storySeries = pgTable(
  'story_series',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    // The first episode's title until the second episode is written, which is
    // the call that names the series itself.
    title: text().notNull(),
    // What the series is about, taken from its first episode and never rewritten.
    storyline: text().notNull(),
    // Where the series happens, named by the model with the second episode.
    setting: text().notNull().default(''),
    // The characters the model invented that stay in the series, each with a
    // few words saying who they are. The family's own cast is in `casting`.
    characters: jsonb().notNull().default(sql`'[]'::jsonb`),
    // The casting the first episode was written for: every episode keeps it,
    // so the anchor characters are in the whole series.
    casting: jsonb(),
    // The kids the series is for, whose ages set the band of every episode.
    kidIds: uuid().array().notNull().default(sql`'{}'`),
    removedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (table) => [
    index('story_series_family_id_idx').on(table.familyId),
    check('story_series_title_check', sql`${table.title} <> ''`),
    check('story_series_characters_check', sql`jsonb_typeof(${table.characters}) = 'array'`),
  ],
)

// Stories written for a family: from a template, or by the model from a plot
// the family chose (`source`). Saved, so a story reads again exactly as it
// did the first time. A template is written once for each set of kids
// playing, since it stars them.
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
    // The sounds the parent acts out (JUG-170), as the legend over the story
    // shows them: { sound, who, how }. The text marks each one between
    // brackets. Empty on template stories and on stories written before.
    sounds: jsonb().notNull().default(sql`'[]'::jsonb`),
    // The kids who played (JUG-107), sorted, for the recommendations and the
    // journal. No foreign key: the record outlives a kid removed from the profile.
    kidIds: uuid().array().notNull().default(sql`'{}'`),
    // The casting the story was written for (JUG-139); null on template stories.
    casting: jsonb(),
    // The interest the parent tapped to get this story (JUG-140), as they typed
    // it. Null on every other story. A tap always writes a new story, so two
    // stories can share a keyword.
    keyword: text(),
    // The series this story is an episode of, and which episode it is
    // (JUG-59). Both null on a story that stands on its own.
    seriesId: uuid().references(() => storySeries.id, { onDelete: 'set null' }),
    episode: smallint(),
    // What happened in this episode, in a sentence or two, which is what the
    // next episode is written from. The model writes it outside the story
    // text, so no reader ever hears it.
    summary: text(),
    createdAt: createdAt(),
  },
  (table) => [
    check('stories_source_check', sql`${table.source} in ('template', 'generated')`),
    check('stories_parts_check', sql`jsonb_typeof(${table.parts}) = 'array'`),
    check('stories_sounds_check', sql`jsonb_typeof(${table.sounds}) = 'array'`),
    uniqueIndex('stories_family_id_template_id_kid_ids_key')
      .on(table.familyId, table.templateId, table.kidIds)
      .where(sql`${table.templateId} is not null`),
    uniqueIndex('stories_family_id_plot_id_key').on(table.familyId, table.plotId).where(sql`${table.plotId} is not null`),
    uniqueIndex('stories_series_id_episode_key').on(table.seriesId, table.episode).where(sql`${table.seriesId} is not null`),
    index('stories_family_id_created_at_idx').on(table.familyId, table.createdAt),
    check('stories_episode_check', sql`${table.episode} is null or ${table.episode} >= 1`),
  ],
)

// What the family was offered, what they picked, and what was written
// (JUG-139). It is read in SQL to see whether the casting weights need
// moving, so it holds no prompt and no story text: kids are ids, and the only
// words in it are the theme inside the casting.
export const storyAudit = pgTable(
  'story_audit',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    event: text({ enum: ['offered', 'picked', 'written'] }).notNull(),
    kidIds: uuid().array().notNull().default(sql`'{}'`),
    band: text().notNull(),
    mood: text().notNull(),
    // No foreign key: plots retire, and the record of what was offered stays.
    plotId: uuid(),
    // The interest keyword the parent tapped, when that is what started the story (JUG-140).
    keyword: text(),
    casting: jsonb(),
    // The model, the attempt, the timings, and the word count, per event.
    details: jsonb().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [
    index('story_audit_family_id_created_at_idx').on(table.familyId, table.createdAt),
    check('story_audit_event_check', sql`${table.event} in ('offered', 'picked', 'written')`),
  ],
)
