/**
 * Stories for a family, from whichever source writes them: the catalog
 * templates with their slots filled (`template-stories.js`), or the LLM
 * writing a plot the family chose (`generated-stories.js`, JUG-71). This is
 * what the controller calls; it picks the source and keeps the library.
 * Either way a story is generated once, saved, and reads again exactly as it
 * did; the web never tells the kinds apart.
 */
import { and, desc, eq } from 'drizzle-orm'
import { NotFoundError } from '../errors.js'
import { createGeneratedStories } from './generated-stories.js'
import { storyColumns, toStory } from './shared.js'
import { stories } from './stories.schema.js'
import { createStoryAudit } from './story-audit.js'
import { createTemplateStories } from './template-stories.js'

/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption the id is a plot's or a template's */
/**
 * @typedef {{ id: string, templateId: string | null, plotId: string | null, title: string, teaser: string, minutes: number, parts: string[][] }} Story
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number, createdAt: string }} SavedStory */
/**
 * @typedef {object} StoryParagraph
 * @property {'paragraph'} type
 * @property {number} part
 * @property {string} text
 */
/**
 * @typedef {object} StoryDone
 * @property {'story'} type
 * @property {Story} story
 */
/** @typedef {StoryParagraph | StoryDone} StoryEvent what the reading screen draws, one at a time */
/** @typedef {import('../catalog/catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../llm/client.js').Llm} Llm */
/** @typedef {ReturnType<typeof createStoriesService>} StoriesService */

/** How many stories a family keeps: stories are for re-reading, not for hoarding. */
const LIBRARY_CAP = 20

/**
 * @param {{
 *   db: Db,
 *   catalog: CatalogService,
 *   families: FamiliesService,
 *   llm?: Llm | null,
 *   model?: string,
 *   logger?: { error: (details: object, message: string) => void } | null,
 *   random?: () => number,
 *   now?: () => Date,
 * }} deps `llm` absent means template stories only; `model` is the model's name,
 *   which the story audit records; `logger` is where a failed audit row is
 *   reported; `now` lets tests fix the moment.
 */
export function createStoriesService({
  db,
  catalog,
  families,
  llm = null,
  model = '',
  logger = null,
  random = Math.random,
  now = () => new Date(),
}) {
  const templates = createTemplateStories({ db, catalog, families, random })
  // What was offered, picked and written, for adjusting the casting weights (JUG-139).
  const audit = createStoryAudit({ db, logger })
  // Built without an LLM too, since a plot's story that was already written replays without one.
  const generated = createGeneratedStories({ db, llm, families, audit, model, random, now })

  return {
    /**
     * Three stories the family could read, starring the kids playing. With
     * the LLM configured these are plot options written for them; without
     * it, catalog templates with their slots filled. The ones in `exclude`
     * (already on screen) come last, only if they still fit.
     * @param {string} familyId
     * @param {{ exclude?: string[], userId?: string | null }} [options] `userId` is the adult
     *   asking, whose kids sitting out are left out; without one, every kid plays
     * @returns {Promise<StoryOption[]>}
     */
    async options(familyId, { exclude = [], userId = null } = {}) {
      const profile = await families.playingProfile(familyId, userId)
      if (!llm) return templates.options(profile, exclude)
      const plots = await generated.options(profile, familyId, exclude)
      return plots.map((plot) => ({ id: plot.id, title: plot.title, teaser: plot.teaser, minutes: plot.minutes }))
    },

    /**
     * The story from this template, written for the kids playing.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ userId?: string | null }} [options] the adult asking; without one, every kid plays
     * @returns {Promise<Story>}
     */
    async write(familyId, templateId, { userId = null } = {}) {
      return templates.write(familyId, templateId, { userId })
    },

    /**
     * The story the chosen id leads to — a plot's or a template's — read
     * aloud, paragraph by paragraph, then once more whole. Whatever it is,
     * it is generated once and saved; rereading it returns the saved story.
     * A reader who leaves early hears no more and nothing is saved.
     * @param {string} familyId
     * @param {string} id a plot or a template
     * @param {{ signal?: AbortSignal, userId?: string | null }} [options] `userId` is the adult
     *   asking: a template story stars their kids playing, a plot's the kids it was written for
     * @returns {Promise<AsyncGenerator<StoryEvent, void, void>>}
     */
    async writeStream(familyId, id, { signal, userId = null } = {}) {
      if (await generated.hasPlot(familyId, id)) return generated.write(familyId, id, { signal })
      if (await catalog.storyTemplateById(id)) return templates.stream(familyId, id, { signal, userId })
      throw new NotFoundError('No such story')
    },

    /**
     * The family's recent stories, the ones worth reading again. Newest
     * first; short, because stories are for re-reading, not for hoarding.
     * @param {string} familyId
     * @returns {Promise<SavedStory[]>}
     */
    async list(familyId) {
      const rows = await db
        .select({ id: stories.id, title: stories.title, teaser: stories.teaser, minutes: stories.minutes, createdAt: stories.createdAt })
        .from(stories)
        .where(eq(stories.familyId, familyId))
        .orderBy(desc(stories.createdAt), desc(stories.id))
        .limit(LIBRARY_CAP)
      return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    },

    /**
     * One saved story, if the family wrote it.
     * @param {string} familyId
     * @param {string} storyId
     * @returns {Promise<Story>}
     */
    async find(familyId, storyId) {
      const [story] = await db
        .select(storyColumns)
        .from(stories)
        .where(and(eq(stories.familyId, familyId), eq(stories.id, storyId)))
      if (!story) throw new NotFoundError('No such story')
      return toStory(story)
    },
  }
}
