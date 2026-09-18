import { familyOf } from '../families/require-family.js'

/** @typedef {import('./history.service.js').HistoryService} HistoryService */

/** The signed-in adult's family history. @param {{ history: HistoryService }} deps */
export function createHistoryController({ history }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async recent(request) {
      const { activities, stories } = await history.recent(familyOf(request))
      return {
        activities: activities.map((activity) => ({ ...activity, playedAt: activity.playedAt.toISOString() })),
        stories: stories.map((story) => ({ ...story, readAt: story.readAt.toISOString() })),
      }
    },
  }
}
