import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { savedStories, savedStory, storyOptions } from '../../../api'
import { TertiaryButton } from '../../../shared/ui/Buttons'
import { Card, MetaLabel, Skeleton } from '../../../shared/ui/Card'
import { Body, Footer, Header, Screen } from '../../../shared/ui/Screen'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { failureText } from '../../../shared/format'
import { useStored } from '../../../shared/store'
import { StatusLine } from '../../../shared/ui/StatusLine'

/** @typedef {import('../../../api/types').SavedStorySummary} SavedStorySummary */

export const Route = createFileRoute('/cuentos')({
  component: StoryOptionsScreen,
})

/**
 * 2r, and the family's own shelf of already-written stories below it. Three
 * plots of equal weight: the app suggests, it doesn't recommend. Reading
 * time is always the last line, because it decides things at 8 pm. No cover
 * art, no illustration, no mascot. The library is offscreen content, so its
 * fetch may come and go quietly — the options are the story.
 */
function StoryOptionsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const online = useOnline()
  const options = useStored('storyOptions')
  const stories = useStored('stories')
  const [loading, setLoading] = useState(!options)
  const [library, setLibrary] = useState(/** @type {SavedStorySummary[] | null} */ (null))
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  const started = useRef(false)

  /** @param {string[]} exclude */
  const load = async (exclude) => {
    setNotice(null)
    setLoading(true)
    try {
      await storyOptions({ exclude })
    } catch (error) {
      setNotice(failureText(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Hora del cuento · Juguemos'
    if (options || started.current) return
    started.current = true
    void load([])
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
        {loading
          ? [0, 1, 2].map((index) => <OptionSkeleton key={index} />)
          : options?.map((option) => (
              <Card key={option.id} className="story-option" onClick={() => pick(option.id)}>
                <span className="story-option__title">{option.title}</span>
                <span className="story-option__teaser">{option.teaser}</span>
                <MetaLabel as="span" className="story-option__time">
                  {option.minutes} min
                </MetaLabel>
              </Card>
            ))}
        <StatusLine role="alert">{notice}</StatusLine>
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
          {options ? 'Otras opciones' : 'Probar de nuevo'}
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}

function OptionSkeleton() {
  return (
    <div className="card story-option story-option--skeleton" aria-hidden="true">
      <Skeleton width="86%" height={20} />
      <Skeleton width="64%" height={14} />
      <Skeleton width={42} height={11} />
    </div>
  )
}
