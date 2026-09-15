/**
 * The storytelling logic around the harness: which age band anchors a story,
 * the moment-of-day mood, the family lines a casting leaves in the prompt,
 * and the two ways the model's answer is read — the option JSON and the
 * streaming story format. Everything here is pure, so the prompts in
 * `prompts/` can change without any of this moving.
 */
import { jsonIn } from '../llm/prompt.js'

/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('./casting.js').Casting} Casting */

/**
 * An age band: its id (the key of its prompt fragment in `prompts/bands.js`),
 * the oldest age it covers, how many minutes its stories run, and the word
 * budget the fragment asks for, which the audit checks the story against.
 * @typedef {{ id: string, maxAge: number, minutes: [number, number], words: [number, number] }} Band
 */

/** @type {Band[]} */
const BANDS = [
  { id: '1', maxAge: 1, minutes: [2, 2], words: [150, 220] },
  { id: '2', maxAge: 2, minutes: [3, 4], words: [300, 450] },
  { id: '3', maxAge: 3, minutes: [4, 5], words: [450, 600] },
  { id: '4', maxAge: 4, minutes: [5, 6], words: [600, 750] },
  { id: '5', maxAge: 99, minutes: [6, 7], words: [750, 900] },
]

/**
 * The youngest kid with a known age anchors the story: it is written for the
 * smallest listener, and that kid is the one the casting draws around. Kids
 * whose age nobody gave don't count, and a family with no ages at all gets
 * band 3.
 * @param {Profile} profile
 * @returns {{ anchor: Profile['kids'][number] | null, anchorAge: number, band: Band }}
 */
export function anchorOf(profile) {
  const known = profile.kids.filter((kid) => kid.age != null)
  const anchor = known.reduce(
    (/** @type {Profile['kids'][number] | null} */ youngest, kid) =>
      youngest == null || /** @type {number} */ (kid.age) < /** @type {number} */ (youngest.age) ? kid : youngest,
    null,
  )
  const anchorAge = anchor?.age ?? 3
  const band = BANDS.find((entry) => anchorAge <= entry.maxAge) ?? BANDS[BANDS.length - 1]
  return { anchor: anchor ?? profile.kids[0] ?? null, anchorAge, band }
}

// The families are in Buenos Aires; the server's clock may be anywhere (UTC in Docker).
const hourInBuenosAires = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: 'numeric',
  hourCycle: 'h23',
})

/**
 * The story follows the moment: calm in the night-mode window (19:00 to
 * 07:00 in Buenos Aires), lively the rest of the day. The child's own
 * routine arrives with the fuller data model and replaces the clock.
 * @param {Date} now
 * @returns {'calm' | 'lively'}
 */
export function moodAt(now) {
  const hour = Number(hourInBuenosAires.format(now))
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
 * The family as the prompt gets it, cut down to the casting: only the kids,
 * the pet, the toy, and the theme that were drawn are named, so the model
 * isn't tempted to bring in the rest of the family. Names stay exactly as the
 * family typed them.
 * @param {Profile} profile
 * @param {Casting} casting
 */
export function familyLines(profile, casting) {
  const cast = profile.kids.filter((kid) => casting.kids.includes(kid.id))
  const kids = cast.map((kid) => `${kid.name}${kid.age != null ? `, de ${ageLine(kid.age)}` : ''}`)
  return {
    kids: kids.join(' y ') || 'no aparece ningún chico de la familia',
    pet: casting.pet?.name ?? 'no aparece en este cuento',
    toys: casting.toy?.name ?? 'ninguno en este cuento',
    interests: casting.theme ?? 'sin tema fijo',
  }
}

/** A plot option the model proposed. @typedef {{ title: string, teaser: string, minutes: number, premise: string }} Plot */

/**
 * The answer to an option call: JSON, with or without markdown fences,
 * holding the plot object on its own, wrapped in an array, or under a
 * `tramas` key, since models wrap it all three ways. Minutes outside the
 * band sit back inside it, and an answer with no title, teaser or premise
 * throws, which is what the retry is for.
 * @param {string} text
 * @param {Band} band
 * @returns {Plot}
 */
export function parseOption(text, band) {
  const parsed = jsonIn(text)
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tramas) ? parsed.tramas : parsed ? [parsed] : []
  const plot = list
    .map((option) => ({
      title: String(option?.title ?? '').trim(),
      teaser: String(option?.teaser ?? '').trim(),
      minutes: clampMinutes(option?.minutes, band),
      premise: String(option?.premise ?? '').trim(),
    }))
    .find((option) => option.title && option.teaser && option.premise)
  if (!plot) throw new Error('The story model proposed no readable option')
  return plot
}

/**
 * The minutes the model asked for, held inside the band's own range. An
 * answer with no number at all gets the band's shortest story.
 * @param {unknown} minutes
 * @param {Band} band
 */
export function clampMinutes(minutes, band) {
  const value = Math.round(Number(minutes))
  if (!Number.isFinite(value)) return band.minutes[0]
  return Math.min(band.minutes[1], Math.max(band.minutes[0], value))
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

/**
 * How many words a story came out at, for the audit: every paragraph of
 * every part, split on whitespace.
 * @param {string[][]} parts
 */
export function wordsIn(parts) {
  return parts.flat().reduce((total, paragraph) => total + paragraph.split(/\s+/).filter(Boolean).length, 0)
}
