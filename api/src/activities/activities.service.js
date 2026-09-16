/**
 * The activities suggested to each family. A suggestion is a catalog template
 * that fits the family, with its slots filled from their profile, saved as
 * the parent saw it.
 */
import { desc, eq, sql } from 'drizzle-orm'
import { fillFor, render } from '../catalog/slots.js'
import { activities } from './activities.schema.js'
import { NotFoundError } from '../errors.js'
import { kidIdsOf } from '../families/families.service.js'

/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} Activity
 */
/** @typedef {import('../catalog/catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../materials/materials.service.js').MaterialsService} MaterialsService */
/** @typedef {ReturnType<typeof createActivitiesService>} ActivitiesService */

/** How many of the family's latest activities a new suggestion tries not to repeat. */
const RECENT = 3

/**
 * @param {{ db: Db, catalog: CatalogService, families: FamiliesService, materials: MaterialsService, random?: () => number }} deps
 */
export function createActivitiesService({ db, catalog, families, materials, random = Math.random }) {
  return {
    /**
     * Picks a template that is switched on, whose age range covers every kid
     * playing, whose slots the family can fill, and that needs no material the
     * family doesn't have (JUG-153), fills its slots, and saves the result
     * with the kids who played. The pick is random. It avoids the family's
     * latest activities when it can, and never repeats the one being moved on
     * from unless nothing else fits.
     * @param {string} familyId
     * @param {{ after?: string | null, userId?: string | null }} [options] the activity to move on
     *   from, and the adult asking, whose kids sitting out are left out (everyone plays without one)
     * @returns {Promise<Activity>}
     */
    async suggest(familyId, { after = null, userId = null } = {}) {
      const isAfter = sql`${activities.id} = ${after}`
      const [profile, templates, missing, recent] = await Promise.all([
        families.playingProfile(familyId, userId),
        catalog.activeActivityTemplates(),
        materials.missing(familyId),
        // The latest few, with the one being moved on from always among them.
        db
          .select({ templateId: activities.templateId, isAfter: isAfter.mapWith(Boolean) })
          .from(activities)
          .where(eq(activities.familyId, familyId))
          .orderBy(sql`${isAfter} desc nulls last`, desc(activities.createdAt))
          .limit(RECENT + 1),
      ])

      const fitting = templates.flatMap((template) => {
        if (template.materials.some((key) => missing.has(key))) return []
        const fill = fillFor(profile, template, random, { everyKid: true })
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
