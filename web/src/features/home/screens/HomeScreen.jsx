import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { suggestActivity } from '../../../api'
import { choosePlaying, familyLine, loadFamily, WhoPlays } from '../../family'
import { placeText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useRequest } from '../../../shared/hooks/useRequest'
import { useSerialSaves } from '../../../shared/hooks/useSerialSaves'
import { useTheme } from '../../../shared/hooks/useTheme'
import { useStored, write } from '../../../shared/store'
import { PrimaryButton, SecondaryButton } from '../../../shared/ui/Buttons'
import { Card, MetaLabel } from '../../../shared/ui/Card'
import { Drawer } from '../../../shared/ui/Drawer'
import { OfflineNotice } from '../../../shared/ui/OfflineNotice'
import { Footer, Screen } from '../../../shared/ui/Screen'
import { StatusLine } from '../../../shared/ui/StatusLine'
import { Wordmark } from '../../../shared/ui/Wordmark'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

const SLOW_AFTER_MS = 6000

/** @typedef {import('../../family').Kid} Kid */

/**
 * 2j (2i when there is no last idea yet), with 2l and 2q as its states. The
 * wait happens here: the pressed button holds three slow dots, and the story
 * button greys out so a second tap can't queue another request. Never a feed,
 * streaks, or a nudge about days since last played. With more than one kid,
 * the parent picks who's playing above the buttons (JUG-107).
 */
function HomeScreen() {
  const navigate = useNavigate()
  const offline = useOfflineNotice()
  const { online } = offline
  const account = useStored('account')
  const family = useStored('family')
  const lastId = useStored('lastActivityId')
  const last = useStored('activities')?.[lastId]
  const request = useRequest({ slowAfter: SLOW_AFTER_MS })
  // Choices are saved one after another, and a juego or a story waits for the last one.
  const saves = useSerialSaves()
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()
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
    write('family', { ...family, kids })
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
    write('storyOptions', null)
    void navigate({ to: '/cuentos' })
  }

  /** @param {'/familia' | '/juguetes' | '/ajustes'} to */
  const go = (to) => {
    setMenuOpen(false)
    void navigate({ to })
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

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} label="Menú">
        <div className="drawer__header">
          <button type="button" className="close-button" aria-label="Cerrar el menú" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
          <Wordmark />
        </div>
        {account && (
          <div className="drawer__account">
            <p className="drawer__name">{account.name}</p>
            <p className="drawer__email">{account.email}</p>
          </div>
        )}
        <nav className="drawer__nav" aria-label="Secciones">
          <button type="button" className="drawer__item is-current" aria-current="page" onClick={() => setMenuOpen(false)}>
            ¡Juguemos!
          </button>
          <button type="button" className="drawer__item" onClick={() => void openStories()}>
            Hora del cuento
          </button>
          <button type="button" className="drawer__item" onClick={() => go('/familia')}>
            Mi familia
          </button>
          {/* JUG-94, before the 0.2 design. Voice pass pending. */}
          <button type="button" className="drawer__item" onClick={() => go('/juguetes')}>
            El baúl de juguetes
          </button>
          {/* Where el diario and recuerdos land. */}
          <div className="drawer__upcoming">próximas funciones</div>
        </nav>
        <div className="drawer__footer">
          {/* Voice pass pending. Stays open, so the parent sees the switch happen. */}
          <button type="button" className="drawer__item drawer__item--muted" onClick={toggleTheme}>
            {dark ? 'Modo día' : 'Modo noche'}
          </button>
          <button type="button" className="drawer__item drawer__item--muted" onClick={() => go('/ajustes')}>
            Ajustes
          </button>
        </div>
      </Drawer>
    </Screen>
  )
}
