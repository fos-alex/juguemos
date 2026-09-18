/**
 * The shapes Lo que jugamos works with (JUG-188), as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   reaction: 'up' | 'down' | null, playedAt: string,
 * }} PlayedActivity
 * A juego the family played: `playedAt` is the last time they tapped Empezar
 * on it, or said ¡Lo hicimos!, as an ISO date.
 */
/**
 * @typedef {{
 *   id: string, title: string, teaser: string, minutes: number,
 *   series: { id: string, title: string, episode: number } | null, readAt: string,
 * }} ReadStory
 * A story the family read: `id` is the story's own, `series` the series it is
 * an episode of while they follow it, and `readAt` the last time it was
 * opened, as an ISO date.
 */
/**
 * @typedef {{ activities: PlayedActivity[], stories: ReadStory[] }} History
 * The last month, each list with the latest first.
 */
/**
 * @typedef {{ kind: 'activity', at: Date, activity: PlayedActivity }
 *   | { kind: 'story', at: Date, story: ReadStory }} Entry
 * One juego or story in the list, at the last time it was played or read.
 */
/** @typedef {{ key: string, label: string, entries: Entry[] }} Day the entries of one day, latest first */

export {}
