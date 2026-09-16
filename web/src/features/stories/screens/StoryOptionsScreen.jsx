import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { playingAgeMonths, playingInterests } from '../../family'
import { familySeries, makeSeries, savedStories, savedStory, storyOptions } from '../api'
import { KeywordChips } from '../components/KeywordChips'
import { OptionSkeleton } from '../components/OptionSkeleton'
import { SeriesShelf } from '../components/SeriesShelf'
import { StoryShelf } from '../components/StoryShelf'
import { waitingVariant } from '../model'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useSlowWait } from '../../../shared/hooks/useSlowWait'
import { useStored } from '../../../shared/store'
import { Body, Card, Footer, Header, MetaLabel, Screen, StatusLine, TertiaryButton, Waiting } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').SavedStorySummary} SavedStorySummary */
/** @typedef {import('../types').Series} Series */

/** How many options a screen holds, which is how many skeletons it starts with. */
const OPTIONS = 3

/**
 * 2r, the four ways into a story, in the order a parent reaches for them:
 * three fresh plots, the series they are already following (JUG-59), what the
 * kids playing love (JUG-140, JUG-144), and the shelf of stories to read again
 * (JUG-50). Three plots of equal weight: the app suggests, it doesn't
 * recommend. Reading time is always the last line, because it decides things at
 * 8 pm. No cover art, no illustration, no mascot.
 *
 * The options arrive one at a time, so a card takes its skeleton's place as
 * soon as the model has written it, and a card that is there can be tapped
 * while the others are still coming. Until the first one lands there is
 * nothing to hold a place for, so the waiting animation waits there instead
 * (JUG-132), and gives way the moment a card arrives. The series and the shelf are the family's
 * own: the series are kept on the device, so they are there offline, and the
 * shelf is offscreen content whose fetch may come and go quietly.
 */
export function StoryOptionsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const online = useOnline()
  const options = useStored('storyOptions')
  const stories = useStored('stories')
  const series = /** @type {Series[]} */ (useStored('series') ?? [])
  const family = useStored('family')
  // What the kids playing love (JUG-144): a keyword the story is about.
  const interests = playingInterests(family)
  const arrived = options?.length ?? 0
  const [loading, setLoading] = useState(arrived === 0)
  const [shelf, setShelf] = useState(/** @type {SavedStorySummary[] | null} */ (null))
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  // The story whose series is being made, so its row shows the wait.
  const [starting, setStarting] = useState(/** @type {string | null} */ (null))
  // The stream in flight, so asking for others, or leaving, stops the old one
  // instead of letting two of them write options over each other.
  const asking = useRef(/** @type {AbortController | null} */ (null))
  // Nothing to read yet: the animation waits in the three cards' place
  // (JUG-132), and says what it is doing once the wait is long.
  const writing = loading && arrived === 0
  const slow = useSlowWait(writing)

  useDocumentTitle('Hora del cuento · Juguemos')

  /** @param {string[]} exclude */
  const load = async (exclude) => {
    asking.current?.abort()
    const controller = new AbortController()
    asking.current = controller
    setNotice(null)
    setLoading(true)
    try {
      await storyOptions({ exclude, signal: controller.signal })
    } catch (error) {
      if (controller.signal.aborted) return
      setNotice(failureText(error))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  // Asks when there's nothing to show, and leaving stops the request. React's
  // development mode runs this twice, stopping the first request; the second
  // run asks again.
  useEffect(() => {
    if (arrived === 0) void load([])
    return () => asking.current?.abort()
  }, [])

  useEffect(() => {
    if (!online) {
      setShelf(null)
      return
    }
    savedStories()
      .then(setShelf)
      .catch(() => setShelf(null))
    // The series are stored, so a failure here leaves the last ones on screen.
    familySeries().catch(() => {})
  }, [online])

  /** Whether a story this device hasn't kept can be opened at all. @param {string} id */
  const reachable = (id) => online || Boolean(stories?.[id])

  /** @param {string} id */
  const pick = (id) => {
    if (!reachable(id)) {
      setNotice('Estás sin conexión.')
      return
    }
    void navigate({ to: '/cuento/$id', params: { id } })
  }

  /** An interest tapped: its story is written on the reading screen. @param {string} interest */
  const pickKeyword = (interest) => {
    if (!online) {
      setNotice('Estás sin conexión.')
      return
    }
    if (loading) return
    void navigate({ to: '/cuento/tema/$keyword', params: { keyword: interest } })
  }

  /** @param {SavedStorySummary} saved */
  const openStory = async (saved) => {
    if (!reachable(saved.id)) {
      setNotice('Estás sin conexión.')
      return
    }
    if (!stories?.[saved.id]) await savedStory(saved.id).catch(() => {})
    void navigate({ to: '/cuento/$id', params: { id: saved.id } })
  }

  /** A story the family wants more of (JUG-59): it becomes the first episode. @param {SavedStorySummary} saved */
  const startSeries = async (saved) => {
    if (!online) {
      setNotice('Estás sin conexión.')
      return
    }
    setNotice(null)
    setStarting(saved.id)
    try {
      const started = await makeSeries(saved.id)
      setShelf((kept) => kept?.filter((story) => story.id !== saved.id) ?? null)
      void navigate({ to: '/serie/$id', params: { id: started.id } })
    } catch (error) {
      setNotice(failureText(error))
    } finally {
      setStarting(null)
    }
  }

  /** @param {Series} followed */
  const continueSeries = (followed) => {
    if (!online) {
      setNotice('Estás sin conexión.')
      return
    }
    void navigate({ to: '/serie/$id/episodio', params: { id: followed.id } })
  }

  return (
    <Screen>
      <Header onBack={goBack} />
      <div className="page-intro page-intro--after-back">
        <h1 className="page-title">¿Cuál leemos hoy?</h1>
      </div>
      <Body className="story-options">
        {options?.map((option) => (
          <Card key={option.id} className="story-option" onClick={() => pick(option.id)}>
            <span className="story-option__title">{option.title}</span>
            <span className="story-option__teaser">{option.teaser}</span>
            <MetaLabel as="span" className="story-option__time">
              {option.minutes} min
            </MetaLabel>
          </Card>
        ))}
        {writing ? (
          <div className="story-writing">
            <Waiting variant={waitingVariant(playingAgeMonths(family))} size="screen" />
            {/* Voice pass pending. */}
            {slow && <StatusLine role="status">Sigo escribiendo. Ya casi están.</StatusLine>}
          </div>
        ) : (
          loading &&
          Array.from({ length: Math.max(OPTIONS - arrived, 0) }, (_, index) => <OptionSkeleton key={`skeleton-${index}`} />)
        )}
        <StatusLine role="alert">{notice}</StatusLine>
        <SeriesShelf
          series={series}
          onOpen={(followed) => void navigate({ to: '/serie/$id', params: { id: followed.id } })}
          onContinue={continueSeries}
        />
        <KeywordChips interests={interests} unavailable={!online || loading} onPick={pickKeyword} />
        <StoryShelf stories={shelf ?? []} startingId={starting} onOpen={openStory} onStartSeries={startSeries} />
      </Body>
      <Footer>
        {/* Voice pass pending: "Otras opciones". */}
        <TertiaryButton size="lg" disabled={loading} onClick={() => void load(options?.map((option) => option.id) ?? [])}>
          {arrived > 0 ? 'Otras opciones' : 'Probar de nuevo'}
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}
