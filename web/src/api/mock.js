/**
 * Mock of the Juguemos API. Each function is async and shaped like the endpoint
 * it stands in for, with a realistic delay, so the screens already handle
 * waiting, failure, and being offline. Successful results are written to the
 * local store, the way the real client will cache them for offline use.
 */
import { read, write } from '../lib/store'
import { ACTIVITIES, EXAMPLE_FAMILY, STORIES } from './fixtures'

/** @typedef {import('./fixtures').Family} Family */
/** @typedef {import('./fixtures').ParseResult} ParseResult */
/** @typedef {import('./fixtures').Activity} Activity */
/** @typedef {import('./fixtures').StoryOption} StoryOption */
/** @typedef {import('./fixtures').Story} Story */
/**
 * @typedef {{ name: string, email: string, provider: 'email' | 'google', emailVerified: boolean }} Account
 */

export class OfflineError extends Error {}
/** What the real verification will throw for a code that doesn't match. */
export class WrongCodeError extends Error {}

const PARAGRAPH_MS = 450

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => structuredClone(value)

async function respond(ms) {
  if (!navigator.onLine) throw new OfflineError('Sin conexión')
  await wait(ms)
}

/* Account: signing up, in, and out is real, in ./auth */

/** @param {string} code */
export async function verifyEmail(code) {
  await respond(700)
  void code
  write('account', { ...read('account'), emailVerified: true })
}

export async function resendCode() {
  await respond(500)
}

/* Family */

/** @param {string} text @returns {Promise<ParseResult>} */
export async function understandFamily(text) {
  await respond(1600)
  void text
  /** @type {ParseResult} */
  const result = { family: clone(EXAMPLE_FAMILY), flagged: [], note: null }
  write('parseResult', result)
  return result
}

/** @param {Family} family */
export async function saveFamily(family) {
  await respond(500)
  write('family', family)
  write('parseResult', null)
  write('familyDraft', null)
  return family
}

/* Activities */

/** @param {{ after?: string | null }} [options] the idea to move on from */
export async function suggestActivity({ after = null } = {}) {
  await respond(1400)
  const index = ACTIVITIES.findIndex((activity) => activity.id === after)
  const activity = clone(ACTIVITIES[(index + 1) % ACTIVITIES.length])
  write('activities', { ...read('activities'), [activity.id]: activity })
  write('lastActivityId', activity.id)
  return activity
}

/* Stories */

/** Three options, skipping the ones on screen. @param {{ exclude?: string[] }} [options] */
export async function storyOptions({ exclude = [] } = {}) {
  await respond(900)
  const fresh = STORIES.filter((story) => !exclude.includes(story.id))
  const pool = fresh.length >= 3 ? fresh : STORIES
  /** @type {StoryOption[]} */
  const options = pool.slice(0, 3).map(({ id, title, teaser, minutes }) => ({ id, title, teaser, minutes }))
  write('storyOptions', options)
  return options
}

/**
 * Writes a story paragraph by paragraph. A story already written comes back
 * from the cache at once, which is also how it stays readable offline.
 * @param {string} id
 * @param {{ onParagraph?: (paragraph: { part: number, text: string }) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<Story>}
 */
export async function writeStory(id, { onParagraph, signal } = {}) {
  const cached = read('stories')?.[id]
  if (cached) return cached

  await respond(1200)
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
  const story = STORIES.find((candidate) => candidate.id === id)
  if (!story) throw new Error('Cuento desconocido')

  for (const [part, paragraphs] of story.parts.entries()) {
    for (const text of paragraphs) {
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
      onParagraph?.({ part, text })
      await wait(PARAGRAPH_MS)
    }
  }

  const written = clone(story)
  write('stories', { ...read('stories'), [id]: written })
  return written
}
