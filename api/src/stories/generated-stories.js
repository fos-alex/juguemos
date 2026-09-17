/**
 * Stories the LLM writes (JUG-71). Code draws a casting for each option on
 * the screen (`casting.js`) and hands the two of them to one model call,
 * whose answer is read as it streams: each plot is saved and sent on as soon
 * as the model finishes writing it, so the first option is on screen long
 * before the second (JUG-139). The chosen plot becomes a story that arrives
 * paragraph by paragraph the same way, saved once it ends and read again
 * from what was saved. A parent who taps one of the family's interests
 * instead gets a story on that theme with no plot behind it, written and
 * titled in one call (JUG-140), and one who asks for a story in a voice note
 * gets that story the same way (JUG-156). Every step writes a row in the
 * story audit.
 */
import { randomUUID } from 'node:crypto'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { NotFoundError, UpstreamError } from '../errors.js'
import { kidIdsOf, withKids } from '../families/families.service.js'
import { render } from '../llm/prompt.js'
import { castEveryone, castingLines, castKeyword, castRequest, castScreen, DEFAULT_WEIGHTS } from './casting.js'
import { OPTIONS, replayEvents, storyColumns, toStory } from './shared.js'
import { stories, storyPlots } from './stories.schema.js'
import storyOptionsPrompt from './prompts/story-options.js'
import storyPrompt, { keywordStory, requestedStory } from './prompts/story.js'
import { requestLines } from './requests.js'
import { systemPrompt } from './prompts/compose.js'
import { anchorOf, familyLines, moodAt, momentOf, OptionsParser, partsOf, toPlot } from './storytelling.js'
import { nothingKept, tellStory, tokensFor, writtenDetails } from './tell.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../llm/client.js').Llm} Llm */
/** @typedef {import('./casting.js').Casting} Casting */
/** @typedef {import('./story-audit.js').StoryAudit} StoryAudit */
/** @typedef {import('./stories.service.js').Story} Story */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {import('./stories.service.js').StoryOption} StoryOption */
/** @typedef {import('./requests.js').StoryRequest} StoryRequest */
/**
 * @typedef {{ type: 'option', option: StoryOption } | { type: 'done' }} OptionEvent
 *   what an options screen sends: one option as each lands, then the end
 */

/** The most the options together may run to: each is a title, a line, and two sentences. */
const OPTION_TOKENS = 1200

/** How many of the family's last stories the casting draw avoids repeating. */
const RECENT_CASTINGS = 5

/** How many recent titles the model is asked not to write again. */
const RECENT_TITLES = 3

/** How long an offered plot can still be picked, on any of the family's devices. */
const PLOT_LIFETIME = '7 days'

/**
 * @param {{
 *   db: Db,
 *   llm: Llm | null,
 *   families: FamiliesService,
 *   audit: StoryAudit,
 *   model?: string,
 *   random?: () => number,
 *   now?: () => Date,
 * }} deps
 *   `llm` may be null: a plot's story that was already written still replays
 *   without one. `model` is the model's name, for the audit. `random` drives
 *   the casting draw and `now` fixes the moment a story is written for, so a
 *   test can pin both.
 */
export function createGeneratedStories({ db, llm, families, audit, model = '', random = Math.random, now = () => new Date() }) {
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
     * The model's plot options for the family: one call for the two
     * castings the code drew, read as it streams, so each plot is saved and
     * sent on as soon as the model closes its braces instead of when the
     * whole answer lands. An answer with no readable plot at all is asked
     * once more before the family hears that the model failed.
     * Plots stay pickable for a week, so options still on another device's
     * screen can be opened; older ones are deleted here.
     * @param {Profile} profile
     * @param {string} familyId
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<OptionEvent, void, void>}
     */
    async *options(profile, familyId, { signal } = {}) {
      await db
        .delete(storyPlots)
        .where(and(eq(storyPlots.familyId, familyId), lt(storyPlots.createdAt, sql`now() - ${PLOT_LIFETIME}::interval`)))
      const mood = moodAt(now())
      const { band } = anchorOf(profile)
      const latest = await db
        .select({ title: stories.title, casting: stories.casting })
        .from(stories)
        .where(eq(stories.familyId, familyId))
        .orderBy(desc(stories.createdAt))
        .limit(12)
      const titles = latest.slice(0, RECENT_TITLES).map((row) => `«${row.title}»`)
      const avoid = titles.length > 0 ? `Títulos ya usados, para no repetir: ${titles.join(', ')}.` : ''
      const recent = /** @type {(Casting | null)[]} */ (latest.slice(0, RECENT_CASTINGS).map((row) => row.casting))
      const castings = castScreen(profile, { weights: DEFAULT_WEIGHTS, random, recent })

      const lines = familyLines(profile, castings)
      const user = render(storyOptionsPrompt, {
        moment: momentOf(mood),
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        castings: castings.map((casting, index) => `Trama ${index + 1}: ${castingLines(casting, profile)}`).join('\n'),
        minutes: String(band.minutes[1]),
        count: String(OPTIONS),
        avoid,
      })
      const system = systemPrompt({ band: band.id, mood })
      const kidIds = kidIdsOf(profile)

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const parser = new OptionsParser()
        const started = Date.now()
        let msFirstToken = null
        let sent = 0
        // The audit row of an option waits for the next one, so the last one
        // can carry how long the whole answer took.
        let pending = null
        /** @param {object} [extra] */
        const flush = async (extra = {}) => {
          if (!pending) return
          const row = pending
          pending = null
          await audit.record('offered', { ...row, details: { ...row.details, ...extra } })
        }

        for await (const chunk of /** @type {Llm} */ (llm).stream({ system, user, maxTokens: OPTION_TOKENS, reasoning: false, signal })) {
          msFirstToken ??= Date.now() - started
          for (const answer of parser.push(chunk)) {
            if (sent >= OPTIONS) break
            const plot = toPlot(answer, band)
            if (!plot) continue
            const casting = castings[sent]
            const id = randomUUID()
            await db.insert(storyPlots).values({ ...plot, id, familyId, mood, kidIds, casting })
            sent += 1
            await flush()
            pending = {
              familyId,
              kidIds,
              band: band.id,
              mood,
              plotId: id,
              casting,
              details: { attempt, model, msFirstToken, ms: Date.now() - started, wildcard: casting.kind === 'wildcard' },
            }
            yield { type: /** @type {const} */ ('option'), option: { id, title: plot.title, teaser: plot.teaser, minutes: plot.minutes } }
          }
        }
        await flush({ msTotal: Date.now() - started })
        if (sent > 0) {
          yield { type: /** @type {const} */ ('done') }
          return
        }
        // An answer with no readable plot is asked once more.
      }
      throw new UpstreamError('The story model proposed no readable options')
    },

    /**
     * A plot the family chose, coming out of the model paragraph by
     * paragraph, then once more as the whole saved story. It stars the
     * casting the plot was drawn for. A reader who leaves early hears no more
     * and nothing is saved.
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
          casting: storyPlots.casting,
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
      const { band } = anchorOf(profile)
      const casting = /** @type {Casting} */ (plot.casting ?? castEveryone(profile))
      const lines = familyLines(profile, [casting])
      const user = render(storyPrompt, {
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        casting: castingLines(casting, profile),
        minutes: String(plot.minutes),
        title: plot.title,
        premise: plot.premise,
      })
      const kidIds = kidIdsOf(profile)
      await audit.record('picked', { familyId, kidIds, band: band.id, mood: plot.mood, plotId, casting, details: { model } })

      const kept = nothingKept()
      try {
        const call = {
          llm: /** @type {Llm} */ (llm),
          system: systemPrompt({ band: band.id, mood: plot.mood }),
          user,
          maxTokens: tokensFor(band),
          signal,
        }
        yield* tellStory(call, kept)
      } catch (error) {
        if (signal?.aborted) return
        throw error
      }

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(kept.paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      await db
        .insert(stories)
        .values({
          familyId,
          plotId,
          kidIds,
          source: 'generated',
          title: plot.title,
          teaser: plot.teaser,
          minutes: plot.minutes,
          parts,
          casting,
        })
        .onConflictDoNothing({ target: [stories.familyId, stories.plotId], where: sql`${stories.plotId} is not null` })
      const story = await findWritten(familyId, plotId)
      if (!story) throw new UpstreamError('The story did not save')

      await audit.record('written', {
        familyId,
        kidIds,
        band: band.id,
        mood: plot.mood,
        plotId,
        casting,
        details: writtenDetails({ model, band, parts, kept }),
      })
      yield { type: 'story', story }
    },

    /**
     * A story about one of the family's interests, which the parent tapped
     * instead of picking one of the options (JUG-140). There is no plot:
     * code draws the casting with that interest as the theme, and the model
     * invents the story and its title in one call. Every tap writes a new
     * story; nothing is deduplicated. A reader who leaves early hears no more
     * and nothing is saved.
     * @param {string} familyId
     * @param {Profile} profile the kids playing
     * @param {string} keyword one of the family's interests, as they typed it
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<StoryEvent, void, void>}
     */
    async *writeKeyword(familyId, profile, keyword, { signal } = {}) {
      const mood = moodAt(now())
      const { band } = anchorOf(profile)
      const casting = castKeyword(profile, { keyword, random })
      const kidIds = kidIdsOf(profile)
      await audit.record('picked', { familyId, kidIds, band: band.id, mood, keyword, casting, details: { model } })

      const lines = familyLines(profile, [casting])
      const user = render(keywordStory, {
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        casting: castingLines(casting, profile),
        minutes: String(band.minutes[1]),
        keyword,
      })
      const kept = nothingKept()
      try {
        const call = {
          llm: /** @type {Llm} */ (llm),
          system: systemPrompt({ band: band.id, mood }),
          user,
          maxTokens: tokensFor(band),
          signal,
          fallbackTitle: `Un cuento de ${keyword}.`,
        }
        yield* tellStory(call, kept)
      } catch (error) {
        if (signal?.aborted) return
        throw error
      }

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(kept.paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      const [saved] = await db
        .insert(stories)
        .values({
          familyId,
          kidIds,
          source: 'generated',
          title: kept.title,
          teaser: `Un cuento sobre ${keyword}.`,
          minutes: band.minutes[1],
          parts,
          casting,
          keyword,
        })
        .returning(storyColumns)

      await audit.record('written', {
        familyId,
        kidIds,
        band: band.id,
        mood,
        keyword,
        casting,
        details: writtenDetails({ model, band, parts, kept }),
      })
      yield { type: 'story', story: toStory(saved) }
    },

    /**
     * The story the parent asked for in a voice note (JUG-156), once they saw
     * the request and said yes. Like a keyword story it has no plot: the model
     * writes the story and its title in one call, from the request, which goes
     * in as the family's data. The casting is the request's, not a draw, and
     * the teaser is the request's own summary. Every request writes a new
     * story. A reader who leaves early hears no more and nothing is saved.
     * @param {string} familyId
     * @param {Profile} profile the kids the story is for
     * @param {StoryRequest} request
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<StoryEvent, void, void>}
     */
    async *writeRequest(familyId, profile, request, { signal } = {}) {
      const mood = moodAt(now())
      const { band } = anchorOf(profile)
      const casting = castRequest(profile, request)
      const kidIds = kidIdsOf(profile)
      await audit.record('picked', { familyId, kidIds, band: band.id, mood, casting, details: { model } })

      const lines = familyLines(profile, [casting])
      const user = render(requestedStory, {
        kids: lines.kids,
        pet: lines.pet,
        toys: lines.toys,
        interests: lines.interests,
        casting: castingLines(casting, profile),
        minutes: String(band.minutes[1]),
      })
      const kept = nothingKept()
      try {
        const call = {
          llm: /** @type {Llm} */ (llm),
          system: systemPrompt({ band: band.id, mood }),
          user,
          data: requestLines(request),
          maxTokens: tokensFor(band),
          signal,
          // Voice pass pending.
          fallbackTitle: 'El cuento que pedimos.',
        }
        yield* tellStory(call, kept)
      } catch (error) {
        if (signal?.aborted) return
        throw error
      }

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(kept.paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      const [saved] = await db
        .insert(stories)
        .values({
          familyId,
          kidIds,
          source: 'generated',
          title: kept.title,
          teaser: request.summary,
          minutes: band.minutes[1],
          parts,
          casting,
        })
        .returning(storyColumns)

      await audit.record('written', {
        familyId,
        kidIds,
        band: band.id,
        mood,
        casting,
        details: writtenDetails({ model, band, parts, kept }),
      })
      yield { type: 'story', story: toStory(saved) }
    },
  }
}
