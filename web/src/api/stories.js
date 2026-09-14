/**
 * Stories, against the real API. A story opened once is kept in the local
 * store under its option's id, which is how it stays readable offline.
 */
import { read, write } from '../lib/store'
import { request } from './http'

/** @typedef {import('./types').StoryOption} StoryOption */
/** @typedef {import('./types').Story} Story */

/** Three options, leaving out the ones on screen. @param {{ exclude?: string[] }} [options] @returns {Promise<StoryOption[]>} */
export async function storyOptions({ exclude = [] } = {}) {
  const query = new URLSearchParams(exclude.map((id) => ['exclude', id]))
  const options = await request('GET', `/stories/options${exclude.length > 0 ? `?${query}` : ''}`)
  write('storyOptions', options)
  return options
}

/**
 * The story behind an option. Stories from templates arrive whole; streaming
 * paragraph by paragraph comes with LLM stories (JUG-71).
 * @param {string} id the option's id
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Story>}
 */
export async function writeStory(id, { signal } = {}) {
  const cached = read('stories')?.[id]
  if (cached) return cached

  const { title, teaser, minutes, parts } = await request('POST', '/stories', { templateId: id })
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
  /** @type {Story} */
  const story = { id, title, teaser, minutes, parts }
  write('stories', { ...read('stories'), [id]: story })
  return story
}
