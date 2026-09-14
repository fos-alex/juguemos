/**
 * The activity catalog and the activities suggested from it. A suggestion is
 * a template that fits the family, with its slots filled from their profile,
 * saved as the parent saw it.
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { fillFor, render, unknownPlaceholders } from '../catalog/slots.js'
import { activities, activityTemplates } from './activities.schema.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'
import { kidIdsOf } from '../families/families.service.js'

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
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} Activity
 */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {ReturnType<typeof createActivitiesService>} ActivitiesService */

/** How many of the family's latest activities a new suggestion tries not to repeat. */
const RECENT = 3

/** Templates that haven't been deleted from the admin. */
const inCatalog = isNull(activityTemplates.deletedAt)

/** @param {Pick<ActivityTemplateInput, 'title' | 'why' | 'needs' | 'steps' | 'easier' | 'harder'>} template */
const textsOf = (template) => [
  template.title,
  template.why,
  template.needs,
  ...template.steps,
  template.easier,
  template.harder,
]

/**
 * Refuses what the catalog can't hold: a slot code can't fill, or an age
 * range that ends before it starts.
 * @param {ActivityTemplateUpdate & { slug?: string }} template
 */
function checkTemplate(template) {
  const unknown = unknownPlaceholders(textsOf(template))
  if (unknown.length > 0) {
    const names = unknown.map((name) => `{${name}}`).join(', ')
    throw new ValidationError(`Unknown slots in ${template.slug ?? template.title}: ${names}`, 'UNKNOWN_SLOTS')
  }
  if (template.maxAgeMonths < template.minAgeMonths) {
    throw new ValidationError('maxAgeMonths is below minAgeMonths', 'AGE_RANGE')
  }
}

/** @param {{ db: Db, families: FamiliesService, random?: () => number }} deps */
export function createActivitiesService({ db, families, random = Math.random }) {
  return {
    /**
     * Adds a template to the catalog unless one with its slug is already
     * there. The database is the catalog's home, so a template already in it
     * is never overwritten, and one deleted from the admin never comes back.
     * @param {ActivityTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addTemplate(template) {
      checkTemplate(template)
      const added = await db
        .insert(activityTemplates)
        .values(template)
        .onConflictDoNothing({ target: activityTemplates.slug })
        .returning({ id: activityTemplates.id })
      return { created: added.length === 1 }
    },

    /** Every template in the catalog, on or off. @returns {Promise<ActivityTemplate[]>} */
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
     * Picks a template that is switched on, whose age range covers every kid
     * playing, and whose slots the family can fill, fills them, and saves the
     * result with the kids who played. The pick is random. It avoids the
     * family's latest activities when it can, and never repeats the one being
     * moved on from unless nothing else fits.
     * @param {string} familyId
     * @param {{ after?: string | null, userId?: string | null }} [options] the activity to move on
     *   from, and the adult asking, whose kids sitting out are left out (everyone plays without one)
     * @returns {Promise<Activity>}
     */
    async suggest(familyId, { after = null, userId = null } = {}) {
      const isAfter = sql`${activities.id} = ${after}`
      const [profile, templates, recent] = await Promise.all([
        families.playingProfile(familyId, userId),
        db
          .select()
          .from(activityTemplates)
          .where(and(eq(activityTemplates.active, true), inCatalog))
          .orderBy(activityTemplates.slug),
        // The latest few, with the one being moved on from always among them.
        db
          .select({ templateId: activities.templateId, isAfter: isAfter.mapWith(Boolean) })
          .from(activities)
          .where(eq(activities.familyId, familyId))
          .orderBy(sql`${isAfter} desc nulls last`, desc(activities.createdAt))
          .limit(RECENT + 1),
      ])

      const fitting = templates.flatMap((template) => {
        const fill = fillFor(profile, { ...template, texts: textsOf(template) }, random, { everyKid: true })
        return fill ? [{ template, fill }] : []
      })
      if (fitting.length === 0) {
        throw new NotFoundError('No activity in the catalog fits this family yet', 'NO_FITTING_ACTIVITY')
      }

      const afterTemplate = recent.find((row) => row.isAfter)?.templateId
      const avoid = new Set(recent.map((row) => row.templateId))
      /** @param {typeof fitting} pool */
      const choose = (pool) => pool[Math.floor(random() * pool.length)]
      const { template, fill } =
        choose(fitting.filter((candidate) => !avoid.has(candidate.template.id))) ??
        choose(fitting.filter((candidate) => candidate.template.id !== afterTemplate)) ??
        choose(fitting)

      const activity = {
        title: render(template.title, fill),
        minutes: template.minutes,
        place: template.place,
        why: render(template.why, fill),
        needs: render(template.needs, fill, { keepStart: true }),
        steps: template.steps.map((step) => render(step, fill)),
        easier: render(template.easier, fill),
        harder: render(template.harder, fill),
      }
      const [{ id }] = await db
        .insert(activities)
        .values({ familyId, templateId: template.id, kidIds: kidIdsOf(profile), ...activity })
        .returning({ id: activities.id })
      return { id, ...activity }
    },
  }
}
