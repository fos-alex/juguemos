/**
 * Stories for a family. For now each one is a story template with its slots
 * filled from the family profile; written stories are saved, so a story
 * reads again exactly as it did, and LLM stories will be saved the same way.
 */
import { fillFor, render, seededRandom, shuffle, unknownPlaceholders } from '../catalog/slots.js'
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
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {ReturnType<typeof createStoriesService>} StoriesService */

const OPTIONS = 3

/** @param {Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts'>} template */
const textsOf = (template) => [template.title, template.teaser, ...template.parts.flat()]

const TEMPLATE_COLUMNS = `id, title, teaser, minutes, min_age_months as "minAgeMonths", max_age_months as "maxAgeMonths", parts`

/** @param {unknown} parts */
const isParts = (parts) =>
  Array.isArray(parts) &&
  parts.length > 0 &&
  parts.every(
    (part) => Array.isArray(part) && part.length > 0 && part.every((paragraph) => typeof paragraph === 'string' && paragraph),
  )

/** @param {{ db: import('pg').Pool, families: FamiliesService, random?: () => number }} deps */
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
    const { rows } = await db.query(
      `select id, template_id as "templateId", title, teaser, minutes, parts
       from stories
       where family_id = $1 and template_id = $2`,
      [familyId, templateId],
    )
    return rows[0] ?? null
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
      const { rowCount } = await db.query(
        `insert into story_templates (slug, title, teaser, minutes, mood, min_age_months, max_age_months, parts)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (slug) do nothing`,
        [
          template.slug,
          template.title,
          template.teaser,
          template.minutes,
          template.mood,
          template.minAgeMonths,
          template.maxAgeMonths,
          JSON.stringify(template.parts),
        ],
      )
      return { created: rowCount === 1 }
    },

    /**
     * Three stories the family could read, filled for them. The ones in
     * `exclude` (already on screen) come last, only if nothing else fits.
     * @param {string} familyId
     * @param {{ exclude?: string[] }} [options]
     * @returns {Promise<StoryOption[]>}
     */
    async options(familyId, { exclude = [] } = {}) {
      const [profile, { rows: templates }] = await Promise.all([
        families.profileOf(familyId),
        db.query(`select ${TEMPLATE_COLUMNS} from story_templates order by slug`),
      ])
      const excluded = new Set(exclude)
      const fitting = templates
        .map((template) => ({ template, fill: fillOf(profile, template) }))
        .filter((candidate) => candidate.fill !== null)
      const fresh = fitting.filter((candidate) => !excluded.has(candidate.template.id))
      const seen = fitting.filter((candidate) => excluded.has(candidate.template.id))
      return [...shuffle(fresh, random), ...shuffle(seen, random)].slice(0, OPTIONS).map(({ template, fill }) => ({
        id: template.id,
        title: render(template.title, /** @type {NonNullable<typeof fill>} */ (fill)),
        teaser: render(template.teaser, /** @type {NonNullable<typeof fill>} */ (fill)),
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

      const { rows } = await db.query(`select ${TEMPLATE_COLUMNS} from story_templates where id = $1`, [templateId])
      const template = rows[0]
      if (!template) throw new NotFoundError('No such story')
      const fill = fillOf(await families.profileOf(familyId), template)
      if (!fill) throw new ConflictError('This story needs someone or something the family profile does not have')

      await db.query(
        `insert into stories (family_id, template_id, source, title, teaser, minutes, parts)
         values ($1, $2, 'template', $3, $4, $5, $6)
         on conflict (family_id, template_id) where template_id is not null do nothing`,
        [
          familyId,
          templateId,
          render(template.title, fill),
          render(template.teaser, fill),
          template.minutes,
          JSON.stringify(template.parts.map((/** @type {string[]} */ part) => part.map((paragraph) => render(paragraph, fill)))),
        ],
      )
      // Whether this call or one running alongside it wrote the story.
      return /** @type {Story} */ (await findWritten(familyId, templateId))
    },
  }
}
