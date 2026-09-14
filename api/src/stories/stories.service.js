/**
 * Stories for a family. Two kinds: stories from a template with its slots
 * filled from the family profile, and stories the LLM writes from a plot the
 * family chose (JUG-71). Either way a story is generated once, saved, and
 * reads again exactly as it did; LLM stories arrive paragraph by paragraph
 * as they come out of the model.
 */
import { randomUUID } from 'node:crypto'
import { and, desc, eq, notInArray, sql } from 'drizzle-orm'
import { fillFor, render, seededRandom, shuffle, unknownPlaceholders } from '../catalog/slots.js'
import { stories, storyPlots, storyTemplates } from './stories.schema.js'
import { ConflictError, NotFoundError, ValidationError } from '../errors.js'
import { UpstreamError } from '../llm/llm.js'
import { kidIdsOf, withKids } from '../families/families.service.js'
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
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {ReturnType<typeof createStoriesService>} StoriesService */
/** @typedef {import('../llm/llm.js').Llm} Llm */

const OPTIONS = 3
const LIBRARY_CAP = 20

/** @param {Pick<StoryTemplateInput, 'title' | 'teaser' | 'parts'>} template */
const textsOf = (template) => [template.title, template.teaser, ...template.parts.flat()]

const templateColumns = {
  id: storyTemplates.id,
  title: storyTemplates.title,
  teaser: storyTemplates.teaser,
  minutes: storyTemplates.minutes,
  minAgeMonths: storyTemplates.minAgeMonths,
  maxAgeMonths: storyTemplates.maxAgeMonths,
  parts: storyTemplates.parts,
}

const storyColumns = {
  id: stories.id,
  templateId: stories.templateId,
  plotId: stories.plotId,
  title: stories.title,
  teaser: stories.teaser,
  minutes: stories.minutes,
  parts: stories.parts,
}

/** @param {unknown} parts @returns {parts is string[][]} */
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
 *   db: Db,
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

  /** A saved story, shaped for the reading screen. @param {typeof stories.$inferSelect} row */
  const toStory = (row) => ({ ...row, parts: /** @type {string[][]} */ (row.parts) })

  /**
   * A template's story is written once for each set of kids playing.
   * @param {string} familyId @param {string} templateId @param {string[]} kidIds @returns {Promise<Story | null>}
   */
  const findWritten = async (familyId, templateId, kidIds) => {
    const [story] = await db
      .select(storyColumns)
      .from(stories)
      .where(and(eq(stories.familyId, familyId), eq(stories.templateId, templateId), eq(stories.kidIds, kidIds)))
    return story ? toStory(story) : null
  }

  /** @param {string} familyId @param {string} plotId @returns {Promise<Story | null>} */
  const findPlotWritten = async (familyId, plotId) => {
    const [story] = await db
      .select(storyColumns)
      .from(stories)
      .where(and(eq(stories.familyId, familyId), eq(stories.plotId, plotId)))
    return story ? toStory(story) : null
  }

  /** The model's plot options for the family, saved on screen-fresh rows. */
  const generateOptions = async (profile, familyId, exclude) => {
    const mood = moodAt(now())
    const anchor = anchorOf(profile)
    const lines = familyLines(profile)
    const size = anchor.band.minutes[1]
    const latest = await db
      .select({ title: stories.title })
      .from(stories)
      .where(eq(stories.familyId, familyId))
      .orderBy(desc(stories.createdAt))
      .limit(12)
    const recent = latest.map((row) => row.title)
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
        plots = parseOptions(text).slice(0, OPTIONS)
      } catch {
        // A malformed answer is tried once more.
        continue
      }
      // The plots on screen stay pickable; the rest retire. One transaction,
      // so a failed save never leaves the family with no plots at all.
      const stale =
        exclude.length > 0
          ? and(eq(storyPlots.familyId, familyId), notInArray(storyPlots.id, exclude))
          : eq(storyPlots.familyId, familyId)
      // The ids are ours so the options keep the model's order.
      const saved = plots.map((plot) => ({ id: randomUUID(), ...plot }))
      await db.transaction(async (tx) => {
        await tx.delete(storyPlots).where(stale)
        await tx.insert(storyPlots).values(saved.map((plot) => ({ ...plot, familyId, mood, kidIds: kidIdsOf(profile) })))
      })
      return saved
    }
    throw new UpstreamError(`The story model proposed no readable options: ${text}`)
  }

  /** Three options from the catalog templates, filled for the family. */
  const templateOptions = async (profile, exclude) => {
    const rows = await db.select(templateColumns).from(storyTemplates).orderBy(storyTemplates.slug)
    const templates = rows.map((row) => ({ ...row, parts: /** @type {string[][]} */ (row.parts) }))
    const excluded = new Set(exclude)
    const fitting = templates.flatMap((template) => {
      const fill = fillOf(profile, template)
      return fill ? [{ template, fill }] : []
    })
    const fresh = fitting.filter((candidate) => !excluded.has(candidate.template.id))
    const seen = fitting.filter((candidate) => excluded.has(candidate.template.id))
    return [...shuffle(fresh, random), ...shuffle(seen, random)].slice(0, OPTIONS).map(({ template, fill }) => ({
      id: template.id,
      title: render(template.title, fill),
      teaser: render(template.teaser, fill),
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
      const added = await db
        .insert(storyTemplates)
        .values(template)
        .onConflictDoNothing({ target: storyTemplates.slug })
        .returning({ id: storyTemplates.id })
      return { created: added.length === 1 }
    },

    /**
     * Three stories the family could read, starring the kids playing. With
     * the LLM configured these are plot options written for them; without
     * it, catalog templates with their slots filled. The ones in `exclude`
     * (already on screen) come last, only if they still fit. When the model
     * fails the family hears about it, so a quiet outage stays quiet.
     * @param {string} familyId
     * @param {{ exclude?: string[], userId?: string | null }} [options] `userId` is the adult
     *   asking, whose kids sitting out are left out; without one, every kid plays
     * @returns {Promise<StoryOption[]>}
     */
    async options(familyId, { exclude = [], userId = null } = {}) {
      const profile = await families.playingProfile(familyId, userId)
      if (!llm) return templateOptions(profile, exclude)
      const plots = await generateOptions(profile, familyId, exclude)
      return plots.map((plot) => ({ id: plot.id, title: plot.title, teaser: plot.teaser, minutes: plot.minutes }))
    },

    /**
     * The story from this template, written for the kids playing. Written
     * once for each set of kids and saved; asking again returns the saved story.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ userId?: string | null }} [options] the adult asking; without one, every kid plays
     * @returns {Promise<Story>}
     */
    async write(familyId, templateId, { userId = null } = {}) {
      const profile = await families.playingProfile(familyId, userId)
      const kidIds = kidIdsOf(profile)
      const written = await findWritten(familyId, templateId, kidIds)
      if (written) return written

      const [row] = await db.select(templateColumns).from(storyTemplates).where(eq(storyTemplates.id, templateId))
      if (!row) throw new NotFoundError('No such story')
      const template = { ...row, parts: /** @type {string[][]} */ (row.parts) }
      const fill = fillOf(profile, template)
      if (!fill) throw new ConflictError('This story needs someone or something the family profile does not have')

      await db
        .insert(stories)
        .values({
          familyId,
          templateId,
          kidIds,
          source: 'template',
          title: render(template.title, fill),
          teaser: render(template.teaser, fill),
          minutes: template.minutes,
          parts: template.parts.map((part) => part.map((paragraph) => render(paragraph, fill))),
        })
        .onConflictDoNothing({
          target: [stories.familyId, stories.templateId, stories.kidIds],
          where: sql`${stories.templateId} is not null`,
        })
      // Whether this call or one running alongside it wrote the story.
      return /** @type {Story} */ (await findWritten(familyId, templateId, kidIds))
    },

    /**
     * The story the chosen id leads to — a plot's or a template's — read
     * aloud, paragraph by paragraph, then once more whole. Whatever it is,
     * it is generated once and saved; rereading it returns the saved story.
     * A reader who leaves early hears no more and nothing is saved.
     * @param {string} familyId
     * @param {string} id a plot or a template
     * @param {{ signal?: AbortSignal, userId?: string | null }} [options] `userId` is the adult
     *   asking: a template story stars their kids playing, a plot's the kids it was written for
     * @returns {Promise<AsyncGenerator<StoryEvent, void, void>>}
     */
    async writeStream(familyId, id, { signal, userId = null } = {}) {
      const [plot] = await db
        .select({ id: storyPlots.id })
        .from(storyPlots)
        .where(and(eq(storyPlots.id, id), eq(storyPlots.familyId, familyId)))
      if (plot) return this.writePlot(familyId, id, { signal })

      const [template] = await db.select({ id: storyTemplates.id }).from(storyTemplates).where(eq(storyTemplates.id, id))
      if (template) return this.streamTemplate(familyId, id, { signal, userId })

      throw new NotFoundError('No such story')
    },

    /**
     * A plot the family chose, coming out of the model paragraph by
     * paragraph, then once more as the whole saved story. It stars the kids
     * the plot was proposed for.
     * @param {string} familyId
     * @param {string} plotId
     * @param {{ signal?: AbortSignal }} [options]
     */
    async *writePlot(familyId, plotId, { signal } = {}) {
      const [plot] = await db
        .select({
          title: storyPlots.title,
          teaser: storyPlots.teaser,
          minutes: storyPlots.minutes,
          premise: storyPlots.premise,
          mood: storyPlots.mood,
          kidIds: storyPlots.kidIds,
        })
        .from(storyPlots)
        .where(and(eq(storyPlots.id, plotId), eq(storyPlots.familyId, familyId)))
      if (!plot) throw new NotFoundError('No such story')

      const replay = await findPlotWritten(familyId, plotId)
      if (replay) {
        yield* replayEvents(replay, { signal })
        return
      }

      const profile = withKids(await families.profileOf(familyId), plot.kidIds)
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

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      await db
        .insert(stories)
        .values({
          familyId,
          plotId,
          kidIds: kidIdsOf(profile),
          source: 'generated',
          title: plot.title,
          teaser: plot.teaser,
          minutes: plot.minutes,
          parts,
        })
        .onConflictDoNothing({ target: [stories.familyId, stories.plotId], where: sql`${stories.plotId} is not null` })
      const story = await findPlotWritten(familyId, plotId)
      if (!story) throw new UpstreamError('The story did not save')
      yield { type: 'story', story }
    },

    /**
     * A catalog story, with its slots filled, read as events like an LLM
     * story so the web never tells the kinds apart.
     * @param {string} familyId
     * @param {string} templateId
     * @param {{ signal?: AbortSignal, userId?: string | null }} [options]
     */
    async *streamTemplate(familyId, templateId, { signal, userId = null } = {}) {
      const story = await this.write(familyId, templateId, { userId })
      yield* replayEvents(story, { signal })
    },

    /**
     * The family's recent stories, the ones worth reading again. Newest
     * first; short, because stories are for re-reading, not for hoarding.
     * @param {string} familyId
     * @returns {Promise<SavedStory[]>}
     */
    async list(familyId) {
      const rows = await db
        .select({ id: stories.id, title: stories.title, teaser: stories.teaser, minutes: stories.minutes, createdAt: stories.createdAt })
        .from(stories)
        .where(eq(stories.familyId, familyId))
        .orderBy(desc(stories.createdAt), desc(stories.id))
        .limit(LIBRARY_CAP)
      return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    },

    /**
     * One saved story, if the family wrote it.
     * @param {string} familyId
     * @param {string} storyId
     * @returns {Promise<Story>}
     */
    async find(familyId, storyId) {
      const [story] = await db
        .select(storyColumns)
        .from(stories)
        .where(and(eq(stories.familyId, familyId), eq(stories.id, storyId)))
      if (!story) throw new NotFoundError('No such story')
      return toStory(story)
    },
  }
}
