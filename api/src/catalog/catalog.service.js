/**
 * The catalog: every activity and story template, and the only place they are
 * read from or written to. The seeds load templates into it, the admin edits
 * the activity ones, and activities and stories ask it for the templates that
 * could fit a family.
 */
import { and, eq, isNull } from 'drizzle-orm'
import { unknownPlaceholders } from './slots.js'
import { activityTemplates, storyTemplates } from './catalog.schema.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'

/**
 * @typedef {object} ActivityTemplateInput
 * @property {string} slug
 * @property {string} title
 * @property {number} minutes
 * @property {'indoor' | 'outdoor'} place
 * @property {number} minAgeMonths
 * @property {number} maxAgeMonths
 * @property {'low' | 'medium' | 'high'} energy
 * @property {string[]} categories move, create, pretend, explore, learn, low_energy, helpers, out_and_about
 * @property {boolean} smallSpace
 * @property {string[]} materials
 * @property {string[]} skills
 * @property {string[]} safety rules the tailoring may never change
 * @property {string} why
 * @property {string} needs starts lowercase, so a toy's name keeps the family's spelling
 * @property {string[]} steps
 * @property {string} easier
 * @property {string} harder
 * @property {boolean} [active] on unless set; off keeps it out of the suggestions
 */
/** @typedef {Omit<ActivityTemplateInput, 'slug'>} ActivityTemplateUpdate everything but the slug, which never changes */
/** @typedef {typeof activityTemplates.$inferSelect} ActivityTemplate */
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
/**
 * @typedef {{
 *   id: string, title: string, teaser: string, minutes: number,
 *   minAgeMonths: number, maxAgeMonths: number, parts: string[][],
 * }} StoryTemplate
 */
/**
 * @typedef {ActivityTemplate & { texts: string[] }} FillableActivityTemplate
 * A template with the texts its slots are in, which is what fillFor reads.
 */
/** @typedef {StoryTemplate & { texts: string[] }} FillableStoryTemplate */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {ReturnType<typeof createCatalogService>} CatalogService */

/** Templates that haven't been deleted from the admin. */
const inCatalog = isNull(activityTemplates.deletedAt)

const storyTemplateColumns = {
  id: storyTemplates.id,
  title: storyTemplates.title,
  teaser: storyTemplates.teaser,
  minutes: storyTemplates.minutes,
  minAgeMonths: storyTemplates.minAgeMonths,
  maxAgeMonths: storyTemplates.maxAgeMonths,
  parts: storyTemplates.parts,
}

/** @param {Pick<ActivityTemplateInput, 'title' | 'why' | 'needs' | 'steps' | 'easier' | 'harder'>} template */
const activityTexts = (template) => [
  template.title,
  template.why,
  template.needs,
  ...template.steps,
  template.easier,
  template.harder,
]

/** @param {Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts'>} template */
const storyTexts = (template) => [template.title, template.teaser, ...template.parts.flat()]

/**
 * Refuses what the catalog can't hold: a slot code can't fill, or an age
 * range that ends before it starts.
 * @param {ActivityTemplateUpdate & { slug?: string }} template
 */
function checkTemplate(template) {
  const unknown = unknownPlaceholders(activityTexts(template))
  if (unknown.length > 0) {
    const names = unknown.map((name) => `{${name}}`).join(', ')
    throw new ValidationError(`Unknown slots in ${template.slug ?? template.title}: ${names}`, 'UNKNOWN_SLOTS')
  }
  if (template.maxAgeMonths < template.minAgeMonths) {
    throw new ValidationError('maxAgeMonths is below minAgeMonths', 'AGE_RANGE')
  }
}

/** @param {unknown} parts @returns {parts is string[][]} */
const isParts = (parts) =>
  Array.isArray(parts) &&
  parts.length > 0 &&
  parts.every(
    (part) => Array.isArray(part) && part.length > 0 && part.every((paragraph) => typeof paragraph === 'string' && paragraph),
  )

/** A story template row, with its parts typed and its texts ready to fill. @param {Record<string, any>} row */
const asStoryTemplate = (row) => {
  const template = { ...row, parts: /** @type {string[][]} */ (row.parts) }
  return /** @type {FillableStoryTemplate} */ ({ ...template, texts: storyTexts(template) })
}

/** @param {{ db: Db }} deps */
export function createCatalogService({ db }) {
  return {
    /**
     * Adds an activity template unless one with its slug is already there.
     * The database is the catalog's home, so a template already in it is
     * never overwritten, and one deleted from the admin never comes back.
     * @param {ActivityTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addActivityTemplate(template) {
      checkTemplate(template)
      const added = await db
        .insert(activityTemplates)
        .values(template)
        .onConflictDoNothing({ target: activityTemplates.slug })
        .returning({ id: activityTemplates.id })
      return { created: added.length === 1 }
    },

    /**
     * Adds a story template unless one with its slug is already there; a
     * template already in the database is never overwritten.
     * @param {StoryTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addStoryTemplate(template) {
      if (!isParts(template.parts)) throw new ValidationError(`${template.slug} needs parts, each a list of paragraphs`)
      const unknown = unknownPlaceholders(storyTexts(template))
      if (unknown.length > 0) throw new ValidationError(`Unknown slots in ${template.slug}: ${unknown.join(', ')}`)
      const added = await db
        .insert(storyTemplates)
        .values(template)
        .onConflictDoNothing({ target: storyTemplates.slug })
        .returning({ id: storyTemplates.id })
      return { created: added.length === 1 }
    },

    /**
     * Loads the seed's templates. The database is the catalog's home, so a
     * template already in it is never overwritten; this runs on every deploy.
     * @param {{ activityTemplates: ActivityTemplateInput[], storyTemplates: StoryTemplateInput[] }} templates
     * @param {(message: string) => void} [log]
     */
    async load(templates, log = () => {}) {
      let added = 0
      for (const template of templates.activityTemplates) if ((await this.addActivityTemplate(template)).created) added++
      for (const template of templates.storyTemplates) if ((await this.addStoryTemplate(template)).created) added++
      const total = templates.activityTemplates.length + templates.storyTemplates.length
      log(`Catalog: ${added} template(s) added, ${total - added} already there`)
    },

    /** Every activity template in the catalog, on or off. @returns {Promise<ActivityTemplate[]>} */
    async listTemplates() {
      return db.select().from(activityTemplates).where(inCatalog).orderBy(activityTemplates.slug)
    },

    /** @param {string} id @returns {Promise<ActivityTemplate>} */
    async templateById(id) {
      const [template] = await db
        .select()
        .from(activityTemplates)
        .where(and(eq(activityTemplates.id, id), inCatalog))
      if (!template) throw new NotFoundError('Activity template not found')
      return template
    },

    /**
     * Adds a template from the admin. Its slug must be new, and that includes
     * the slugs of deleted templates.
     * @param {ActivityTemplateInput} template
     * @returns {Promise<ActivityTemplate>}
     */
    async createTemplate(template) {
      checkTemplate(template)
      const [created] = await db
        .insert(activityTemplates)
        .values(template)
        .onConflictDoNothing({ target: activityTemplates.slug })
        .returning()
      if (!created) throw new ConflictError('A template already uses this slug', 'SLUG_TAKEN')
      return created
    },

    /**
     * Replaces everything but the slug, which is how the seeds know a
     * template. Activities already suggested keep the text the family saw.
     * @param {string} id
     * @param {ActivityTemplateUpdate} template
     * @returns {Promise<ActivityTemplate>}
     */
    async updateTemplate(id, template) {
      checkTemplate(template)
      const [updated] = await db
        .update(activityTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(and(eq(activityTemplates.id, id), inCatalog))
        .returning()
      if (!updated) throw new NotFoundError('Activity template not found')
      return updated
    },

    /**
     * Takes a template out of the catalog for good. Its row stays, marked
     * deleted, so the catalog seed still finds its slug and never adds it back.
     * @param {string} id
     */
    async deleteTemplate(id) {
      const now = new Date()
      const deleted = await db
        .update(activityTemplates)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(activityTemplates.id, id), inCatalog))
        .returning({ id: activityTemplates.id })
      if (deleted.length === 0) throw new NotFoundError('Activity template not found')
    },

    /**
     * The activity templates a suggestion can come from: switched on, not
     * deleted, by slug, each with the texts its slots are in.
     * @returns {Promise<FillableActivityTemplate[]>}
     */
    async activeActivityTemplates() {
      const rows = await db
        .select()
        .from(activityTemplates)
        .where(and(eq(activityTemplates.active, true), inCatalog))
        .orderBy(activityTemplates.slug)
      return rows.map((row) => ({ ...row, texts: activityTexts(row) }))
    },

    /** Every story template, by slug, each with the texts its slots are in. @returns {Promise<FillableStoryTemplate[]>} */
    async storyTemplatesList() {
      const rows = await db.select(storyTemplateColumns).from(storyTemplates).orderBy(storyTemplates.slug)
      return rows.map(asStoryTemplate)
    },

    /** One story template, or null. @param {string} id @returns {Promise<FillableStoryTemplate | null>} */
    async storyTemplateById(id) {
      const [row] = await db.select(storyTemplateColumns).from(storyTemplates).where(eq(storyTemplates.id, id))
      return row ? asStoryTemplate(row) : null
    },
  }
}
