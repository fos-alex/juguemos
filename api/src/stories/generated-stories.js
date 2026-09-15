/**
 * Stories the LLM writes (JUG-71). The model first proposes plots for the
 * family to choose from, and the chosen plot becomes a story that arrives
 * paragraph by paragraph as it comes out of the model. The story is saved
 * once it ends, and reads again from what was saved.
 */
import { randomUUID } from 'node:crypto'
import { and, desc, eq, notInArray, sql } from 'drizzle-orm'
import { NotFoundError, UpstreamError } from '../errors.js'
import { kidIdsOf, withKids } from '../families/families.service.js'
import { render } from '../llm/prompt.js'
import { OPTIONS, replayEvents, storyColumns, tick, toStory } from './shared.js'
import { stories, storyPlots } from './stories.schema.js'
import storyOptionsPrompt from './prompts/story-options.js'
import storyPrompt from './prompts/story.js'
import storyteller from './prompts/storyteller.js'
import { anchorOf, familyLines, moodAt, momentOf, parseOptions, partsOf, StoryParser } from './storytelling.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../llm/client.js').Llm} Llm */
/** @typedef {import('./stories.service.js').Story} Story */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {{ id: string } & import('./storytelling.js').Plot} SavedPlot a plot with the id the family will pick it by */

/**
 * @param {{ db: Db, llm: Llm | null, families: FamiliesService, now?: () => Date }} deps
 *   `llm` may be null: a plot's story that was already written still replays
 *   without one. `now` lets tests fix the moment a story is written for.
 */
export function createGeneratedStories({ db, llm, families, now = () => new Date() }) {
  /** @param {string} familyId @param {string} plotId @returns {Promise<Story | null>} */
  const findWritten = async (familyId, plotId) => {
    const [story] = await db
      .select(storyColumns)
      .from(stories)
      .where(and(eq(stories.familyId, familyId), eq(stories.plotId, plotId)))
    return story ? toStory(story) : null
  }

  return {
    /** Whether this id is a plot this family was offered. @param {string} familyId @param {string} id */
    async hasPlot(familyId, id) {
      const [plot] = await db
        .select({ id: storyPlots.id })
        .from(storyPlots)
        .where(and(eq(storyPlots.id, id), eq(storyPlots.familyId, familyId)))
      return Boolean(plot)
    },

    /**
     * The model's plot options for the family, saved on screen-fresh rows.
     * A malformed answer is tried once more before the family hears that the
     * model failed, so a quiet outage stays quiet.
     * @param {Profile} profile
     * @param {string} familyId
     * @param {string[]} exclude the plots already on screen, which stay pickable
     * @returns {Promise<SavedPlot[]>}
     */
    async options(profile, familyId, exclude) {
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
        const user = render(storyOptionsPrompt, {
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
        for await (const chunk of /** @type {Llm} */ (llm).stream({ system: storyteller, user })) chunks.push(chunk)
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
    },

    /**
     * A plot the family chose, coming out of the model paragraph by
     * paragraph, then once more as the whole saved story. It stars the kids
     * the plot was proposed for. A reader who leaves early hears no more and
     * nothing is saved.
     * @param {string} familyId
     * @param {string} plotId
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<StoryEvent, void, void>}
     */
    async *write(familyId, plotId, { signal } = {}) {
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

      const replay = await findWritten(familyId, plotId)
      if (replay) {
        yield* replayEvents(replay, { signal })
        return
      }

      const profile = withKids(await families.profileOf(familyId), plot.kidIds)
      const { anchorAge, band } = anchorOf(profile)
      const lines = familyLines(profile)
      const user = render(storyPrompt, {
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
        for await (const chunk of /** @type {Llm} */ (llm).stream({ system: storyteller, user, signal })) {
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
      const story = await findWritten(familyId, plotId)
      if (!story) throw new UpstreamError('The story did not save')
      yield { type: 'story', story }
    },
  }
}
