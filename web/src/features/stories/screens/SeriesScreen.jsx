import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { forgetSeries, savedStory, series as loadSeries } from '../api'
import { RemoveSeries } from '../components/RemoveSeries'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useStored } from '../../../shared/store'
import {
  Body,
  Card,
  Footer,
  Header,
  MetaLabel,
  PrimaryButton,
  Screen,
  Skeleton,
  StatusLine,
} from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').Episode} Episode */
/** @typedef {import('../types').Series} Series */

/**
 * One series and its episodes, in the order they were written (JUG-59, JUG-50).
 * The episodes are a list because that is what a series is; any of them reads
 * again with one tap. The next episode is the primary action, in the thumb
 * zone, and it goes quiet when the series has all the episodes it holds.
 *
 * The device keeps the series it has seen, so this screen opens offline with
 * what it knew, and the API refreshes it underneath.
 */
export function SeriesScreen() {
  const { id } = useParams({ from: '/serie/$id/' })
  const navigate = useNavigate()
  const goBack = useGoBack('/cuentos')
  const online = useOnline()
  const stories = useStored('stories')
  const series = /** @type {Series | undefined} */ ((useStored('series') ?? []).find((each) => each.id === id))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  useDocumentTitle(series && `${series.title} · Ludi`)

  useEffect(() => {
    if (!online) return
    setFailure(null)
    loadSeries(id).catch((error) => setFailure(failureText(error)))
  }, [id, online])

  /** @param {Episode} episode */
  const open = async (episode) => {
    if (!online && !stories?.[episode.id]) {
      setNotice('Estás sin conexión.')
      return
    }
    if (!stories?.[episode.id]) await savedStory(episode.id).catch(() => {})
    void navigate({ to: '/cuento/$id', params: { id: episode.id } })
  }

  const remove = async () => {
    setNotice(null)
    setRemoving(true)
    try {
      await forgetSeries(id)
      void navigate({ to: '/cuentos', replace: true })
    } catch (error) {
      setNotice(failureText(error))
      setRemoving(false)
      setConfirming(false)
    }
  }

  const full = series ? series.episodes.length >= series.maxEpisodes : false

  return (
    <Screen>
      <Header onBack={goBack} />
      <div className="page-intro page-intro--after-back">
        {series ? <h1 className="page-title">{series.title}</h1> : <Skeleton width="70%" height={30} />}
        {series && <p className="page-lede">{series.storyline}</p>}
      </div>
      <Body className="series">
        {series?.episodes.map((episode) => (
          <Card key={episode.id} className="story-option" onClick={() => void open(episode)}>
            <span className="story-option__title">{episode.title}</span>
            <MetaLabel as="span" className="story-option__time">
              Episodio {episode.episode} · {episode.minutes} min
            </MetaLabel>
          </Card>
        ))}
        <StatusLine role="alert">{failure ?? notice}</StatusLine>
        {series && (
          <RemoveSeries
            confirming={confirming}
            removing={removing}
            onAsk={() => setConfirming(true)}
            onCancel={() => setConfirming(false)}
            onRemove={() => void remove()}
          />
        )}
      </Body>
      <Footer>
        {/* Voice pass pending: the last-episode line and "Otro episodio". */}
        {full && <StatusLine>Esta serie ya tiene todos sus episodios.</StatusLine>}
        {series && !full && (
          <PrimaryButton
            size="md"
            unavailable={!online}
            onClick={() => (online ? void navigate({ to: '/serie/$id/episodio', params: { id } }) : setNotice('Estás sin conexión.'))}
          >
            Otro episodio
          </PrimaryButton>
        )}
      </Footer>
    </Screen>
  )
}
