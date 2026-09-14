/**
 * Stories, against the real API. A story opened once is kept in the local
 * store under its option's id, which is how it stays readable offline.
 * LLM stories arrive paragraph by paragraph as server-sent events, so the
 * reading screen fills while the model still talks; an already-written story
 * streams the same way, from the saved copy.
 */
import { demoSettings, updateDemo } from '../lib/demo'
import { read, write } from '../lib/store'
import { ApiError, OfflineError } from './http'

/** @typedef {import('./types').StoryOption} StoryOption */
/** @typedef {import('./types').Story} Story */
/** @typedef {import('./types').SavedStorySummary} SavedStorySummary */

const SLOW_MS = 7500

/** Three options, leaving out the ones on screen. @param {{ exclude?: string[] }} [options] @returns {Promise<StoryOption[]>} */
export async function storyOptions({ exclude = [] } = {}) {
  const query = new URLSearchParams(exclude.map((id) => ['exclude', id]))
  const options = await request('GET', `/stories/options${exclude.length > 0 ? `?${query}` : ''}`)
  write('storyOptions', options)
  return options
}

/**
 * The story behind an option, coming out of the API paragraph by paragraph.
 * `onParagraph` is called as each one lands, so the reading screen fills
 * while the model still talks; the whole saved story comes back once and is
 * cached for offline. The demo's offline, slow, and fail-next switches apply
 * like they do to every API call.
 * @param {string} id the option's id
 * @param {{ signal?: AbortSignal, onParagraph?: (paragraph: { part: number, text: string }) => void }} [options]
 * @returns {Promise<Story>}
 */
export async function writeStory(id, { signal, onParagraph } = {}) {
  const cached = read('stories')?.[id]
  if (cached) return cached

  const demo = demoSettings()
  if (!navigator.onLine || demo.offline) throw new OfflineError('Sin conexión')
  if (demo.slow) await new Promise((resolve) => setTimeout(resolve, SLOW_MS))
  if (demo.failNext) {
    updateDemo({ failNext: false })
    throw new ApiError('Falla simulada', 0)
  }

  let response
  try {
    response = await fetch('/api/stories/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal,
    })
  } catch {
    throw new OfflineError('Sin conexión')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message ?? data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  if (!response.body) throw new ApiError('Sin historia que contar', 0)

  return await readEvents(id, response.body, onParagraph)
}

/**
 * The event stream of a story: paragraphs as they come, then the whole.
 * @param {string} key where to cache it
 * @param {ReadableStream<Uint8Array>} body
 * @param {{ part: number, text: string } | ((paragraph: { part: number, text: string }) => void)} _onParagraph
 */
async function readEvents(key, body, _onParagraph) {
  const onParagraph = typeof _onParagraph === 'function' ? _onParagraph : () => {}
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let index
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)
      const line = block.split('\n').find((streamLine) => streamLine.startsWith('data: '))
      if (!line) continue
      const event = /** @type {{ type: string, part?: number, text?: string, story?: Story }} */ (JSON.parse(line.slice(6)))
      if (event.type === 'error') throw new ApiError('La historia no terminó', 0)
      if (event.type === 'paragraph') onParagraph({ part: event.part ?? 1, text: event.text ?? '' })
      if (event.type === 'story') {
        const story = /** @type {Story} */ (event.story)
        write('stories', { ...read('stories'), [key]: story })
        return story
      }
    }
  }
  throw new ApiError('La historia no terminó', 0)
}

/**
 * The library of stories the family saved, newest first.
 * @returns {Promise<SavedStorySummary[]>}
 */
export async function savedStories() {
  const list = await request('GET', '/stories')
  return /** @type {SavedStorySummary[]} */ (list)
}

/**
 * One saved story, opened by its own id, kept for offline like any story.
 * @param {string} id the story's id
 * @returns {Promise<Story>}
 */
export async function savedStory(id) {
  const cached = read('stories')?.[id]
  if (cached) return cached
  const { title, teaser, minutes, parts } = await request('GET', `/stories/${id}`)
  const story = { id, title, teaser, minutes, parts }
  write('stories', { ...read('stories'), [id]: story })
  return story
}