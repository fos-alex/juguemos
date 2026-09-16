/**
 * The shapes the story screens work with, as the API sends them.
 */

/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption */
/**
 * @typedef {StoryOption & { parts: string[][], keyword?: string | null, series?: StoryInSeries | null }} Story
 * `keyword` is the interest the parent tapped to get it (JUG-140); null on
 * every other story. `series` is the series it is an episode of (JUG-59).
 */
/** @typedef {{ id: string, title: string, episode: number }} StoryInSeries where a story sits in its series */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number, createdAt: string }} SavedStorySummary */
/**
 * @typedef {object} StoryRequest the story a parent asked for in a voice note (JUG-156)
 * @property {string} summary one line saying what story it is
 * @property {string[]} family the kids, pets, and toys it names, as the family spells them
 * @property {string[]} characters everyone else it asks for
 * @property {string | null} setting where it happens
 * @property {string | null} theme what it is about
 * @property {string | null} plot what happens
 */
/** @typedef {{ id: string, title: string, minutes: number, episode: number, createdAt: string }} Episode */
/**
 * @typedef {object} Series stories that share a world, in the order they were written (JUG-59)
 * @property {string} id
 * @property {string} title
 * @property {string} storyline what the series is about
 * @property {Episode[]} episodes
 * @property {number} maxEpisodes how many episodes it holds in all
 * @property {string} createdAt
 */

export {}
