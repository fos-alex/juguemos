/**
 * Story series (JUG-59): a story the family liked, kept going. The story they
 * chose becomes the first episode, and from then on each episode continues the
 * ones before it, with the same casting and the same storyline. Those two are
 * fixed when the series starts and no episode changes them, which is what
 * keeps a series recognisable however long it grows; what does grow is its
 * setting and the characters the model invents along the way, which the series
 * remembers so a later episode can bring them back.
 *
 * The second episode is the call that makes the series: it is written from the
 * whole first episode and, in the same answer, names the series, says where it
 * happens, and sums the first episode up. Every episode after that is written
 * from what the series already knows, so the prompt stays the same length
 * whether it is the third episode or the tenth.
 *
 * A series is written only by the model: a server with no LLM can't start one.
 */
import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import { moodAt } from '../clock.js'
import { ConflictError, NotFoundError, UnavailableError, UpstreamError } from '../errors.js'
import { kidIdsOf, withKids } from '../families/families.service.js'
import { render } from '../llm/prompt.js'
import { castEveryone, castingLines } from './casting.js'
import { systemPrompt } from './prompts/compose.js'
import { nextEpisode, secondEpisode } from './prompts/series.js'
import { storyColumns, toStory } from './shared.js'
import { stories, storyPlots, storySeries } from './stories.schema.js'
import {
  anchorOf,
  charactersIn,
  episodeLines,
  familyLines,
  mergeCharacters,
  partsOf,
  seriesLines,
  seriesTitleFor,
} from './storytelling.js'
import { nothingKept, tellStory, tokensFor, writtenDetails } from './tell.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../llm/client.js').Llm} Llm */
/** @typedef {import('./casting.js').Casting} Casting */
/** @typedef {import('./stories.service.js').StoryEvent} StoryEvent */
/** @typedef {import('./story-audit.js').StoryAudit} StoryAudit */
/** @typedef {import('./storytelling.js').SeriesCharacter} SeriesCharacter */
/** @typedef {ReturnType<typeof createStorySeries>} StorySeries */

/** One episode, as the series screen lists it. @typedef {{ id: string, title: string, minutes: number, episode: number, createdAt: string }} Episode */
/**
 * @typedef {object} Series a family's series, with its episodes in order
 * @property {string} id
 * @property {string} title
 * @property {string} storyline what the series is about, in the family's own terms
 * @property {Episode[]} episodes
 * @property {number} maxEpisodes how many episodes this series holds in all
 * @property {string} createdAt
 */

/** The columns a series is read with. */
const seriesColumns = {
  id: storySeries.id,
  title: storySeries.title,
  storyline: storySeries.storyline,
  setting: storySeries.setting,
  characters: storySeries.characters,
  casting: storySeries.casting,
  kidIds: storySeries.kidIds,
  createdAt: storySeries.createdAt,
}

/** The columns an episode is listed with. */
const episodeColumns = {
  id: stories.id,
  seriesId: stories.seriesId,
  title: stories.title,
  teaser: stories.teaser,
  minutes: stories.minutes,
  episode: stories.episode,
  summary: stories.summary,
  parts: stories.parts,
  createdAt: stories.createdAt,
}

/**
 * @param {{
 *   db: Db,
 *   llm: Llm | null,
 *   families: FamiliesService,
 *   audit: StoryAudit,
 *   model?: string,
 *   maxEpisodes: number,
 *   now?: () => Date,
 * }} deps `llm` absent means no series can be started or continued; `maxEpisodes`
 *   is how long a series may grow, which config.js reads from the environment.
 */
export function createStorySeries({ db, llm, families, audit, model = '', maxEpisodes, now = () => new Date() }) {
  /** One of the family's series, unless they stopped following it. @param {string} familyId @param {string} id */
  const liveSeries = async (familyId, id) => {
    const [series] = await db
      .select(seriesColumns)
      .from(storySeries)
      .where(and(eq(storySeries.id, id), eq(storySeries.familyId, familyId), isNull(storySeries.removedAt)))
    return series ?? null
  }

  /** Every episode of a series, in order. @param {string} id */
  const episodesOf = (id) => db.select(episodeColumns).from(stories).where(eq(stories.seriesId, id)).orderBy(asc(stories.episode))

  /** An episode as the web lists it. @param {typeof episodeColumns & Record<string, any>} row */
  const toEpisode = (row) => ({
    id: row.id,
    title: row.title,
    minutes: row.minutes,
    episode: row.episode ?? 1,
    createdAt: row.createdAt.toISOString(),
  })

  /** A series row and its episodes, as the web reads it. @returns {Series} */
  const toSeries = (/** @type {any} */ series, /** @type {any[]} */ episodes) => ({
    id: series.id,
    title: series.title,
    storyline: series.storyline,
    episodes: episodes.map(toEpisode),
    maxEpisodes,
    createdAt: series.createdAt.toISOString(),
  })

  /** The characters a series has collected so far. @param {any} series @returns {SeriesCharacter[]} */
  const charactersOf = (series) => /** @type {SeriesCharacter[]} */ (series.characters ?? [])

  /**
   * What the series is about, taken from the story it starts with: the plot's
   * own premise when it had one, since it says how the story ends too, and the
   * teaser otherwise.
   * @param {{ teaser: string, plotId: string | null }} story
   */
  const storylineOf = async (story) => {
    if (!story.plotId) return story.teaser
    const [plot] = await db.select({ premise: storyPlots.premise }).from(storyPlots).where(eq(storyPlots.id, story.plotId))
    return plot?.premise || story.teaser
  }

  /** A saved episode as the model is given it back: its parts, one paragraph a line. @param {any} row */
  const textOf = (row) => /** @type {string[][]} */ (row.parts).map((part) => part.join('\n')).join('\n\n')

  return {
    /**
     * Turns a story the family has read into the first episode of a series.
     * Nothing is written yet and no model is called: the series starts with
     * the story's own title and what it was about, and the second episode is
     * where it gets a name of its own.
     * @param {string} familyId
     * @param {string} storyId
     * @returns {Promise<Series>}
     */
    async fromStory(familyId, storyId) {
      if (!llm) throw new UnavailableError('No LLM is configured to write a story', 'LLM_OFF')
      const [story] = await db
        .select({
          id: stories.id,
          title: stories.title,
          teaser: stories.teaser,
          plotId: stories.plotId,
          casting: stories.casting,
          kidIds: stories.kidIds,
          seriesId: stories.seriesId,
        })
        .from(stories)
        .where(and(eq(stories.familyId, familyId), eq(stories.id, storyId)))
      if (!story) throw new NotFoundError('No such story')
      if (story.seriesId && (await liveSeries(familyId, story.seriesId))) {
        throw new ConflictError('That story is already an episode of a series', 'ALREADY_IN_SERIES')
      }

      const profile = withKids(await families.profileOf(familyId), story.kidIds)
      const casting = story.casting ?? castEveryone(profile)
      const storyline = await storylineOf(story)

      const series = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(storySeries)
          .values({ familyId, title: story.title, storyline, casting, kidIds: story.kidIds })
          .returning(seriesColumns)
        await tx.update(stories).set({ seriesId: row.id, episode: 1 }).where(eq(stories.id, story.id))
        return row
      })
      return toSeries(series, await episodesOf(series.id))
    },

    /**
     * The family's series, newest first, each with its episodes in order.
     * A series they stopped following is in none of them.
     * @param {string} familyId
     * @returns {Promise<Series[]>}
     */
    async list(familyId) {
      const rows = await db
        .select(seriesColumns)
        .from(storySeries)
        .where(and(eq(storySeries.familyId, familyId), isNull(storySeries.removedAt)))
        .orderBy(desc(storySeries.createdAt), desc(storySeries.id))
      if (rows.length === 0) return []
      const episodes = await db
        .select(episodeColumns)
        .from(stories)
        .where(inArray(stories.seriesId, rows.map((series) => series.id)))
        .orderBy(asc(stories.episode))
      return rows.map((series) => toSeries(series, episodes.filter((episode) => episode.seriesId === series.id)))
    },

    /**
     * One series of the family's, with its episodes in order.
     * @param {string} familyId
     * @param {string} id
     * @returns {Promise<Series>}
     */
    async find(familyId, id) {
      const series = await liveSeries(familyId, id)
      if (!series) throw new NotFoundError('No such series')
      return toSeries(series, await episodesOf(series.id))
    },

    /**
     * The family stops following a series: it shows up nowhere from now on,
     * and its episodes go back to the library as the stories they are. Nothing
     * written is deleted, so every one of them still reads.
     * @param {string} familyId
     * @param {string} id
     */
    async remove(familyId, id) {
      const [removed] = await db
        .update(storySeries)
        .set({ removedAt: now() })
        .where(and(eq(storySeries.id, id), eq(storySeries.familyId, familyId), isNull(storySeries.removedAt)))
        .returning({ id: storySeries.id })
      if (!removed) throw new NotFoundError('No such series')
    },

    /**
     * The next episode of a series, coming out of the model paragraph by
     * paragraph like any other story, then once more as the whole saved
     * story. The second episode also names the series, so it stops being
     * called after its first episode. A reader who leaves early hears no more
     * and nothing is saved.
     * @param {string} familyId
     * @param {string} id
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {AsyncGenerator<StoryEvent, void, void>}
     */
    async *writeEpisode(familyId, id, { signal } = {}) {
      const series = await liveSeries(familyId, id)
      if (!series) throw new NotFoundError('No such series')
      if (!llm) throw new UnavailableError('No LLM is configured to write a story', 'LLM_OFF')
      const episodes = await episodesOf(id)
      const number = episodes.length + 1
      if (number > maxEpisodes) throw new ConflictError('This series already has every episode it holds', 'SERIES_FULL')

      const profile = withKids(await families.profileOf(familyId), series.kidIds)
      const { band } = anchorOf(profile)
      const mood = moodAt(now())
      const casting = /** @type {Casting} */ (series.casting ?? castEveryone(profile))
      const characters = charactersOf(series)
      const minutes = band.minutes[1]
      const lines = familyLines(profile, [casting])
      const common = { ...lines, casting: castingLines(casting, profile), minutes: String(minutes) }

      const user =
        number === 2
          ? render(secondEpisode, {
              ...common,
              storyline: series.storyline,
              first: episodes[0].title,
              firstText: textOf(episodes[0]),
            })
          : render(nextEpisode, {
              ...common,
              number: String(number),
              series: seriesLines({ ...series, characters }),
              episodes: episodeLines(
                episodes.map((episode) => ({
                  episode: episode.episode ?? 1,
                  title: episode.title,
                  summary: episode.summary ?? '',
                })),
              ),
            })

      const kidIds = kidIdsOf(profile)
      const seriesDetails = { model, series: id, episode: number }
      await audit.record('picked', { familyId, kidIds, band: band.id, mood, casting, details: seriesDetails })

      const kept = nothingKept()
      try {
        yield* tellStory(
          {
            llm,
            system: systemPrompt({ band: band.id, mood }),
            user,
            maxTokens: tokensFor(band),
            signal,
            fallbackTitle: `Otro día de ${casting.lead.name}.`,
          },
          kept,
        )
      } catch (error) {
        if (signal?.aborted) return
        throw error
      }

      // The reader may have left after the last paragraph was read out.
      if (signal?.aborted) return
      const parts = partsOf(kept.paragraphs)
      if (!parts) throw new UpstreamError('The story model wrote nothing readable')

      // The second episode is where the series stops being called after its
      // first one. A model that didn't name it, or named it the same, leaves
      // the naming to us.
      const named = (kept.fields.series ?? '').trim()
      const title =
        number === 2 && (named === '' || named === episodes[0].title.trim()) ? seriesTitleFor(casting) : named || series.title

      const saved = await db.transaction(async (tx) => {
        // Which episode this is is settled here, not when the writing started:
        // two episodes written at the same time are both kept, in the order
        // they land. The series is locked while that happens, so no two of
        // them land on the same number.
        await tx.select({ id: storySeries.id }).from(storySeries).where(eq(storySeries.id, id)).for('update')
        const [last] = await tx.select({ latest: max(stories.episode) }).from(stories).where(eq(stories.seriesId, id))
        const settled = (last?.latest ?? 0) + 1
        const [row] = await tx
          .insert(stories)
          .values({
            familyId,
            kidIds,
            source: 'generated',
            title: kept.title,
            // Titles end in a full stop, which would double up inside the quotes.
            teaser: `Un episodio de «${title.replace(/\.$/, '')}».`,
            minutes,
            parts,
            sounds: kept.sounds,
            casting,
            seriesId: id,
            episode: settled,
            summary: (kept.fields.summary ?? '').trim() || null,
          })
          .returning(storyColumns)
        await tx
          .update(storySeries)
          .set({
            characters: mergeCharacters(characters, charactersIn(kept.fields.characters ?? '')),
            ...(number === 2
              ? { title, ...((kept.fields.setting ?? '').trim() ? { setting: kept.fields.setting.trim() } : {}) }
              : {}),
          })
          .where(eq(storySeries.id, id))
        // What happened in the first episode, which nobody asked the model for
        // until the series existed.
        const before = (kept.fields.before ?? '').trim()
        if (number === 2 && before) await tx.update(stories).set({ summary: before }).where(eq(stories.id, episodes[0].id))
        return { row, episode: settled }
      })

      await audit.record('written', {
        familyId,
        kidIds,
        band: band.id,
        mood,
        casting,
        details: { ...writtenDetails({ model, band, parts, kept }), ...seriesDetails, episode: saved.episode },
      })
      yield { type: 'story', story: toStory(saved.row, { id, title, episode: saved.episode }) }
    },
  }
}
