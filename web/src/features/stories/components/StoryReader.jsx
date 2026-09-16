import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { playingAgeMonths } from '../../family'
import { savedStory, writeEpisode, writeKeywordStory, writeStory } from '../api'
import { StoryProgress } from './StoryProgress'
import { StorySkeleton } from './StorySkeleton'
import { StoryText } from './StoryText'
import { groupByPart, waitingVariant } from '../model'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useSlowWait } from '../../../shared/hooks/useSlowWait'
import { useWakeLock } from '../../../shared/hooks/useWakeLock'
import { read, useStored } from '../../../shared/store'
import {
  Body,
  Dots,
  Footer,
  Header,
  MetaLabel,
  Screen,
  Skeleton,
  StatusLine,
  TertiaryButton,
  ThemeToggle,
  Waiting,
} from '../../../shared/ui'
import '../stories.css'

/**
 * 2s then 2t, for every way into a story: one the family picked from the
 * options or from their shelf, one written now because they tapped an interest
 * (JUG-140), and the next episode of a series (JUG-59). The last two have no
 * id until the API saves them, so they arrive with a title of their own and
 * then take the URL of the story they were saved as. The page fills itself:
 * the title is set and the text arrives over placeholder lines at story
 * measure, so nothing reflows. The screen stays awake from the first moment.
 * The bar marks position in the story, never achievement. Night mode is one
 * tap away in the footer, under the thumb.
 *
 * A story can take a couple of minutes to start, so until its first paragraph
 * arrives the waiting animation takes the dots' place in the footer (JUG-132),
 * held back so it doesn't brighten a dim room, and one line says what is
 * happening once the wait is long. It goes the moment there are words, and
 * the story itself is never illustrated.
 * @param {{ id?: string, keyword?: string, seriesId?: string }} props one of the
 *   three: the story to read, the interest to write one about, or the series to
 *   write the next episode of
 */
export function StoryReader({ id: picked, keyword, seriesId }) {
  const navigate = useNavigate()
  const awake = useWakeLock()
  // A story written now has no id until the API saves it; from then on it is read like any other.
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null))
  const id = picked ?? savedId
  const story = useStored('stories')?.[id ?? '']
  const option = useStored('storyOptions')?.find((candidate) => candidate.id === id)
  const family = useStored('family')
  const inSeries = story?.series ?? null
  // Back from an episode is the series it belongs to, when there is nowhere to go back to.
  const goBack = useGoBack(inSeries ? '/serie/$id' : '/cuentos', inSeries ? { id: inSeries.id } : undefined)
  const [written, setWritten] = useState(/** @type {string | null} */ (null))
  const [paragraphs, setParagraphs] = useState(/** @type {{ part: number, text: string }[]} */ ([]))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [attempt, setAttempt] = useState(0)
  // An id that is neither an option nor an already-read story may still be a
  // saved story opened by its own id; wait for that answer before leaving.
  const [looking, setLooking] = useState(!story && !option)
  // Nothing to read yet. Once a paragraph lands, reading starts and the
  // animation gives way to it, whether or not the rest has arrived.
  const writing = !story && !failure && paragraphs.length === 0
  const slow = useSlowWait(writing)

  useEffect(() => {
    if (picked && read('stories')?.[picked]) return
    const controller = new AbortController()
    setParagraphs([])
    setFailure(null)
    setLooking(true)
    /** @param {{ part: number, text: string }} paragraph */
    const onParagraph = (paragraph) => setParagraphs((list) => [...list, paragraph])
    const handlers = { signal: controller.signal, onTitle: setWritten, onParagraph }

    // A story nobody has written yet: it is named by the model, and gets an id
    // of its own once it is saved.
    const unwritten = keyword
      ? writeKeywordStory(keyword, handlers)
      : seriesId
        ? writeEpisode(seriesId, handlers)
        : null
    if (unwritten) {
      unwritten
        .then((saved) => {
          // The story now has an id of its own, so a reload, or coming back to
          // it later, replays what was saved instead of writing another one.
          setSavedId(saved.id)
          void navigate({ to: '/cuento/$id', params: { id: saved.id }, replace: true })
        })
        .catch((error) => {
          if (error.name === 'AbortError') return
          setFailure(failureText(error))
          setLooking(false)
        })
      return () => controller.abort()
    }

    writeStory(/** @type {string} */ (picked), { signal: controller.signal, onParagraph }).catch((error) => {
      // An id that is not an option is a saved story opened by its own id.
      if (error.status === 404) {
        void savedStory(/** @type {string} */ (picked)).catch((savedError) => {
          if (savedError.name !== 'AbortError') {
            setFailure(failureText(savedError))
            setLooking(false)
          }
        })
        return
      }
      if (error.name === 'AbortError') return
      setFailure(failureText(error))
      setLooking(false)
    })
    return () => controller.abort()
  }, [picked, keyword, seriesId, attempt])

  const title = story?.title ?? option?.title ?? written
  const minutes = story?.minutes ?? option?.minutes

  useDocumentTitle(title && `${title} · Juguemos`)

  if (!title && !looking && !failure) return <Navigate to="/cuentos" replace />

  const parts = story ? story.parts : groupByPart(paragraphs)

  return (
    <Screen tone="reading">
      <Header
        onBack={goBack}
        trailing={
          story ? (
            <MetaLabel className="meta--light">
              {minutes} min{awake ? ' · pantalla despierta' : ''}
            </MetaLabel>
          ) : (
            <Skeleton width={56} height={11} />
          )
        }
      />
      <Body className="reading">
        {/* Which series this is an episode of, once the story is whole: while
            an episode is being written the series may still be getting its name. */}
        {inSeries && (
          <MetaLabel className="meta--light story-episode">
            {inSeries.title} · Episodio {inSeries.episode}
          </MetaLabel>
        )}
        {/* A story written from an interest is named by the model, so until
            that lands the heading is a placeholder like the text under it. */}
        {title ? <h1 className="story-title">{title}</h1> : <Skeleton width="70%" height={23} />}
        <StoryText parts={parts} done={Boolean(story)} />
        {!story && !failure && <StorySkeleton paragraphs={paragraphs.length === 0 ? 3 : 2} />}
        <StatusLine role="alert">{failure}</StatusLine>
        {/* Voice pass pending. */}
        {slow && <StatusLine role="status">Sigo escribiéndolo. Ya casi está.</StatusLine>}
      </Body>
      {story ? (
        <StoryProgress id={/** @type {string} */ (id)} total={story.parts.length} />
      ) : (
        <Footer className="reading-footer reading-footer--waiting">
          <ThemeToggle />
          {failure ? (
            <TertiaryButton onClick={() => setAttempt((count) => count + 1)}>Probar de nuevo</TertiaryButton>
          ) : writing ? (
            <Waiting variant={waitingVariant(playingAgeMonths(family))} size="screen" tone="reading" />
          ) : (
            <Dots tone="page" />
          )}
        </Footer>
      )}
    </Screen>
  )
}
