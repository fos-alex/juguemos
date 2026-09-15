/**
 * Stories from the catalog templates, with their slots filled from the
 * family profile (no LLM). A template's story is written once for each set
 * of kids playing and saved, so it reads again exactly as it did.
 */
import { and, eq, sql } from 'drizzle-orm'
import { fillFor, render, seededRandom, shuffle } from '../catalog/slots.js'
import { ConflictError, NotFoundError } from '../errors.js'
import { kidIdsOf } from '../families/families.service.js'
import { OPTIONS, replayEvents, storyColumns, toStory } from './shared.js'
import { stories } from './stories.schema.js'

/** @typedef {import('../catalog/catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('../catalog/catalog.service.js').FillableStoryTemplate} StoryTemplate */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('./stories.service.js').Story} Story */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {import('./stories.service.js').StoryOption} StoryOption */

/**
 * @param {{ db: Db, catalog: CatalogService, families: FamiliesService, random?: () => number }} deps
 *   `random` picks which templates are offered; tests fix it.
 */
export function createTemplateStories({ db, catalog, families, random = Math.random }) {
  /**
   * A template's slots filled for this family. Seeded by family and
   * template, so an option and the story written from it always match.
   * @param {Profile} profile
   * @param {StoryTemplate} template
   */
  const fillOf = (profile, template) => fillFor(profile, template, seededRandom(`${profile.id}:${template.id}`))

  /**
   * A template's story is written once for each set of kids playing.
   * @param {string} familyId @param {string} templateId @param {string[]} kidIds @returns {Promise<Story | null>}
   */
  const findWritten = async (familyId, templateId, kidIds) => {
    const [story] = await db
      .select(storyColumns)
      .from(stories)
      .where(and(eq(stories.familyId, familyId), eq(stories.templateId, templateId), eq(stories.kidIds, kidIds)))
    return story ? toStory(story) : null
  }

  return {
    /**
     * Options from the catalog templates, filled for the family. The ones in
     * `exclude` (already on screen) come last, only if they still fit.
     * @param {Profile} profile
     * @param {string[]} exclude
     * @returns {Promise<StoryOption[]>}
     */
    async options(profile, exclude) {
      const templates = await catalog.storyTemplatesList()
      const excluded = new Set(exclude)
      const fitting = templates.flatMap((template) => {
        const fill = fillOf(profile, template)
        return fill ? [{ template, fill }] : []
      })
      const fresh = fitting.filter((candidate) => !excluded.has(candidate.template.id))
      const seen = fitting.filter((candidate) => excluded.has(candidate.template.id))
      return [...shuffle(fresh, random), ...shuffle(seen, random)].slice(0, OPTIONS).map(({ template, fill }) => ({
        id: template.id,
        title: render(template.title, fill),
        teaser: render(template.teaser, fill),
        minutes: template.minutes,
      }))
    },

    /**
     * The story from this template, written for the kids playing. Written
     * once for each set of kids and saved; asking again returns the saved story.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ userId?: string | null }} [options] the adult asking; without one, every kid plays
     * @returns {Promise<Story>}
     */
    async write(familyId, templateId, { userId = null } = {}) {
      const profile = await families.playingProfile(familyId, userId)
      const kidIds = kidIdsOf(profile)
      const written = await findWritten(familyId, templateId, kidIds)
      if (written) return written

      const template = await catalog.storyTemplateById(templateId)
      if (!template) throw new NotFoundError('No such story')
      const fill = fillOf(profile, template)
      if (!fill) throw new ConflictError('This story needs someone or something the family profile does not have')

      await db
        .insert(stories)
        .values({
          familyId,
          templateId,
          kidIds,
          source: 'template',
          title: render(template.title, fill),
          teaser: render(template.teaser, fill),
          minutes: template.minutes,
          parts: template.parts.map((part) => part.map((paragraph) => render(paragraph, fill))),
        })
        .onConflictDoNothing({
          target: [stories.familyId, stories.templateId, stories.kidIds],
          where: sql`${stories.templateId} is not null`,
        })
      // Whether this call or one running alongside it wrote the story.
      return /** @type {Story} */ (await findWritten(familyId, templateId, kidIds))
    },

    /**
     * A catalog story, with its slots filled, read as events like a story the
     * model wrote, so the web never tells the kinds apart.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ signal?: AbortSignal, userId?: string | null }} [options]
     * @returns {AsyncGenerator<StoryEvent, void, void>}
     */
    async *stream(familyId, templateId, { signal, userId = null } = {}) {
      const story = await this.write(familyId, templateId, { userId })
      yield* replayEvents(story, { signal })
    },
  }
}
