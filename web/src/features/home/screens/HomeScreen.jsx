import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppMenu } from '../../../app/AppMenu'
import { placeText, suggestActivity } from '../../activities'
import { choosePlaying, familyLine, loadFamily, markPlaying, WhoPlays } from '../../family'
import { forgetOptions } from '../../stories'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useRequest } from '../../../shared/hooks/useRequest'
import { useSerialSaves } from '../../../shared/hooks/useSerialSaves'
import { useStored } from '../../../shared/store'
import {
  Card,
  Footer,
  MetaLabel,
  OfflineNotice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusLine,
  Wordmark,
} from '../../../shared/ui'
import '../home.css'

const SLOW_AFTER_MS = 6000

/** @typedef {import('../../family').Kid} Kid */

/**
 * 2j (2i when there is no last idea yet), with 2l and 2q as its states. The
 * wait happens here: the pressed button holds three slow dots, and the story
 * button greys out so a second tap can't queue another request. Never a feed,
 * streaks, or a nudge about days since last played. With more than one kid,
 * the parent picks who's playing above the buttons (JUG-107).
 */
export function HomeScreen() {
  const navigate = useNavigate()
  const offline = useOfflineNotice()
  const { online } = offline
  const family = useStored('family')
  const lastId = useStored('lastActivityId')
  const last = useStored('activities')?.[lastId]
  const request = useRequest({ slowAfter: SLOW_AFTER_MS })
  // Choices are saved one after another, and a juego or a story waits for the last one.
  const saves = useSerialSaves()
  const [menuOpen, setMenuOpen] = useState(false)
  const picking = (family?.kids.length ?? 0) > 1

  useDocumentTitle('Juguemos')

  useEffect(() => {
    // Who's playing may have changed on another phone.
    if (navigator.onLine) loadFamily().catch(() => {})
  }, [])

  /** @param {Kid} kid */
  const toggle = (kid) => {
    if (!family || request.busy) return
    if (!online) return offline.tap()
    // A family cached before JUG-107 has no kid ids until the refresh above lands.
    if (family.kids.some((each) => !each.id)) return
    const playing = kid.playing !== false
    if (playing && family.kids.filter((each) => each.playing !== false).length === 1) return
    const kids = family.kids.map((each) => (each.id === kid.id ? { ...each, playing: !playing } : each))
    markPlaying(kids)
    request.reset()
    const ids = kids.filter((each) => each.playing !== false).map((each) => /** @type {string} */ (each.id))
    saves.add(
      () => choosePlaying(ids),
      (error) => {
        request.fail(error)
        return loadFamily().catch(() => {})
      },
    )
  }

  const suggest = () => {
    if (!online) return offline.tap()
    void request.run(async () => {
      await saves.settled()
      const activity = await suggestActivity({ after: lastId })
      void navigate({ to: '/idea/$id', params: { id: activity.id } })
    })
  }

  const openStories = async () => {
    setMenuOpen(false)
    if (!online) return offline.tap()
    await saves.settled()
    forgetOptions()
    void navigate({ to: '/cuentos' })
  }

  return (
    <Screen className="home">
      <header className="home__header">
        <div className="home__bar">
          <button
            type="button"
            className="menu-button"
            aria-label="Abrir el menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <Wordmark />
        </div>
        {/* With the picker below, the kids are named there instead. */}
        {family && !picking && <p className="home__family">{familyLine(family)}</p>}
      </header>

      {(!online || last) && (
        <div className="home__memory">
          <OfflineNotice notice={offline} className="home__offline">
            {last ? 'Estás sin conexión. El último juego sigue acá.' : 'Estás sin conexión.'}
          </OfflineNotice>
          {last && (
            <Card onClick={() => void navigate({ to: '/idea/$id', params: { id: last.id } })}>
              <MetaLabel as="span" wide>
                El último juego
              </MetaLabel>
              <span className="card-title">{last.title}</span>
              <span className="card-meta">
                {last.minutes} min · {placeText(last.place)}
              </span>
            </Card>
          )}
        </div>
      )}

      <div className="home__spacer" />

      <Footer className="home__actions">
        {picking && family && <WhoPlays kids={family.kids} onToggle={toggle} />}
        <PrimaryButton size="home" busy={request.busy} busyLabel="Pensando un juego" unavailable={!online} onClick={suggest}>
          ¡Juguemos!
        </PrimaryButton>
        {/* Voice pass pending: the line shown after ~6 s of thinking. */}
        {request.state === 'slow' && <StatusLine role="status">Sigo pensando. Ya casi está.</StatusLine>}
        {request.state === 'error' && <StatusLine role="alert">{request.failure}</StatusLine>}
        <SecondaryButton size="lg" disabled={request.busy} unavailable={!online} onClick={() => void openStories()}>
          Hora del cuento
        </SecondaryButton>
      </Footer>

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} onStories={() => void openStories()} />
    </Screen>
  )
}
