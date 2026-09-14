/**
 * The activity catalog and the activities suggested from it. A suggestion is
 * a template that fits the family, with its slots filled from their profile,
 * saved as the parent saw it.
 */
import { fillFor, render, unknownPlaceholders } from '../catalog/slots.js'
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

/** @param {{ db: import('pg').Pool, families: FamiliesService, random?: () => number }} deps */
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
      const { rowCount } = await db.query(
        `insert into activity_templates (
           slug, title, minutes, place, min_age_months, max_age_months, energy, categories, small_space,
           materials, skills, safety, why, needs, steps, easier, harder
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         on conflict (slug) do nothing`,
        [
          template.slug,
          template.title,
          template.minutes,
          template.place,
          template.minAgeMonths,
          template.maxAgeMonths,
          template.energy,
          template.categories,
          template.smallSpace,
          template.materials,
          template.skills,
          template.safety,
          template.why,
          template.needs,
          template.steps,
          template.easier,
          template.harder,
        ],
      )
      return { created: rowCount === 1 }
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
      const [profile, templates, recent] = await Promise.all([
        families.profileOf(familyId),
        db
          .query(
            `select id, title, minutes, place, min_age_months as "minAgeMonths", max_age_months as "maxAgeMonths",
                    why, needs, steps, easier, harder
             from activity_templates
             order by slug`,
          )
          .then(({ rows }) => rows),
        // The latest few, with the one being moved on from always among them.
        db
          .query(
            `select template_id as "templateId", id = $2 as "isAfter"
             from activities
             where family_id = $1
             order by id = $2 desc nulls last, created_at desc
             limit $3`,
            [familyId, after, RECENT + 1],
          )
          .then(({ rows }) => rows),
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
        steps: template.steps.map((/** @type {string} */ step) => render(step, fill)),
        easier: render(template.easier, fill),
        harder: render(template.harder, fill),
      }
      const { rows } = await db.query(
        `insert into activities (family_id, template_id, title, minutes, place, why, needs, steps, easier, harder)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id`,
        [
          familyId,
          template.id,
          activity.title,
          activity.minutes,
          activity.place,
          activity.why,
          activity.needs,
          activity.steps,
          activity.easier,
          activity.harder,
        ],
      )
      return { id: rows[0].id, ...activity }
    },
  }
}
