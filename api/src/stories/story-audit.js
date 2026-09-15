/**
 * The audit trail of the story loop (JUG-139): what the family was offered,
 * what they picked, and what was written, with the casting behind each one
 * and the timings. It is what the casting weights are adjusted from, and it
 * is read in SQL for now; nothing serves it over HTTP.
 *
 * No prompt text and no story text go in it, and the kids are ids.
 *
 * A story must never fail because its audit row didn't save, so a failed
 * insert is logged and let go. Without a logger it throws, which is what a
 * test wants.
 */
import { storyAudit } from './stories.schema.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('./casting.js').Casting} Casting */
/** @typedef {'offered' | 'picked' | 'written'} StoryEventName */
/** @typedef {ReturnType<typeof createStoryAudit>} StoryAudit */

/**
 * @param {{ db: Db, logger?: { error: (details: object, message: string) => void } | null }} deps
 */
export function createStoryAudit({ db, logger = null }) {
  return {
    /**
     * Records one thing that happened to a story.
     * @param {StoryEventName} event
     * @param {{
     *   familyId: string,
     *   kidIds?: string[],
     *   band: string,
     *   mood: 'calm' | 'lively',
     *   plotId?: string | null,
     *   keyword?: string | null,
     *   casting?: Casting | null,
     *   details?: object,
     * }} row
     */
    async record(event, { familyId, kidIds = [], band, mood, plotId = null, keyword = null, casting = null, details = {} }) {
      try {
        await db.insert(storyAudit).values({ familyId, event, kidIds, band, mood, plotId, keyword, casting, details })
      } catch (error) {
        if (!logger) throw error
        logger.error({ err: error, event }, 'the story audit did not record an event')
      }
    },
  }
}
