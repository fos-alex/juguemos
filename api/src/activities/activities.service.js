/**
 * The activity catalog and the activities suggested from it. A suggestion is
 * a template that fits the family, with its slots filled from their profile,
 * saved as the parent saw it.
 */
import { desc, eq, sql } from 'drizzle-orm'
import { fillFor, render, unknownPlaceholders } from '../catalog/slots.js'
import { activities, activityTemplates } from './activities.schema.js'
import { NotFoundError, ValidationError } from '../errors.js'

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
 */
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

/** @param {Pick<ActivityTemplateInput, 'title' | 'why' | 'needs' | 'steps' | 'easier' | 'harder'>} template */
const textsOf = (template) => [
  template.title,
  template.why,
  template.needs,
  ...template.steps,
  template.easier,
  template.harder,
]

/** @param {{ db: Db, families: FamiliesService, random?: () => number }} deps */
export function createActivitiesService({ db, families, random = Math.random }) {
  return {
    /**
     * Adds a template to the catalog unless one with its slug is already
     * there. The database is the catalog's home, so a template already in it
     * is never overwritten.
     * @param {ActivityTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addTemplate(template) {
      const unknown = unknownPlaceholders(textsOf(template))
      if (unknown.length > 0) throw new ValidationError(`Unknown slots in ${template.slug}: ${unknown.join(', ')}`)
      const added = await db
        .insert(activityTemplates)
        .values(template)
        .onConflictDoNothing({ target: activityTemplates.slug })
        .returning({ id: activityTemplates.id })
      return { created: added.length === 1 }
    },

    /**
     * Picks a template whose age range covers every kid and whose slots the
     * family can fill, fills them, and saves the result. It avoids the
     * family's latest activities when it can, and never repeats the one being
     * moved on from unless nothing else fits.
     * @param {string} familyId
     * @param {{ after?: string | null }} [options] the activity to move on from
     * @returns {Promise<Activity>}
     */
    async suggest(familyId, { after = null } = {}) {
      const isAfter = sql`${activities.id} = ${after}`
      const [profile, templates, recent] = await Promise.all([
        families.profileOf(familyId),
        db.select().from(activityTemplates).orderBy(activityTemplates.slug),
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
        .values({ familyId, templateId: template.id, ...activity })
        .returning({ id: activities.id })
      return { id, ...activity }
    },
  }
}
