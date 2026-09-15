/**
 * Stories the LLM writes (JUG-71). Code draws a casting for each option on
 * the screen (`casting.js`) and hands the three of them to one model call,
 * whose answer is read as it streams: each plot is saved and sent on as soon
 * as the model finishes writing it, so the first option is on screen long
 * before the third (JUG-139). The chosen plot becomes a story that arrives
 * paragraph by paragraph the same way, saved once it ends and read again
 * from what was saved. Every step writes a row in the story audit.
 */
import { randomUUID } from 'node:crypto'
import { and, desc, eq, notInArray, sql } from 'drizzle-orm'
import { NotFoundError, UpstreamError } from '../errors.js'
import { kidIdsOf, withKids } from '../families/families.service.js'
import { render } from '../llm/prompt.js'
import { castingLines, castScreen, DEFAULT_WEIGHTS } from './casting.js'
import { OPTIONS, replayEvents, storyColumns, tick, toStory } from './shared.js'
import { stories, storyPlots } from './stories.schema.js'
import storyOptionsPrompt from './prompts/story-options.js'
import storyPrompt from './prompts/story.js'
import { systemPrompt } from './prompts/compose.js'
import { anchorOf, familyLines, moodAt, momentOf, OptionsParser, partsOf, StoryParser, toPlot, wordsIn } from './storytelling.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../llm/client.js').Llm} Llm */
/** @typedef {import('./casting.js').Casting} Casting */
/** @typedef {import('./story-audit.js').StoryAudit} StoryAudit */
/** @typedef {import('./storytelling.js').Band} Band */
/** @typedef {import('./stories.service.js').Story} Story */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {import('./stories.service.js').StoryOption} StoryOption */
/**
 * @typedef {{ type: 'option', option: StoryOption } | { type: 'done' }} OptionEvent
 *   what an options screen sends: one option as each lands, then the end
 */

/** The most the three options together may run to: each is a title, a line, and two sentences. */
const OPTION_TOKENS = 1200

/** How many tokens a word of story is worth, generously, so no story is cut off mid-sentence. */
const TOKENS_PER_WORD = 3

/** How many of the family's last stories the casting draw avoids repeating. */
const RECENT_CASTINGS = 5

/** How many recent titles the model is asked not to write again. */
const RECENT_TITLES = 3

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
     * The model's plot options for the family: one call for the three
     * castings the code drew, read as it streams, so each plot is saved and
     * sent on as soon as the model closes its braces instead of when the
     * whole answer lands. An answer with no readable plot at all is asked
     * once more before the family hears that the model failed.
     * @param {Profile} profile
     * @param {string} familyId
     * @param {string[]} exclude the plots already on screen, which stay pickable
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<OptionEvent, void, void>}
     */
    async *options(profile, familyId, exclude, { signal } = {}) {
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
      const castings = castScreen(profile, { count: OPTIONS, weights: DEFAULT_WEIGHTS, random, recent })

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
            const row = { ...plot, id, familyId, mood, kidIds, casting }
            if (sent === 0) {
              // The plots on screen stay pickable; the rest retire, in the
              // same transaction as the first new one, so a family is never
              // left with no plots at all.
              const stale =
                exclude.length > 0
                  ? and(eq(storyPlots.familyId, familyId), notInArray(storyPlots.id, exclude))
                  : eq(storyPlots.familyId, familyId)
              await db.transaction(async (tx) => {
                await tx.delete(storyPlots).where(stale)
                await tx.insert(storyPlots).values(row)
              })
            } else {
              await db.insert(storyPlots).values(row)
            }
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
      const casting = /** @type {Casting} */ (plot.casting ?? castingOfEveryone(profile))
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

      const parser = new StoryParser()
      const paragraphs = []
      const started = Date.now()
      let msFirstToken = null
      try {
        const call = {
          system: systemPrompt({ band: band.id, mood: plot.mood }),
          user,
          maxTokens: band.words[1] * TOKENS_PER_WORD,
          reasoning: false,
          signal,
        }
        for await (const chunk of /** @type {Llm} */ (llm).stream(call)) {
          msFirstToken ??= Date.now() - started
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
      const msTotal = Date.now() - started

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(paragraphs)
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

      const words = wordsIn(parts)
      await audit.record('written', {
        familyId,
        kidIds,
        band: band.id,
        mood: plot.mood,
        plotId,
        casting,
        details: {
          model,
          msFirstToken: msFirstToken ?? msTotal,
          msTotal,
          words,
          parts: parts.length,
          paragraphs: paragraphs.length,
          wordsMin: band.words[0],
          wordsMax: band.words[1],
          insideBand: words >= band.words[0] && words <= band.words[1],
        },
      })
      yield { type: 'story', story }
    },
  }
}

/**
 * The casting of a plot drawn before castings existed: the whole family, so
 * an old plot still writes the story it promised.
 * @param {Profile} profile
 * @returns {Casting}
 */
function castingOfEveryone(profile) {
  const lead = profile.kids[0]
  return {
    kind: 'cast',
    anchorIn: true,
    lead: lead ? { type: 'kid', id: lead.id, name: lead.name } : { type: 'new', id: null, name: 'un personaje nuevo' },
    kids: profile.kids.map((kid) => kid.id),
    pet: profile.pets[0] ? { id: profile.pets[0].id, name: profile.pets[0].name } : null,
    toy: profile.toys[0] ? { id: profile.toys[0].id, name: profile.toys[0].name } : null,
    theme: profile.interests[0] ?? null,
    draws: { anchorIn: null, anchorLead: null, petIn: null, toyIn: null, themeIn: null, wildcard: null },
    weights: DEFAULT_WEIGHTS,
  }
}
