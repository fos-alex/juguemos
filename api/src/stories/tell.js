/**
 * The one streaming story call, which every story the model writes goes
 * through: the story of a plot the family chose, the story of an interest they
 * tapped (JUG-140), the story they asked for in a voice note (JUG-156), and an
 * episode of a series (JUG-59). The paragraphs come
 * out as the parser finishes them, and the title before them when the prompt
 * asked for one, so the reader has something on screen while the model is
 * still writing.
 *
 * Whatever the answer carries outside the story text — the title, and the
 * bookkeeping a series episode ends with — is left in `kept` instead of being
 * yielded, since the events go straight to the reader and none of that is read
 * aloud.
 */
import { tick } from './shared.js'
import { StoryParser, wordsIn } from './storytelling.js'

/** @typedef {import('./storytelling.js').Band} Band */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {import('../llm/client.js').Llm} Llm */

/**
 * @typedef {object} Kept what a story leaves behind as it streams, for the save and the audit
 * @property {string} title the title the model wrote, when it was asked for one
 * @property {{ part: number, text: string }[]} paragraphs
 * @property {Record<string, string>} fields the lines outside the story text, by name
 * @property {number} msFirstToken
 * @property {number} msTotal
 */

/** How many tokens a word of story is worth, generously, so no story is cut off mid-sentence. */
const TOKENS_PER_WORD = 3

/** The most an answer of this band's length may run to. @param {Band} band */
export const tokensFor = (band) => band.words[1] * TOKENS_PER_WORD

/** A story that hasn't been told yet. @returns {Kept} */
export const nothingKept = () => ({ title: '', paragraphs: [], fields: {}, msFirstToken: 0, msTotal: 0 })

/**
 * One story call, streamed.
 * @param {{
 *   llm: Llm,
 *   system: string,
 *   user: string,
 *   data?: string,
 *   maxTokens: number,
 *   signal?: AbortSignal,
 *   fallbackTitle?: string,
 * }} call `data` is the family's own words, which go to the model as data
 *   (JUG-90). A `fallbackTitle` means this prompt asked the model for a
 *   `TÍTULO:` line: it is the title used when the model wrote none, so the
 *   story always has one and it is always the first event.
 * @param {Kept} kept
 * @returns {AsyncGenerator<StoryEvent, void, void>}
 */
export async function* tellStory({ llm, system, user, data, maxTokens, signal, fallbackTitle = '' }, kept) {
  const parser = new StoryParser()
  const started = Date.now()
  /** @type {number | null} */
  let first = null

  /** The paragraphs one push finished, each as an event. @param {{ part: number, text: string }[]} done */
  async function* told(done) {
    for (const paragraph of done) {
      if (fallbackTitle && !kept.title) {
        kept.title = fallbackTitle
        yield /** @type {StoryEvent} */ ({ type: 'title', title: kept.title })
      }
      kept.paragraphs.push(paragraph)
      yield /** @type {StoryEvent} */ ({ type: 'paragraph', ...paragraph })
      await tick(signal)
    }
  }

  for await (const chunk of llm.stream({ system, user, data, maxTokens, reasoning: false, signal })) {
    first ??= Date.now() - started
    const done = parser.push(chunk)
    const title = parser.takeTitle()
    if (fallbackTitle && title && !kept.title) {
      kept.title = title
      yield { type: 'title', title }
    }
    yield* told(done)
  }
  yield* told(parser.end())
  kept.fields = parser.takeFields()
  kept.msTotal = Date.now() - started
  kept.msFirstToken = first ?? kept.msTotal
}

/**
 * What the audit keeps about a story once it is written: the model, how long
 * it took to answer, and how its length compares with the band's budget.
 * @param {{ model: string, band: Band, parts: string[][], kept: Kept }} story
 */
export function writtenDetails({ model, band, parts, kept }) {
  const words = wordsIn(parts)
  return {
    model,
    msFirstToken: kept.msFirstToken,
    msTotal: kept.msTotal,
    words,
    parts: parts.length,
    paragraphs: kept.paragraphs.length,
    wordsMin: band.words[0],
    wordsMax: band.words[1],
    insideBand: words >= band.words[0] && words <= band.words[1],
  }
}
