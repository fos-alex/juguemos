/**
 * A story the parent asks for in their own words (JUG-156). A voice note's
 * words are read into a request — who is in it, where it happens, its theme,
 * what happens, and one line that sums it up — which the parent sees before
 * the story is written. Nothing is saved here.
 *
 * The request comes back from the web to be written, so it is held to the
 * same rules both times: a family member is one only when the name is one of
 * the family's, spelled as the family spells it, and anyone else is a
 * character the model writes.
 *
 * The parent's words never go into a log or an error message, and the
 * model's answer can repeat them, so errors leave both out.
 */
import { UnavailableError, UpstreamError } from '../errors.js'
import { jsonIn, render } from '../llm/prompt.js'
import requestPrompt, { readRequest } from './prompts/request.js'

/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../llm/client.js').Llm} Llm */
/**
 * @typedef {object} StoryRequest the story a parent asked for
 * @property {string} summary one line saying what story it is; empty when the words asked for none
 * @property {string[]} family the kids, pets, and toys it names, as the family spells them, in the order named
 * @property {string[]} characters everyone else it asks for, in a few words each
 * @property {string | null} setting where it happens
 * @property {string | null} theme what it is about
 * @property {string | null} plot what happens, in a sentence or two
 */
/** @typedef {ReturnType<typeof createStoryRequests>} StoryRequests */

/** How long the model gets before the parent is asked to try again. */
const TIMEOUT_MS = 60_000

/** The limits POST /stories/write accepts, so a request read here always writes. */
export const REQUEST_LIMITS = { summary: 200, names: 12, name: 120, characters: 8, character: 120, line: 160, plot: 500 }

/**
 * @param {{ llm: Llm | null, families: FamiliesService }} deps
 */
export function createStoryRequests({ llm, families }) {
  return {
    /**
     * What story these words ask for. The whole family is listed for the
     * model, not only the kids playing, since a parent may ask for a story
     * about a kid who is sitting out.
     * @param {string} familyId
     * @param {string} text the parent's own words
     * @returns {Promise<StoryRequest>}
     */
    async understand(familyId, text) {
      if (!llm) throw new UnavailableError('No LLM is configured to read a story request', 'LLM_OFF')
      const profile = await families.profileOf(familyId)
      const user = render(readRequest, {
        kids: namesOf(profile.kids),
        pets: namesOf(profile.pets),
        toys: namesOf(profile.toys),
      })
      let answer = ''
      const signal = AbortSignal.timeout(TIMEOUT_MS)
      // The parent's words go as `data`, never as instructions (JUG-90).
      for await (const piece of llm.stream({ system: requestPrompt, user, data: text, reasoning: false, signal })) answer += piece
      const parsed = jsonIn(answer)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new UpstreamError('The model answered with no readable story request')
      }
      return requestFor(parsed, profile)
    },
  }
}

/** @param {{ name: string }[]} items */
const namesOf = (items) => items.map((item) => item.name).join(', ') || 'ninguno'

/**
 * A request held to the rules, from the model's answer or from the web: every
 * text trimmed and cut to its limit, family names spelled as the family spells
 * them, and a name that isn't the family's moved to the characters. A request
 * that says something but has no summary gets one from what it says.
 * @param {any} value
 * @param {Pick<Profile, 'kids' | 'pets' | 'toys'>} profile
 * @returns {StoryRequest}
 */
export function requestFor(value, profile) {
  const known = [...profile.kids, ...profile.pets, ...profile.toys].map((item) => item.name)

  /** @type {string[]} */
  const family = []
  /** @type {string[]} */
  const characters = []
  for (const name of listOf(value?.family)) {
    const found = familyName(name, known)
    if (found) family.push(found)
    else characters.push(name)
  }
  for (const character of listOf(value?.characters)) {
    const found = familyName(character, known)
    if (found) family.push(found)
    else characters.push(character)
  }

  const request = {
    summary: '',
    family: unique(family).slice(0, REQUEST_LIMITS.names),
    characters: unique(characters.map((character) => character.slice(0, REQUEST_LIMITS.character))).slice(
      0,
      REQUEST_LIMITS.characters,
    ),
    setting: lineOf(value?.setting, REQUEST_LIMITS.line),
    theme: lineOf(value?.theme, REQUEST_LIMITS.line),
    plot: lineOf(value?.plot, REQUEST_LIMITS.plot),
  }
  if (isEmpty(request)) return request
  request.summary = lineOf(value?.summary, REQUEST_LIMITS.summary) ?? summaryOf(request)
  return request
}

/** Whether a request asks for nothing at all. @param {StoryRequest} request */
export function isEmpty(request) {
  return (
    request.family.length === 0 && request.characters.length === 0 && !request.setting && !request.theme && !request.plot
  )
}

/**
 * The request as the story call gets it, inside the data block: one line for
 * each thing it says, and nothing for what it doesn't.
 * @param {StoryRequest} request
 * @returns {string}
 */
export function requestLines(request) {
  const lines = [`Lo que pidieron: ${request.summary}`]
  if (request.family.length > 0) lines.push(`De la familia: ${request.family.join('; ')}`)
  if (request.characters.length > 0) lines.push(`Otros personajes: ${request.characters.join('; ')}`)
  if (request.setting) lines.push(`Dónde pasa: ${request.setting}`)
  if (request.theme) lines.push(`Tema: ${request.theme}`)
  if (request.plot) lines.push(`Qué pasa: ${request.plot}`)
  return lines.join('\n')
}

/**
 * A summary for a request the model gave none, from who is in it or what it
 * is about. Voice pass pending.
 * @param {StoryRequest} request
 */
function summaryOf(request) {
  const who = [...request.family, ...request.characters]
  if (who.length > 0) return `Un cuento con ${who.join(', ')}.`.slice(0, REQUEST_LIMITS.summary)
  const about = request.theme ?? request.setting ?? request.plot
  return `Un cuento sobre ${about}.`.slice(0, REQUEST_LIMITS.summary)
}

/**
 * The family's own spelling of a name, when the name is one of theirs: the
 * same letters, whatever the case and the accents, with or without the
 * article ("Milan" is "Milán", "tren grandote" is "el tren grandote"). Null
 * when it isn't.
 * @param {string} name
 * @param {string[]} known
 */
function familyName(name, known) {
  const wanted = bare(name)
  if (!wanted) return null
  return known.find((each) => bare(each) === wanted) ?? null
}

/** A name to compare: lowercase, without accents, articles, or extra spaces. @param {string} name */
const bare = (name) =>
  name
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(el|la|los|las)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Texts from a list, trimmed, dropping what isn't one. @param {unknown} value @returns {string[]} */
const listOf = (value) =>
  (Array.isArray(value) ? value : []).map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)

/** A line of text cut to its limit, or null. @param {unknown} value @param {number} max */
const lineOf = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null)

/** Each text once, compared without case, the first spelling kept. @param {string[]} texts */
const unique = (texts) => {
  const seen = new Set()
  return texts.filter((text) => {
    const key = text.toLocaleLowerCase('es')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
