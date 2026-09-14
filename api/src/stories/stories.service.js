/**
 * Stories for a family. Two kinds: stories from a template with its slots
 * filled from the family profile, and stories the LLM writes from a plot the
 * family chose (JUG-71). Either way a story is generated once, saved, and
 * reads again exactly as it did; LLM stories arrive paragraph by paragraph
 * as they come out of the model.
 */
import { randomUUID } from 'node:crypto'
import { fillFor, render, seededRandom, shuffle, unknownPlaceholders } from '../catalog/slots.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'
import { UpstreamError } from '../llm/opencode.js'
import { anchorOf, familyLines, moodAt, momentOf, parseOptions, partsOf, StoryParser } from './storytelling.js'
import { render as renderPrompt, storyOptionsTemplate, storyTemplate, storyteller } from './prompts.js'

/**
 * @typedef {object} StoryTemplateInput
 * @property {string} slug
 * @property {string} title
 * @property {string} teaser
 * @property {number} minutes
 * @property {'calm' | 'lively'} mood
 * @property {number} minAgeMonths
 * @property {number} maxAgeMonths
 * @property {string[][]} parts each a list of paragraphs
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption the id is a plot's or a template's */
/**
 * @typedef {{ id: string, templateId: string | null, plotId: string | null, title: string, teaser: string, minutes: number, parts: string[][] }} Story
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number, createdAt: string }} SavedStory */
/**
 * @typedef {object} StoryParagraph
 * @property {'paragraph'} type
 * @property {number} part
 * @property {string} text
 */
/**
 * @typedef {object} StoryDone
 * @property {'story'} type
 * @property {Story} story
 */
/** @typedef {StoryParagraph | StoryDone} StoryEvent what the reading screen draws, one at a time */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {ReturnType<typeof createStoriesService>} StoriesService */
/** @typedef {import('../llm/opencode.js').Llm} Llm */

const OPTIONS = 3
const LIBRARY_CAP = 20

/** @param {Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts'>} template */
const textsOf = (template) => [template.title, template.teaser, ...template.parts.flat()]

const TEMPLATE_COLUMNS = `id, title, teaser, minutes, min_age_months as "minAgeMonths", max_age_months as "maxAgeMonths", parts`

const STORY_COLUMNS = `id, template_id as "templateId", plot_id as "plotId", title, teaser, minutes, parts, created_at as "createdAt"`

/** @param {unknown} parts */
const isParts = (parts) =>
  Array.isArray(parts) &&
  parts.length > 0 &&
  parts.every(
    (part) => Array.isArray(part) && part.length > 0 && part.every((paragraph) => typeof paragraph === 'string' && paragraph),
  )

/**
 * Lets whoever listens step in; the reader can leave mid-story and nothing
 * is saved. Without this the replay loop would have no way to stop.
 */
const tick = async (signal) => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (signal?.aborted) {
    const error = new Error('The reader left before the story ended')
    error.name = 'AbortError'
    throw error
  }
}

/**
 * @param {{
 *   db: import('pg').Pool,
 *   families: FamiliesService,
 *   llm?: Llm | null,
 *   random?: () => number,
 *   now?: () => Date,
 * }} deps `llm` absent means template stories only; `now` lets tests fix the moment.
 */
export function createStoriesService({ db, families, llm = null, random = Math.random, now = () => new Date() }) {
  /**
   * A template's slots filled for this family. Seeded by family and
   * template, so an option and the story written from it always match.
   * @param {Profile} profile
   * @param {{ id: string } & Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts' | 'minAgeMonths' | 'maxAgeMonths'>} template
   */
  const fillOf = (profile, template) =>
    fillFor(profile, { ...template, texts: textsOf(template) }, seededRandom(`${profile.id}:${template.id}`))

  /** @param {string} familyId @param {string} templateId @returns {Promise<Story | null>} */
  const findWritten = async (familyId, templateId) => {
    const { rows } = await db.query(
      `select ${STORY_COLUMNS}
       from stories
       where family_id = $1 and template_id = $2`,
      [familyId, templateId],
    )
    return rows[0] ?? null
  }

  /** @param {string} familyId @param {string} plotId @returns {Promise<Story | null>} */
  const findPlotWritten = async (familyId, plotId) => {
    const { rows } = await db.query(
      `select ${STORY_COLUMNS}
       from stories
       where family_id = $1 and plot_id = $2`,
      [familyId, plotId],
    )
    return rows[0] ?? null
  }

  /** The model's plot options for the family, saved on screen-fresh rows. */
  const generateOptions = async (profile, familyId, exclude) => {
    const mood = moodAt(now())
    const anchor = anchorOf(profile)
    const lines = familyLines(profile)
    const size = anchor.band.minutes[1]
    const latest = await db.query(
      `select title from stories where family_id = $1 order by created_at desc limit 12`,
      [familyId],
    )
    const recent = latest.rows.map((row) => row.title)
    const avoid =
      recent.length > 0 ? `Títulos ya usados, para no repetir: ${recent.slice(0, 3).map((title) => `«${title}»`).join(', ')}.` : ''
    let text = ''

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const user = renderPrompt(storyOptionsTemplate(), {
        moment: momentOf(mood),
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        anchorAge: String(anchor.anchorAge),
        band: anchor.band.band,
        range: anchor.band.range,
        minutes: String(size),
        count: String(OPTIONS),
        avoid,
      })
      const chunks = []
      for await (const chunk of llm.stream({ system: storyteller(), user })) chunks.push(chunk)
      text = chunks.join('')
      let plots
      try {
        plots = parseOptions(text)
      } catch {
        // A malformed answer is tried once more.
        continue
      }
      if (plots.length > 0) {
        await db.query(`delete from story_plots where family_id = $1 and not (id = any($2))`, [familyId, exclude])
        for (const plot of plots) {
          const id = randomUUID()
          await db.query(
            `insert into story_plots (id, family_id, title, teaser, minutes, premise, mood)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [id, familyId, plot.title, plot.teaser, plot.minutes, plot.premise, mood],
          )
          plot.id = id
        }
        return plots
      }
    }
    throw new UpstreamError(`The story model proposed no readable options: ${text}`)
  }

  /** Three options from the catalog templates, filled for the family. */
  const templateOptions = async (familyId, profile, exclude) => {
    const { rows: templates } = await db.query(`select ${TEMPLATE_COLUMNS} from story_templates order by slug`)
    const excluded = new Set(exclude)
    const fitting = templates
      .map((template) => ({ template, fill: fillOf(profile, template) }))
      .filter((candidate) => candidate.fill !== null)
    const fresh = fitting.filter((candidate) => !excluded.has(candidate.template.id))
    const seen = fitting.filter((candidate) => excluded.has(candidate.template.id))
    return [...shuffle(fresh, random), ...shuffle(seen, random)].slice(0, OPTIONS).map(({ template, fill }) => ({
      id: template.id,
      title: render(template.title, /** @type {NonNullable<typeof fill>} */ (fill)),
      teaser: render(template.teaser, /** @type {NonNullable<typeof fill>} */ (fill)),
      minutes: template.minutes,
    }))
  }

  /** The paragraphs of a saved story, as reading events. */
  const replayEvents =
    /** @param {Story} story @param {{ signal?: AbortSignal }} [options] */
    async function* (story, { signal } = {}) {
      for (let part = 0; part < story.parts.length; part += 1) {
        for (const paragraph of story.parts[part]) {
          yield { type: 'paragraph', part: part + 1, text: paragraph }
          await tick(signal)
        }
      }
      yield { type: 'story', story }
    }

  return {
    /**
     * Adds a template to the catalog unless one with its slug is already
     * there; a template already in the database is never overwritten.
     * @param {StoryTemplateInput} template
     * @returns {Promise<{ created: boolean }>}
     */
    async addTemplate(template) {
      if (!isParts(template.parts)) throw new ValidationError(`${template.slug} needs parts, each a list of paragraphs`)
      const unknown = unknownPlaceholders(textsOf(template))
      if (unknown.length > 0) throw new ValidationError(`Unknown slots in ${template.slug}: ${unknown.join(', ')}`)
      const { rowCount } = await db.query(
        `insert into story_templates (slug, title, teaser, minutes, mood, min_age_months, max_age_months, parts)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (slug) do nothing`,
        [
          template.slug,
          template.title,
          template.teaser,
          template.minutes,
          template.mood,
          template.minAgeMonths,
          template.maxAgeMonths,
          JSON.stringify(template.parts),
        ],
      )
      return { created: rowCount === 1 }
    },

    /**
     * Three stories the family could read. With the LLM configured these are
     * plot options written for them; without it, catalog templates with
     * their slots filled. The ones in `exclude` (already on screen) come
     * last, only if they still fit. When the model fails the family hears
     * about it, so a quiet outage stays quiet.
     * @param {string} familyId
     * @param {{ exclude?: string[] }} [options]
     * @returns {Promise<StoryOption[]>}
     */
    async options(familyId, { exclude = [] } = {}) {
      const profile = await families.profileOf(familyId)
      if (!llm) return templateOptions(familyId, profile, exclude)
      const plots = await generateOptions(profile, familyId, exclude)
      return plots.map((plot) => ({ id: plot.id, title: plot.title, teaser: plot.teaser, minutes: plot.minutes }))
    },

    /**
     * The story from this template, written for the family. Written once and
     * saved; asking again returns the saved story.
     * @param {string} familyId
     * @param {string} templateId
     * @returns {Promise<Story>}
     */
    async write(familyId, templateId) {
      const written = await findWritten(familyId, templateId)
      if (written) return written

      const { rows } = await db.query(`select ${TEMPLATE_COLUMNS} from story_templates where id = $1`, [templateId])
      const template = rows[0]
      if (!template) throw new NotFoundError('No such story')
      const fill = fillOf(await families.profileOf(familyId), template)
      if (!fill) throw new ConflictError('This story needs someone or something the family profile does not have')

      await db.query(
        `insert into stories (family_id, template_id, source, title, teaser, minutes, parts)
         values ($1, $2, 'template', $3, $4, $5, $6)
         on conflict (family_id, template_id) where template_id is not null do nothing`,
        [
          familyId,
          templateId,
          render(template.title, fill),
          render(template.teaser, fill),
          template.minutes,
          JSON.stringify(template.parts.map((/** @type {string[]} */ part) => part.map((paragraph) => render(paragraph, fill)))),
        ],
      )
      // Whether this call or one running alongside it wrote the story.
      return /** @type {Story} */ (await findWritten(familyId, templateId))
    },

    /**
     * The story the chosen id leads to — a plot's or a template's — read
     * aloud, paragraph by paragraph, then once more whole. Whatever it is,
     * it is generated once and saved; rereading it returns the saved story.
     * A reader who leaves early hears no more and nothing is saved.
     * @param {string} familyId
     * @param {string} id a plot or a template
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<AsyncGenerator<StoryEvent, void, void>>}
     */
    async writeStream(familyId, id, { signal } = {}) {
      const { rows: plots } = await db.query(
        `select id from story_plots where id = $1 and family_id = $2`,
        [id, familyId],
      )
      if (plots[0]) return this.writePlot(familyId, id, { signal })

      const { rows: templates } = await db.query(`select id from story_templates where id = $1`, [id])
      if (templates[0]) return this.streamTemplate(familyId, id, { signal })

      throw new NotFoundError('No such story')
    },

    /**
     * A plot the family chose, coming out of the model paragraph by
     * paragraph, then once more as the whole saved story.
     * @param {string} familyId
     * @param {string} plotId
     * @param {{ signal?: AbortSignal }} [options]
     */
    async *writePlot(familyId, plotId, { signal } = {}) {
      const { rows } = await db.query(
        `select title, teaser, minutes, premise, mood from story_plots where id = $1 and family_id = $2`,
        [plotId, familyId],
      )
      const plot = rows[0]
      if (!plot) throw new NotFoundError('No such story')

      const replay = await findPlotWritten(familyId, plotId)
      if (replay) {
        yield* replayEvents(replay, { signal })
        return
      }

      const profile = await families.profileOf(familyId)
      const { anchorAge, band } = anchorOf(profile)
      const lines = familyLines(profile)
      const user = renderPrompt(storyTemplate(), {
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        anchorAge: String(anchorAge),
        band: band.band,
        moment: momentOf(plot.mood),
        minutes: String(plot.minutes),
        title: plot.title,
        premise: plot.premise,
      })
      const parser = new StoryParser()
      const paragraphs = []
      try {
        for await (const chunk of llm.stream({ system: storyteller(), user, signal })) {
          for (const paragraph of parser.push(chunk)) {
            paragraphs.push(paragraph)
            yield { type: 'paragraph', ...paragraph }
            await tick(signal)
          }
        }
        for (const paragraph of parser.end()) {
          paragraphs.push(paragraph)
          yield { type: 'paragraph', ...paragraph }
          await tick(signal)
        }
      } catch (error) {
        if (signal?.aborted) return
        throw error
      }

      const parts = partsOf(paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      await db.query(
        `insert into stories (family_id, plot_id, source, title, teaser, minutes, parts)
         values ($1, $2, 'generated', $3, $4, $5, $6)
         on conflict (family_id, plot_id) where plot_id is not null do nothing`,
        [familyId, plotId, plot.title, plot.teaser, plot.minutes, JSON.stringify(parts)],
      )
      const story = await findPlotWritten(familyId, plotId)
      if (!story) throw new UpstreamError('The story did not save')
      yield { type: 'story', story }
    },

    /**
     * A catalog story, with its slots filled, read as events like an LLM
     * story so the web never tells the kinds apart.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ signal?: AbortSignal }} [options]
     */
    async *streamTemplate(familyId, templateId, { signal } = {}) {
      const story = await this.write(familyId, templateId)
      yield* replayEvents(story, { signal })
    },

    /**
     * The family's recent stories, the ones worth reading again. Newest
     * first; short, because stories are for re-reading, not for hoarding.
     * @param {string} familyId
     * @returns {Promise<SavedStory[]>}
     */
    async list(familyId) {
      const { rows } = await db.query(
        `select id, title, teaser, minutes, created_at as "createdAt"
         from stories
         where family_id = $1
         order by created_at desc, id desc
         limit $2`,
        [familyId, LIBRARY_CAP],
      )
      return rows
    },

    /**
     * One saved story, if the family wrote it.
     * @param {string} familyId
     * @param {string} storyId
     * @returns {Promise<Story>}
     */
    async find(familyId, storyId) {
      const { rows } = await db.query(
        `select ${STORY_COLUMNS}
         from stories
         where family_id = $1 and id = $2`,
        [familyId, storyId],
      )
      if (!rows[0]) throw new NotFoundError('No such story')
      return rows[0]
    },
  }
}