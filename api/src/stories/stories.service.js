/**
 * Stories for a family. For now each one is a story template with its slots
 * filled from the family profile; written stories are saved, so a story
 * reads again exactly as it did, and LLM stories will be saved the same way.
 */
import { and, eq, sql } from 'drizzle-orm'
import { fillFor, render, seededRandom, shuffle, unknownPlaceholders } from '../catalog/slots.js'
import { stories, storyTemplates } from './stories.schema.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'

/**
 * @typedef {object} StoryTemplateInput
 * @property {string} slug
 * @property {string} title
 * @property {string} teaser
 * @property {number} minutes
 * @property {'calm' | 'lively'} mood
 * @property {number} minAgeMonths
 * @property {number} maxAgeMonths
 * @property {string[][]} parts each a list of paragraphs
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption the id is the template's */
/**
 * @typedef {{ id: string, templateId: string | null, title: string, teaser: string, minutes: number, parts: string[][] }} Story
 */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {ReturnType<typeof createStoriesService>} StoriesService */

const OPTIONS = 3

/** @param {Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts'>} template */
const textsOf = (template) => [template.title, template.teaser, ...template.parts.flat()]

const templateColumns = {
  id: storyTemplates.id,
  title: storyTemplates.title,
  teaser: storyTemplates.teaser,
  minutes: storyTemplates.minutes,
  minAgeMonths: storyTemplates.minAgeMonths,
  maxAgeMonths: storyTemplates.maxAgeMonths,
  parts: storyTemplates.parts,
}

/** @param {unknown} parts @returns {parts is string[][]} */
const isParts = (parts) =>
  Array.isArray(parts) &&
  parts.length > 0 &&
  parts.every(
    (part) => Array.isArray(part) && part.length > 0 && part.every((paragraph) => typeof paragraph === 'string' && paragraph),
  )

/** @param {{ db: Db, families: FamiliesService, random?: () => number }} deps */
export function createStoriesService({ db, families, random = Math.random }) {
  /**
   * A template's slots filled for this family. Seeded by family and
   * template, so an option and the story written from it always match.
   * @param {Profile} profile
   * @param {{ id: string } & Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts' | 'minAgeMonths' | 'maxAgeMonths'>} template
   */
  const fillOf = (profile, template) =>
    fillFor(profile, { ...template, texts: textsOf(template) }, seededRandom(`${profile.id}:${template.id}`))

  /** @param {string} familyId @param {string} templateId @returns {Promise<Story | null>} */
  const findWritten = async (familyId, templateId) => {
    const [story] = await db
      .select({
        id: stories.id,
        templateId: stories.templateId,
        title: stories.title,
        teaser: stories.teaser,
        minutes: stories.minutes,
        parts: stories.parts,
      })
      .from(stories)
      .where(and(eq(stories.familyId, familyId), eq(stories.templateId, templateId)))
    return /** @type {Story | undefined} */ (story) ?? null
  }

  return {
    /**
     * Adds a template to the catalog unless one with its slug is already
     * there; a template already in the database is never overwritten.
     * @param {StoryTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addTemplate(template) {
      if (!isParts(template.parts)) throw new ValidationError(`${template.slug} needs parts, each a list of paragraphs`)
      const unknown = unknownPlaceholders(textsOf(template))
      if (unknown.length > 0) throw new ValidationError(`Unknown slots in ${template.slug}: ${unknown.join(', ')}`)
      const added = await db
        .insert(storyTemplates)
        .values(template)
        .onConflictDoNothing({ target: storyTemplates.slug })
        .returning({ id: storyTemplates.id })
      return { created: added.length === 1 }
    },

    /**
     * Three stories the family could read, filled for them. The ones in
     * `exclude` (already on screen) come last, only if nothing else fits.
     * @param {string} familyId
     * @param {{ exclude?: string[] }} [options]
     * @returns {Promise<StoryOption[]>}
     */
    async options(familyId, { exclude = [] } = {}) {
      const [profile, rows] = await Promise.all([
        families.profileOf(familyId),
        db.select(templateColumns).from(storyTemplates).orderBy(storyTemplates.slug),
      ])
      const templates = rows.map((row) => ({ ...row, parts: /** @type {string[][]} */ (row.parts) }))
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
     * The story from this template, written for the family. Written once and
     * saved; asking again returns the saved story.
     * @param {string} familyId
     * @param {string} templateId
     * @returns {Promise<Story>}
     */
    async write(familyId, templateId) {
      const written = await findWritten(familyId, templateId)
      if (written) return written

      const [row] = await db.select(templateColumns).from(storyTemplates).where(eq(storyTemplates.id, templateId))
      if (!row) throw new NotFoundError('No such story')
      const template = { ...row, parts: /** @type {string[][]} */ (row.parts) }
      const fill = fillOf(await families.profileOf(familyId), template)
      if (!fill) throw new ConflictError('This story needs someone or something the family profile does not have')

      await db
        .insert(stories)
        .values({
          familyId,
          templateId,
          source: 'template',
          title: render(template.title, fill),
          teaser: render(template.teaser, fill),
          minutes: template.minutes,
          parts: template.parts.map((part) => part.map((paragraph) => render(paragraph, fill))),
        })
        .onConflictDoNothing({ target: [stories.familyId, stories.templateId], where: sql`${stories.templateId} is not null` })
      // Whether this call or one running alongside it wrote the story.
      return /** @type {Story} */ (await findWritten(familyId, templateId))
    },
  }
}
