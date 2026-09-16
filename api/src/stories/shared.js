/**
 * What both story sources need: the columns a saved story is read with, and
 * the replay that turns one into the same events the model's own story
 * arrives as, so the web never tells a template story from a written one.
 */
import { stories } from './stories.schema.js'

/** How many stories a family is offered at a time, whatever writes them. */
export const OPTIONS = 3

/** @typedef {import('./stories.service.js').Story} Story */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */

/** The columns a story is read with, everywhere it is read. */
export const storyColumns = {
  id: stories.id,
  templateId: stories.templateId,
  plotId: stories.plotId,
  title: stories.title,
  teaser: stories.teaser,
  minutes: stories.minutes,
  parts: stories.parts,
  keyword: stories.keyword,
}

/**
 * A saved story, shaped for the reading screen.
 * @param {typeof stories.$inferSelect} row
 * @param {import('./stories.service.js').Story['series']} [series] the series
 *   this story is an episode of (JUG-59); a story that stands on its own has none
 */
export const toStory = (row, series = null) => ({ ...row, parts: /** @type {string[][]} */ (row.parts), series })

/**
 * Yields to the event loop between paragraphs, and throws when the reader has
 * gone, which is how a loop that is reading a story out stops.
 * @param {AbortSignal} [signal]
 */
export const tick = async (signal) => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (signal?.aborted) {
    const error = new Error('The reader left before the story ended')
    error.name = 'AbortError'
    throw error
  }
}

/**
 * The paragraphs of a saved story, as reading events.
 * @param {Story} story
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {AsyncGenerator<StoryEvent, void, void>}
 */
export async function* replayEvents(story, { signal } = {}) {
  for (let part = 0; part < story.parts.length; part += 1) {
    for (const paragraph of story.parts[part]) {
      yield { type: 'paragraph', part: part + 1, text: paragraph }
      await tick(signal)
    }
  }
  yield { type: 'story', story }
}
