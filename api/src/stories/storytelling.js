/**
 * The storytelling logic around the harness: which age band anchors a story,
 * how the moment reads in a prompt, the family lines a casting leaves in it,
 * and the two ways the model's answer is read — the option JSON and the
 * streaming story format. Everything here is pure, so the prompts in
 * `prompts/` can change without any of this moving.
 */
import { PET_KINDS } from '../families/kinds.js'
import { jsonIn } from '../llm/prompt.js'

/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('./casting.js').Casting} Casting */

/**
 * An age band: its id (the key of its prompt fragment in `prompts/bands.js`),
 * the oldest age it covers in months, how many minutes its stories run, and
 * the word budget the fragment asks for, which the audit checks the story
 * against.
 * @typedef {{ id: string, maxMonths: number, minutes: [number, number], words: [number, number] }} Band
 */

/**
 * Six months a band under four years, since a kid of 1 and one of 1 and 10
 * months need different stories, and a year a band at four and five (JUG-145).
 * A baby under a year gets the first band.
 * @type {Band[]}
 */
const BANDS = [
  { id: '1', maxMonths: 17, minutes: [2, 3], words: [200, 300] },
  { id: '1.5', maxMonths: 23, minutes: [3, 3], words: [280, 380] },
  { id: '2', maxMonths: 29, minutes: [3, 4], words: [350, 480] },
  { id: '2.5', maxMonths: 35, minutes: [4, 5], words: [450, 600] },
  { id: '3', maxMonths: 41, minutes: [4, 5], words: [520, 680] },
  { id: '3.5', maxMonths: 47, minutes: [5, 6], words: [620, 780] },
  { id: '4', maxMonths: 59, minutes: [5, 6], words: [700, 850] },
  { id: '5', maxMonths: Infinity, minutes: [6, 7], words: [800, 1000] },
]

/**
 * The youngest kid with a known age anchors the story: it is written for the
 * smallest listener, and that kid is the one the casting draws around. Kids
 * whose age nobody gave don't count, and a family with no ages at all gets
 * band 3.
 * @param {Profile} profile
 * @returns {{ anchor: Profile['kids'][number] | null, anchorMonths: number, band: Band }}
 */
export function anchorOf(profile) {
  const known = profile.kids.filter((kid) => kid.ageMonths != null)
  const anchor = known.reduce(
    (/** @type {Profile['kids'][number] | null} */ youngest, kid) =>
      youngest == null || /** @type {number} */ (kid.ageMonths) < /** @type {number} */ (youngest.ageMonths) ? kid : youngest,
    null,
  )
  const anchorMonths = anchor?.ageMonths ?? 36
  const band = BANDS.find((entry) => anchorMonths <= entry.maxMonths) ?? BANDS[BANDS.length - 1]
  return { anchor: anchor ?? profile.kids[0] ?? null, anchorMonths, band }
}

/** The moment as the harness names it. @param {import('../clock.js').Mood} mood */
export function momentOf(mood) {
  return mood === 'calm' ? 'TRANQUI, antes de dormir' : 'CON PILAS, de día'
}

/**
 * An age in months as it reads aloud: `8 meses`, `1 año`, `1 año y 10 meses`.
 * @param {number} ageMonths
 */
export function ageLine(ageMonths) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  const monthsText = months === 1 ? '1 mes' : `${months} meses`
  if (years === 0) return monthsText
  const yearsText = years === 1 ? '1 año' : `${years} años`
  return months === 0 ? yearsText : `${yearsText} y ${monthsText}`
}

/**
 * The family as the prompt gets it, cut down to the castings it carries:
 * only the kids, the pet, the toys and the themes that were drawn are named,
 * so the model isn't tempted to bring in the rest of the family. The options
 * prompt holds the two castings of a screen and the story prompt holds
 * one. Names stay exactly as the family typed them.
 *
 * The pet comes with its animal, and the parents aren't drawn: they are a
 * line of their own that any story can call on, by what the kids call them
 * (JUG-21). A family with no parents saved gets no line at all.
 * @param {Profile} profile
 * @param {Casting[]} castings
 */
export function familyLines(profile, castings) {
  const inStory = new Set(castings.flatMap((casting) => casting.kids))
  const cast = profile.kids.filter((kid) => inStory.has(kid.id))
  const kids = cast.map((kid) => `${kid.name}${kid.ageMonths != null ? `, de ${ageLine(kid.ageMonths)}` : ''}`)
  const pets = uniqueBy(castings.map((casting) => casting.pet)).map((pet) => {
    const kind = PET_KINDS[profile.pets.find((each) => each.id === pet.id)?.kind ?? 'otro']
    return kind ? `${pet.name} (${kind})` : pet.name
  })
  const toys = unique(castings.map((casting) => casting.toy?.name))
  const themes = unique(castings.map((casting) => casting.theme))
  return {
    kids: kids.join(' y ') || 'no aparece ningún chico de la familia',
    pet: pets.join(' y ') || 'no aparece en este cuento',
    toys: toys.join(', ') || 'ninguno en este cuento',
    interests: themes.join(', ') || 'sin tema fijo',
    parents: parentsLine(profile.parents),
  }
}

/**
 * The parents as the prompts get them, on a line of their own after the
 * family's, or nothing when there are none.
 * @param {Profile['parents']} parents
 */
function parentsLine(parents) {
  if (parents.length === 0) return ''
  const who = parents.map((parent) => `${parent.name}, a quien le dicen ${parent.calledAs}`).join('; ')
  return `\nLos padres: ${who}. Pueden aparecer en cualquier cuento aunque no estén en el reparto, y el cuento los nombra como les dicen los chicos.`
}

/** The names that are there, each once, in the order they were drawn. @param {(string | null | undefined)[]} names */
const unique = (names) => [...new Set(names.filter((name) => Boolean(name)))]

/**
 * The cast members that are there, each once by id, in the order they were drawn.
 * @template {{ id: string }} Member
 * @param {(Member | null | undefined)[]} members
 * @returns {Member[]}
 */
const uniqueBy = (members) => [...new Map(members.flatMap((member) => (member ? [[member.id, member]] : []))).values()]

/** A plot option the model proposed. @typedef {{ title: string, teaser: string, minutes: number, premise: string }} Plot */

/**
 * One option of the model's answer as a plot, or null when it is missing a
 * title, a teaser or a premise. The minutes it asked for sit inside the
 * band's own range, and an answer with no number at all gets the band's
 * shortest story.
 * @param {any} option
 * @param {Band} band
 * @returns {Plot | null}
 */
export function toPlot(option, band) {
  const plot = {
    title: unmarked(String(option?.title ?? '')),
    teaser: unmarked(String(option?.teaser ?? '')),
    minutes: clampMinutes(option?.minutes, band),
    premise: unmarked(String(option?.premise ?? '')),
  }
  return plot.title && plot.teaser && plot.premise ? plot : null
}

/**
 * The minutes the model asked for, held inside the band's own range.
 * @param {unknown} minutes
 * @param {Band} band
 */
export function clampMinutes(minutes, band) {
  const value = Math.round(Number(minutes))
  if (!Number.isFinite(value)) return band.minutes[0]
  return Math.min(band.minutes[1], Math.max(band.minutes[0], value))
}

/**
 * Reads the options answer as it streams, so an option reaches the family as
 * soon as the model has finished writing it instead of when the whole answer
 * lands. It looks for the array the plots are in — everything before it is
 * a fence, prose, or the `{ "tramas":` wrapper — and then hands back each
 * object as its braces close. Strings are tracked, so a brace or a bracket
 * inside a title doesn't count.
 */
export class OptionsParser {
  constructor() {
    /** Whether the array holding the plots has started. */
    this.inArray = false
    /** Whether the array has ended: nothing after it is a plot. */
    this.ended = false
    /** How deep in nested objects the scan is; 0 is between plots. */
    this.depth = 0
    this.inString = false
    this.escaped = false
    /** The object being read, braces included. */
    this.current = ''
  }

  /**
   * Feed one piece of the model's answer; the plots that finished with it
   * come back, as the objects the model wrote. An object that doesn't parse
   * is dropped, since the next one may still be good.
   * @param {string} delta
   * @returns {any[]}
   */
  push(delta) {
    const done = []
    for (const char of delta) {
      if (this.ended) break
      if (!this.inArray) {
        if (char === '[') this.inArray = true
        continue
      }
      if (this.depth > 0) this.current += char

      if (this.inString) {
        if (this.escaped) this.escaped = false
        else if (char === '\\') this.escaped = true
        else if (char === '"') this.inString = false
        continue
      }
      if (char === '"') {
        this.inString = true
      } else if (char === '{') {
        if (this.depth === 0) this.current = '{'
        this.depth += 1
      } else if (char === '}') {
        this.depth -= 1
        if (this.depth === 0) {
          try {
            done.push(JSON.parse(this.current))
          } catch {
            // A plot that doesn't parse is dropped; the next one may be good.
          }
          this.current = ''
        }
      } else if (char === ']' && this.depth === 0) {
        this.ended = true
      }
    }
    return done
  }
}

/**
 * The lines an answer can carry outside the story text, by the word that opens
 * them: the title a story with no plot of its own is named by (JUG-140), the
 * bookkeeping a series episode is asked for (JUG-59), and the sounds the
 * parent acts out (JUG-170). None of it is ever read aloud: the parser keeps
 * these lines out of the story and hands them back on their own.
 *
 * The ones that name the story are read only before its first part, so
 * «Título: eso lo dice un personaje» inside a story stays a paragraph. The
 * others are read wherever they land: the two that close the story come after
 * its last part, and a sounds line the model wrote in the wrong place still
 * has to stay out of the text.
 * @type {Record<string, string>}
 */
const OPENING_FIELDS = { titulo: 'title', serie: 'series', lugar: 'setting', antes: 'before' }

/** @type {Record<string, string>} */
const ANYWHERE_FIELDS = { sonidos: 'sounds', resumen: 'summary', personajes: 'characters' }

/** A line that opens with one word and a colon, which may be one of the fields. */
const FIELD_LINE = /^(\p{L}+)\s*:\s*(.*)$/u

/** The header that opens each part of a story. */
const PART_LINE = /^partes?\s+(\d+)\s*:?\s*$/i

/** A field's name as `FIELDS` keys it: lowercase, without accents. @param {string} word */
const keyOf = (word) =>
  word
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Reads the story format the harness asks for — `PARTE n` lines, one
 * paragraph per line, parts separated by those headers — as it streams.
 * A paragraph is done when its line ends, a part when the next header lands,
 * and anything before the first header (fences, titles, apologies) is not
 * the story, so it never reaches the family.
 *
 * The exceptions are the field lines in `FIELDS`. A field runs to the next
 * blank line, field, or part header, and `takeTitle` hands the title back as
 * soon as it lands, since the story is announced by it. `takeSounds` hands
 * back the sounds before the first paragraph, and the rest wait for
 * `takeFields` at the end.
 *
 * A paragraph's sound marks are tidied as it finishes (`tidyMarks`), so no
 * bracket reaches the family unless it marks a sound.
 */
export class StoryParser {
  constructor() {
    this.buffer = ''
    this.part = 0
    this.paragraph = ''
    /** What the answer said outside the story, by field name. @type {Record<string, string>} */
    this.fields = {}
    /** The field the lines are going into, until the story starts again. */
    this.field = ''
  }

  /**
   * The title the model wrote, once: the story it belongs to is announced a
   * single time, before its first paragraph. Empty when there was none.
   */
  takeTitle() {
    const title = unmarked(this.fields.title ?? '')
    delete this.fields.title
    return title
  }

  /**
   * The sounds the model said the story marks, once (JUG-170). Empty when it
   * listed none.
   * @returns {Sound[]}
   */
  takeSounds() {
    const sounds = soundsIn(this.fields.sounds ?? '')
    delete this.fields.sounds
    return sounds
  }

  /** Everything else the answer carried outside the story text. */
  takeFields() {
    const fields = Object.fromEntries(Object.entries(this.fields).map(([name, value]) => [name, unmarked(value)]))
    this.fields = {}
    return fields
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
      this.read(line, done)
    }
    return done
  }

  /** The answer ended; whatever was left closes the story. */
  end() {
    const done = /** @type {{ part: number, text: string }[]} */ ([])
    const tail = this.buffer.trim()
    this.buffer = ''
    if (tail) this.read(tail, done)
    this.flush(done)
    return done
  }

  /** One line of the answer. @param {string} line @param {{ part: number, text: string }[]} done */
  read(line, done) {
    const header = PART_LINE.exec(line)
    if (header) {
      this.flush(done)
      this.field = ''
      this.part = Number(header[1])
      return
    }
    const opened = FIELD_LINE.exec(line)
    const named = opened && keyOf(opened[1])
    const field = named ? ANYWHERE_FIELDS[named] ?? (this.part === 0 ? OPENING_FIELDS[named] : undefined) : undefined
    if (field) {
      this.flush(done)
      this.field = field
      this.fields[field] = /** @type {RegExpExecArray} */ (opened)[2].trim()
      return
    }
    if (line === '') {
      this.flush(done)
      this.field = ''
      return
    }
    if (this.field) {
      // A sound on a line of its own is a sound of its own.
      const joint = this.field === 'sounds' ? ';' : ' '
      this.fields[this.field] = `${this.fields[this.field]}${joint}${line}`.trim()
      return
    }
    if (this.part === 0) return
    this.paragraph = this.paragraph ? `${this.paragraph} ${line}` : line
  }

  /** @param {{ part: number, text: string }[]} done */
  flush(done) {
    const text = tidyMarks(this.paragraph)
    if (text && this.part > 0) done.push({ part: this.part, text })
    this.paragraph = ''
  }
}

/**
 * A sound the parent acts out (JUG-170): the sound as the story marks it, who
 * makes it, and a few words on how. The legend over the story is made of
 * these.
 * @typedef {{ sound: string, who: string, how: string }} Sound
 */

/** How many sounds a story's legend holds, so it stays small. */
const SOUNDS = 3

/** The longest a sound may be. Who makes it and how may be as long as a character's name. */
const SOUND_MAX = 40

/**
 * The sounds a `SONIDOS:` line lists: `¡Guau, guau! | Inca | contenta`, one
 * after another, separated by semicolons. A sound needs no one to make it and
 * no how, and anything after the first three is left out.
 * @param {string} line
 * @returns {Sound[]}
 */
export function soundsIn(line) {
  return line
    .split(';')
    .map((entry) => {
      const [sound = '', who = '', ...how] = entry.split('|')
      return {
        sound: sound.replace(/[[\]]/g, '').trim().slice(0, SOUND_MAX),
        who: who.trim().slice(0, NAME_MAX),
        how: how.join(' ').trim().slice(0, NAME_MAX),
      }
    })
    .filter((each) => each.sound !== '')
    .slice(0, SOUNDS)
}

/**
 * A paragraph with its sound marks tidied (JUG-170). A sound between brackets
 * stays marked, trimmed; a bracket with no partner, an empty pair, and a pair
 * around a marked sound are taken out, so the parent never sees a bracket.
 * @param {string} paragraph
 */
export function tidyMarks(paragraph) {
  return paragraph
    .split(/(\[[^[\]]*\])/)
    .map((piece) => {
      const pair = /^\[([^[\]]*)\]$/.exec(piece)
      if (!pair) return piece.replace(/[[\]]/g, '')
      const sound = pair[1].trim()
      return sound ? `[${sound}]` : ''
    })
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/**
 * Words with no sound marks, for everything outside the story text: a title, a
 * teaser, a series' name. Only the story text marks sounds (JUG-170).
 * @param {string} text
 */
export const unmarked = (text) => text.replace(/[[\]]/g, '').trim()

/** How many sounds a story marks in its text, for the audit. @param {string[][]} parts */
export function marksIn(parts) {
  return parts.flat().reduce((total, paragraph) => total + (paragraph.match(/\[[^[\]]+\]/g)?.length ?? 0), 0)
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

/**
 * A character the model invented and the series keeps, so a later episode can
 * bring it back (JUG-59). The family's own cast is not in here: it is in the
 * series casting, which every episode is written with.
 * @typedef {{ name: string, note: string }} SeriesCharacter
 */

/** How many invented characters a series carries, so its prompts stay short. */
const SERIES_CHARACTERS = 12

/** The longest a character's name and its few words may be. */
const NAME_MAX = 60
const NOTE_MAX = 140

/**
 * The characters a `PERSONAJES:` line names: `Caracola: un caracol lento` or
 * `Caracola (un caracol lento)`, one after another, separated by semicolons.
 * A name with nothing after it is still a character.
 * @param {string} line
 * @returns {SeriesCharacter[]}
 */
export function charactersIn(line) {
  return line
    .split(/[;\n]/)
    .map((entry) => {
      const parenthesised = /^([^(]+)\(([^)]*)\)\s*$/.exec(entry.trim())
      const [name, note] = parenthesised ? [parenthesised[1], parenthesised[2]] : split(entry, ':')
      return { name: name.trim().slice(0, NAME_MAX), note: note.trim().slice(0, NOTE_MAX) }
    })
    .filter((character) => character.name !== '')
}

/** A string at its first separator; everything after it is the second half. @param {string} text @param {string} separator */
function split(text, separator) {
  const at = text.indexOf(separator)
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)]
}

/**
 * The characters the series carries after an episode: the ones it already had,
 * in the order they arrived, plus whoever this episode brought in. A name the
 * series already knows keeps its first note unless it had none.
 * @param {SeriesCharacter[]} kept
 * @param {SeriesCharacter[]} found
 * @returns {SeriesCharacter[]}
 */
export function mergeCharacters(kept, found) {
  /** @type {Map<string, SeriesCharacter>} */
  const all = new Map()
  for (const character of [...kept, ...found]) {
    const key = character.name.trim().toLocaleLowerCase('es')
    const known = all.get(key)
    if (!known) all.set(key, character)
    else if (!known.note && character.note) all.set(key, { ...known, note: character.note })
  }
  return [...all.values()].slice(0, SERIES_CHARACTERS)
}

/**
 * The series as the prompt of its next episode says it: what it is called,
 * what it is about, where it happens, and who has been in it. Whatever the
 * series doesn't know yet is left out rather than said as an empty line.
 * @param {{ title: string, storyline: string, setting: string, characters: SeriesCharacter[] }} series
 * @returns {string}
 */
export function seriesLines({ title, storyline, setting, characters }) {
  const lines = [`La serie se llama «${title}».`, `El hilo de la serie, que ningún episodio cambia: ${storyline}`]
  if (setting) lines.push(`Dónde pasa: ${setting}`)
  if (characters.length > 0) {
    const named = characters.map((character) => (character.note ? `${character.name} (${character.note})` : character.name))
    lines.push(`Personajes que ya aparecieron y podés traer de vuelta: ${named.join('; ')}`)
  }
  return lines.join('\n')
}

/**
 * What happened in each episode so far, in order, which is what the next one
 * continues from.
 * @param {{ episode: number, title: string, summary: string }[]} episodes
 * @returns {string}
 */
export function episodeLines(episodes) {
  return episodes
    .map(({ episode, title, summary }) => `${episode}. «${title}»${summary ? `: ${summary}` : ''}`)
    .join('\n')
}

/**
 * What a series is called when the model didn't name it: after whoever leads
 * it, which is the one thing every episode has in common.
 * @param {Casting} casting
 */
export function seriesTitleFor(casting) {
  return `Las aventuras de ${casting.lead.name}.`
}
