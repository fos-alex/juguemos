/**
 * The family's history (JUG-188): the juegos they played and the stories they
 * read lately, so a parent can go back to one the kids loved. Each is there
 * once, at the last time it was played or read. Activities and stories each
 * read their own; this only says how far back.
 */

/** @typedef {import('../activities/activities.service.js').ActivitiesService} ActivitiesService */
/** @typedef {import('../activities/activities.service.js').PlayedActivity} PlayedActivity */
/** @typedef {import('../stories/stories.service.js').StoriesService} StoriesService */
/** @typedef {import('../stories/stories.service.js').ReadStory} ReadStory */
/** @typedef {ReturnType<typeof createHistoryService>} HistoryService */

/** How far back the history goes: a month, not everything the family ever did. */
export const HISTORY_DAYS = 30

/** The most juegos, and the most stories, it holds, however busy the month was. */
const LIMIT = 100

/**
 * @param {{ activities: ActivitiesService, stories: StoriesService, now?: () => Date }} deps
 */
export function createHistoryService({ activities, stories, now = () => new Date() }) {
  return {
    /**
     * The juegos played and the stories read in the last month, each list
     * with the latest first.
     * @param {string} familyId
     * @returns {Promise<{ activities: PlayedActivity[], stories: ReadStory[] }>}
     */
    async recent(familyId) {
      const since = new Date(now().getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
      const [played, read] = await Promise.all([
        activities.playedSince(familyId, { since, limit: LIMIT }),
        stories.readSince(familyId, { since, limit: LIMIT }),
      ])
      return { activities: played, stories: read }
    },
  }
}
