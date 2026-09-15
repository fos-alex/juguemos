import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { savedStories, savedStory, storyOptions } from '../api'
import { OptionSkeleton } from '../components/OptionSkeleton'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useStored } from '../../../shared/store'
import { Body, Card, Chips, Footer, Header, MetaLabel, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').SavedStorySummary} SavedStorySummary */

/** How many options a screen holds, which is how many skeletons it starts with. */
const OPTIONS = 3

/**
 * 2r, with the family's own interests under the three plots (JUG-140) and
 * their shelf of already-written stories below those. Three plots of equal
 * weight: the app suggests, it doesn't recommend. Reading time is always the
 * last line, because it decides things at 8 pm. No cover art, no
 * illustration, no mascot. The library is offscreen content, so its fetch may
 * come and go quietly — the options are the story.
 *
 * The options arrive one at a time, so a card takes its skeleton's place as
 * soon as the model has written it, and a card that is there can be tapped
 * while the others are still coming.
 */
export function StoryOptionsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const online = useOnline()
  const options = useStored('storyOptions')
  const stories = useStored('stories')
  const interests = useStored('family')?.interests ?? []
  const arrived = options?.length ?? 0
  const [loading, setLoading] = useState(arrived === 0)
  const [library, setLibrary] = useState(/** @type {SavedStorySummary[] | null} */ (null))
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  // The stream in flight, so asking for others, or leaving, stops the old one
  // instead of letting two of them write options over each other.
  const asking = useRef(/** @type {AbortController | null} */ (null))

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
      setLibrary(null)
      return
    }
    savedStories()
      .then(setLibrary)
      .catch(() => setLibrary(null))
  }, [online])

  /** @param {string} id */
  const pick = (id) => {
    if (!online && !stories?.[id]) {
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
  const openLibraryStory = async (saved) => {
    if (!online && !stories?.[saved.id]) {
      setNotice('Estás sin conexión.')
      return
    }
    if (!stories?.[saved.id]) {
      await savedStory(saved.id).catch(() => {})
    }
    void navigate({ to: '/cuento/$id', params: { id: saved.id } })
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
        {loading &&
          Array.from({ length: Math.max(OPTIONS - arrived, 0) }, (_, index) => <OptionSkeleton key={`skeleton-${index}`} />)}
        <StatusLine role="alert">{notice}</StatusLine>
        {interests.length > 0 && (
          <section className="story-keywords">
            {/* Voice pass pending: "Un cuento de…". */}
            <h2 className="story-keywords__heading">Un cuento de…</h2>
            <Chips>
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`chip story-keyword${online && !loading ? '' : ' is-unavailable'}`}
                  aria-disabled={!online || loading || undefined}
                  onClick={() => pickKeyword(interest)}
                >
                  {interest}
                </button>
              ))}
            </Chips>
          </section>
        )}
        {library && library.length > 0 && (
          <section className="story-library">
            {/* Voice pass pending: "Para volver a leer". */}
            <h2 className="story-library__heading">Para volver a leer</h2>
            {library.map((saved) => (
              <Card key={saved.id} className="story-option" onClick={() => void openLibraryStory(saved)}>
                <span className="story-option__title">{saved.title}</span>
                <MetaLabel as="span" className="story-option__time">
                  {saved.minutes} min
                </MetaLabel>
              </Card>
            ))}
          </section>
        )}
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
