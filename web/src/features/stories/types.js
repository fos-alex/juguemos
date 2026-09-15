/**
 * The shapes the story screens work with, as the API sends them.
 */

/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption */
/**
 * @typedef {StoryOption & { parts: string[][], keyword?: string | null }} Story
 * `keyword` is the interest the parent tapped to get it (JUG-140); null on
 * every other story.
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number, createdAt: string }} SavedStorySummary */

export {}
