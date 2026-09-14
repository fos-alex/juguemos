/**
 * The storytelling logic around the harness: which age band anchors a story,
 * the moment-of-day mood, and the two ways the model's answer is read — the
 * options JSON and the streaming story format. Everything here is pure, so
 * the harness in `api/prompts/` can change without any of this moving.
 */

/** @typedef {import('../families/families.service.js').Profile} Profile */

/** How many minutes of reading each band asks for, and roughly how long its stories run. @typedef {{ band: string, range: string, minutes: [number, number] }} Band */

const BANDS = [
  { maxAge: 1, band: 'UN AÑO', range: '2', minutes: [2, 2] },
  { maxAge: 2, band: 'DOS AÑOS', range: '3 a 4', minutes: [3, 4] },
  { maxAge: 3, band: 'TRES AÑOS', range: '4 a 5', minutes: [4, 5] },
  { maxAge: 99, band: 'CUATRO O CINCO', range: '5 a 6', minutes: [5, 6] },
]

/**
 * The youngest kid with a known age anchors the story: it is written for the
 * smallest listener. Ages nobody gave sit at the middle of the range.
 * @param {Profile} profile
 * @returns {{ anchorAge: number, band: Band }}
 */
export function anchorOf(profile) {
  const ages = profile.kids.map((kid) => kid.age).filter((/** @type {number | null} */ age) => age != null)
  const anchorAge = ages.length > 0 ? Math.min(...ages) : 3
  const band = BANDS.find((entry) => anchorAge <= entry.maxAge) ?? BANDS[BANDS.length - 1]
  return { anchorAge, band }
}

/**
 * The story follows the moment: calm in the night-mode window (19:00 to
 * 07:00), lively the rest of the day. The child's own routine arrives with
 * the fuller data model and replaces the clock.
 * @param {Date} now
 * @returns {'calm' | 'lively'}
 */
export function moodAt(now) {
  const hour = now.getHours()
  return hour >= 19 || hour < 7 ? 'calm' : 'lively'
}

/** The moment as the harness names it. @param {'calm' | 'lively'} mood */
export function momentOf(mood) {
  return mood === 'calm' ? 'TRANQUI, antes de dormir' : 'CON PILAS, de día'
}

/** The age as it reads aloud: `1 año`, `2 años`. @param {number} age */
export function ageLine(age) {
  return age === 1 ? '1 año' : `${age} años`
}

/**
 * The family as the harness needs it: names exactly as the family gave
 * them, and an honest «no sabemos…» where the profile is empty.
 * @param {Profile} profile
 */
export function familyLines(profile) {
  const kids = profile.kids.map((kid) => `${kid.name}${kid.age != null ? `, de ${ageLine(kid.age)}` : ''}`)
  return {
    kids: kids.join(' y ') || 'no sabemos los nombres de los chicos',
    pet: profile.pets.map((pet) => pet.name).join(' y ') || 'no tienen mascota',
    toys: profile.toys.map((toy) => toy.name).join(', ') || 'no sabemos sus juguetes',
    interests: profile.interests.join(', ') || 'no sabemos qué le gusta',
  }
}

/** A plot option the model proposed. @typedef {{ title: string, teaser: string, minutes: number, premise: string }} Plot */

/**
 * The options answer: JSON, with or without markdown fences, holding an
 * array or a `{ "tramas": [...] }` object. Minutes outside 2 to 6 sit back
 * inside; anything unreadable throws.
 * @param {string} text
 * @returns {Plot[]}
 */
export function parseOptions(text) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.search(/[[{]/)
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
  const parsed = start >= 0 && end > start ? readJson(cleaned.slice(start, end + 1)) : null
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.tramas)
      ? parsed.tramas
      : null
  if (!list || list.length === 0) throw new Error('The story model proposed no options')
  return list.map((option) => ({
    title: String(option?.title ?? '').trim(),
    teaser: String(option?.teaser ?? '').trim(),
    minutes: clampMinutes(option?.minutes),
    premise: String(option?.premise ?? '').trim(),
  }))
}

/** @param {unknown} minutes */
function clampMinutes(minutes) {
  const value = Math.round(Number(minutes))
  if (!Number.isFinite(value)) return 3
  return Math.min(6, Math.max(2, value))
}

/**
 * Reads the story format the harness asks for — `PARTE n` lines, one
 * paragraph per line, parts separated by those headers — as it streams.
 * A paragraph is done when its line ends, a part when the next header lands,
 * and anything before the first header (fences, titles, apologies) is not
 * the story, so it never reaches the family.
 */
export class StoryParser {
  constructor() {
    this.buffer = ''
    this.part = 0
    this.paragraph = ''
  }

  /** Feed one piece of the model's answer; the paragraphs that finished with it come back. @param {string} delta */
  push(delta) {
    this.buffer += delta
    /** @type {{ part: number, text: string }[]} */
    const done = []
    let index
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).trim()
      this.buffer = this.buffer.slice(index + 1)
      const header = /^partes?\s+(\d+)\s*:?\s*$/i.exec(line)
      if (header) {
        this.flush(done)
        this.part = Number(header[1])
        continue
      }
      if (line === '') {
        this.flush(done)
        continue
      }
      if (this.part === 0) continue
      this.paragraph = this.paragraph ? `${this.paragraph} ${line}` : line
    }
    return done
  }

  /** The answer ended; whatever was left closes the story. */
  end() {
    const done = /** @type {{ part: number, text: string }[]} */ ([])
    const tail = this.buffer.trim()
    if (tail) {
      const header = /^partes?\s+(\d+)\s*:?\s*$/i.exec(tail)
      if (header) {
        this.flush(done)
        this.part = Number(header[1])
      } else if (this.part > 0) {
        this.paragraph = this.paragraph ? `${this.paragraph} ${tail}` : tail
      }
    }
    this.flush(done)
    return done
  }

  /** @param {{ part: number, text: string }[]} done */
  flush(done) {
    if (this.paragraph && this.part > 0) done.push({ part: this.part, text: this.paragraph })
    this.paragraph = ''
  }
}

/**
 * The paragraphs a story is made of, or null when the model wrote nothing
 * readable: parts renumbered from one (a story reads "1 de 3" whatever the
 * model counted), empty parts dropped, order kept.
 * @param {{ part: number, text: string }[]} paragraphs
 * @returns {string[][] | null}
 */
export function partsOf(paragraphs) {
  const parts = []
  for (const { part, text } of paragraphs) {
    const index = Math.min(Math.max(part, 1), 4) - 1
    parts[index] ??= []
    parts[index].push(text)
  }
  const filled = parts.filter((part) => Array.isArray(part) && part.length > 0)
  return filled.length > 0 ? filled : null
}

/** @param {string} data */
function readJson(data) {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
