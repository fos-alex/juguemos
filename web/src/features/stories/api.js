/**
 * Stories, against the real API. A story opened once is kept in the local
 * store under its option's id, which is how it stays readable offline.
 * Both the options and the stories arrive as server-sent events, so a card
 * shows up as soon as the model has written it and the reading screen fills
 * while the model still talks; an already-written story streams the same
 * way, from the saved copy. A story written from one of the family's
 * interests (JUG-140) has no option behind it, so it is kept under the id it
 * was saved with and announces its title first.
 */
import { read, write } from '../../shared/store'
import { ApiError, endSession, OfflineError, request } from '../../shared/http'

/** @typedef {import('./types').StoryOption} StoryOption */
/** @typedef {import('./types').Story} Story */
/** @typedef {import('./types').SavedStorySummary} SavedStorySummary */

/**
 * The options already on their way, so Home asking for them early and the
 * story screen asking on its own don't both reach the API (JUG-140).
 * @type {{ exclude: string, options: Promise<StoryOption[]>, signal?: AbortSignal } | null}
 */
let asking = null

/**
 * Three options, leaving out the ones on screen, each written into the store
 * as it lands, so the screen shows the first card while the model is still
 * writing the third. The list starts empty, so whatever was on screen before
 * is gone as soon as the parent asks for others. A second call for the same
 * options while the first is still out waits for that one instead of asking
 * again, so Home and the story screen never ask twice (JUG-140).
 * @param {{ exclude?: string[], signal?: AbortSignal }} [options]
 * @returns {Promise<StoryOption[]>}
 */
export function storyOptions({ exclude = [], signal } = {}) {
  const key = exclude.join(',')
  // A request its caller already stopped is no use to the next one.
  if (asking?.exclude === key && !asking.signal?.aborted) return asking.options
  const options = askForOptions(exclude, signal)
  asking = { exclude: key, options, signal }
  void options
    .catch(() => {})
    .then(() => {
      if (asking?.options === options) asking = null
    })
  return options
}

/** @param {string[]} exclude @param {AbortSignal} [signal] @returns {Promise<StoryOption[]>} */
async function askForOptions(exclude, signal) {
  const query = new URLSearchParams(exclude.map((id) => ['exclude', id]))
  write('storyOptions', [])
  const body = await openStream(`/api/stories/options${exclude.length > 0 ? `?${query}` : ''}`, { method: 'GET', signal })

  /** @type {StoryOption[]} */
  const options = []
  let done = false
  await readEvents(body, (event) => {
    if (event.type === 'error') throw new ApiError('No pudimos traer los cuentos', 0)
    if (event.type === 'option') {
      options.push(/** @type {StoryOption} */ (event.option))
      write('storyOptions', [...options])
    }
    if (event.type === 'done') {
      done = true
      return true
    }
    return false
  })
  if (!done) throw new ApiError('No pudimos traer los cuentos', 0)
  return options
}

/**
 * The story behind an option, coming out of the API paragraph by paragraph.
 * `onParagraph` is called as each one lands, so the reading screen fills
 * while the model still talks; the whole saved story comes back once and is
 * cached for offline.
 * @param {string} id the option's id
 * @param {{ signal?: AbortSignal, onParagraph?: (paragraph: { part: number, text: string }) => void }} [options]
 * @returns {Promise<Story>}
 */
export async function writeStory(id, { signal, onParagraph } = {}) {
  const cached = read('stories')?.[id]
  if (cached) return cached
  return await readStory({ id }, { key: id, signal, onParagraph })
}

/**
 * A story about one of the family's interests, written now because the parent
 * tapped it (JUG-140). It has no option behind it, so its title arrives as its
 * own event before the first paragraph, and it is kept under the id the API
 * saved it with, which is where the reading screen sends the URL.
 * @param {string} keyword the interest, exactly as the family typed it
 * @param {{
 *   signal?: AbortSignal,
 *   onTitle?: (title: string) => void,
 *   onParagraph?: (paragraph: { part: number, text: string }) => void,
 * }} [options]
 * @returns {Promise<Story>}
 */
export async function writeKeywordStory(keyword, { signal, onTitle, onParagraph } = {}) {
  return await readStory({ keyword }, { signal, onTitle, onParagraph })
}

/**
 * The story the API writes for what it is asked, paragraph by paragraph, kept
 * for offline once it is whole.
 * @param {{ id: string } | { keyword: string }} asked
 * @param {{
 *   key?: string,
 *   signal?: AbortSignal,
 *   onTitle?: (title: string) => void,
 *   onParagraph?: (paragraph: { part: number, text: string }) => void,
 * }} handlers `key` is where to keep the story; without one it is kept under
 *   the id the API saved it with.
 * @returns {Promise<Story>}
 */
async function readStory(asked, { key, signal, onTitle, onParagraph }) {
  const body = await openStream('/api/stories/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asked),
    signal,
  })

  /** @type {Story | null} */
  let story = null
  await readEvents(body, (event) => {
    if (event.type === 'error') throw new ApiError('La historia no terminó', 0)
    if (event.type === 'title') onTitle?.(event.title ?? '')
    if (event.type === 'paragraph') onParagraph?.({ part: event.part ?? 1, text: event.text ?? '' })
    if (event.type === 'story') {
      story = /** @type {Story} */ (event.story)
      return true
    }
    return false
  })
  if (!story) throw new ApiError('La historia no terminó', 0)
  write('stories', { ...read('stories'), [key ?? /** @type {Story} */ (story).id]: story })
  return story
}

/**
 * Opens one of the API's event streams. It reads `fetch` directly because
 * `request` only speaks JSON; like it, no network means `OfflineError` and a
 * refusal means `ApiError`, so the screens and `failureText()` are unchanged.
 * Whatever the API refuses with arrives before the stream starts, so it is a
 * regular JSON body.
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<ReadableStream<Uint8Array>>}
 */
async function openStream(url, init) {
  if (!navigator.onLine) throw new OfflineError('Sin conexión')

  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    // A screen that left cancelled the stream on purpose; that is not a failure.
    if (/** @type {Error} */ (error)?.name === 'AbortError') throw error
    throw new OfflineError('Sin conexión')
  }
  if (!response.ok) {
    if (response.status === 401) endSession()
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message ?? data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  if (!response.body) throw new ApiError('Sin respuesta', 0)
  return response.body
}

/**
 * Reads a server-sent event stream, handing each event to `onEvent` as it
 * lands and stopping when it says it has what it came for.
 * @param {ReadableStream<Uint8Array>} body
 * @param {(event: any) => boolean} onEvent true when the stream is done
 */
async function readEvents(body, onEvent) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    let index
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)
      const line = block.split('\n').find((streamLine) => streamLine.startsWith('data: '))
      if (!line) continue
      if (onEvent(JSON.parse(line.slice(6)))) {
        await reader.cancel().catch(() => {})
        return
      }
    }
  }
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
  const { title, teaser, minutes, parts, keyword } = await request('GET', `/stories/${id}`)
  const story = { id, title, teaser, minutes, parts, keyword }
  write('stories', { ...read('stories'), [id]: story })
  return story
}

/** Forgets the options on this device, so the story screen asks for new ones. */
export function forgetOptions() {
  write('storyOptions', null)
}

/**
 * Saves how far into a story the parent has scrolled, from 0 to 1, so a
 * reopened story resumes there.
 * @param {string} id
 * @param {number} progress
 */
export function savePosition(id, progress) {
  write('storyPositions', { ...read('storyPositions'), [id]: progress })
}
