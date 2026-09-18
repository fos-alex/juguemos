/**
 * The activities suggested to each family. A suggestion is a catalog template
 * that fits the family, ranked above the others that fit (ranking.js), with
 * its slots filled from their profile, saved as the parent saw it. The
 * parent's reaction to it (JUG-23) is saved on the same row, and every later
 * ranking reads it.
 */
import { and, count, desc, eq, isNotNull, ne, sql } from 'drizzle-orm'
import { fillFor, render } from '../catalog/slots.js'
import { themesOf } from '../catalog/themes.js'
import { moodAt } from '../clock.js'
import { activities } from './activities.schema.js'
import { rank } from './ranking.js'
import { NotFoundError } from '../errors.js'
import { kidIdsOf } from '../families/families.service.js'

/** @typedef {'up' | 'down'} Reaction */
/** @typedef {import('../clock.js').Mood} Mood */
/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 *   reaction: Reaction | null,
 * }} Activity
 */
/** @typedef {import('../catalog/catalog.service.js').CatalogService} CatalogService */
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../materials/materials.service.js').MaterialsService} MaterialsService */
/** @typedef {import('../weather/weather.service.js').WeatherService} WeatherService */
/** @typedef {ReturnType<typeof createActivitiesService>} ActivitiesService */

/** How many of the family's latest activities the ranking reads. */
const HISTORY = 400

/**
 * @param {{
 *   db: Db,
 *   catalog: CatalogService,
 *   families: FamiliesService,
 *   materials: MaterialsService,
 *   weather: WeatherService,
 *   random?: () => number,
 *   now?: () => Date,
 * }} deps `random` is the only source of chance, `now` the clock the
 *   freshness is measured against; tests pin both. `weather` answers null for
 *   a family that hasn't said where they live, and whenever it can't be read.
 */
export function createActivitiesService({
  db,
  catalog,
  families,
  materials,
  weather,
  random = Math.random,
  now = () => new Date(),
}) {
  return {
    /**
     * Picks a template that is switched on, whose age range covers every kid
     * playing, whose slots the family can fill, and that needs no material the
     * family doesn't have (JUG-153); ranks what fits by fit, feedback,
     * freshness, difference from the juego being left, the moment, and what
     * it is like outside (ranking.js); fills the winner's slots; and saves
     * the result with the kids who played and why it won.
     * @param {string} familyId
     * @param {{ after?: string | null, userId?: string | null, mood?: Mood | null }} [options] the
     *   activity to move on from; the adult asking, whose kids sitting out are left out (everyone
     *   plays without one); and the moment the juego is for (JUG-26). A caller that leaves `mood`
     *   out gets the clock's, calm in the evening, so a juego is calm before bed even when the
     *   client says nothing; `null` asks for no preference.
     * @returns {Promise<Activity>}
     */
    async suggest(familyId, { after = null, userId = null, mood } = {}) {
      const at = now()
      const isAfter = sql`${activities.id} = ${after}`
      const [profile, templates, missing, history, others, place] = await Promise.all([
        families.playingProfile(familyId, userId),
        catalog.activeActivityTemplates(),
        materials.missing(familyId),
        // The latest ones, with the one being moved on from always among them.
        db
          .select({
            id: activities.id,
            templateId: activities.templateId,
            createdAt: activities.createdAt,
            reaction: activities.reaction,
            isAfter: isAfter.mapWith(Boolean),
          })
          .from(activities)
          .where(eq(activities.familyId, familyId))
          .orderBy(sql`${isAfter} desc nulls last`, desc(activities.createdAt))
          .limit(HISTORY),
        // Every other family's reactions, by template.
        db
          .select({ templateId: activities.templateId, reaction: activities.reaction, count: count() })
          .from(activities)
          .where(and(ne(activities.familyId, familyId), isNotNull(activities.reaction), isNotNull(activities.templateId)))
          .groupBy(activities.templateId, activities.reaction),
        // Where the family lives, for the weather (JUG-25). Null until they say.
        families.placeOf(familyId),
      ])
      // Cached per location on the server, and never a reason to fail a juego.
      const conditions = await weather.conditionsAt(place)

      const fitting = templates.flatMap((template) => {
        if (template.materials.some((key) => missing.has(key))) return []
        const fill = fillFor(profile, template, random, { everyKid: true })
        return fill ? [{ template, fill }] : []
      })
      if (fitting.length === 0) {
        throw new NotFoundError('No activity in the catalog fits this family yet', 'NO_FITTING_ACTIVITY')
      }

      /** @type {Map<string, { ups: number, downs: number }>} */
      const counts = new Map()
      for (const row of others) {
        const id = /** @type {string} */ (row.templateId)
        const entry = counts.get(id) ?? { ups: 0, downs: 0 }
        if (row.reaction === 'up') entry.ups += row.count
        else entry.downs += row.count
        counts.set(id, entry)
      }
      const afterTemplateId = history.find((row) => row.isAfter)?.templateId ?? null
      const [{ template, fill, pick }] = rank(fitting, {
        interestThemes: themesOf(profile.interests),
        favoriteToys: profile.toys.filter((toy) => toy.favorite).map((toy) => toy.name),
        history: history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        others: counts,
        catalog: templates,
        after: templates.find((each) => each.id === afterTemplateId) ?? null,
        mood: mood === undefined ? moodAt(at) : mood,
        conditions,
        now: at,
        random,
      })

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
        .values({ familyId, templateId: template.id, kidIds: kidIdsOf(profile), pick, ...activity })
        .returning({ id: activities.id })
      return { id, ...activity, reaction: null }
    },

    /**
     * Saves how a juego went, or takes the reaction back with null. One
     * reaction per juego, and the parent can change it (JUG-23).
     * @param {string} familyId
     * @param {string} id
     * @param {Reaction | null} reaction
     * @returns {Promise<{ id: string, reaction: Reaction | null }>}
     */
    async react(familyId, id, reaction) {
      const [row] = await db
        .update(activities)
        .set({ reaction, reactedAt: reaction ? now() : null })
        .where(and(eq(activities.id, id), eq(activities.familyId, familyId)))
        .returning({ id: activities.id, reaction: activities.reaction })
      if (!row) throw new NotFoundError('No such activity')
      return row
    },
  }
}
