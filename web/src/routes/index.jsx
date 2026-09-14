import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { choosePlaying, loadFamily, suggestActivity } from '../api'
import { PrimaryButton, SecondaryButton } from '../components/Buttons'
import { Card, MetaLabel } from '../components/Card'
import { Drawer } from '../components/Drawer'
import { Footer, Screen } from '../components/Screen'
import { Wordmark } from '../components/Wordmark'
import { useOnline } from '../hooks/useOnline'
import { useTheme } from '../hooks/useTheme'
import { failureText, familyLine, placeText } from '../lib/format'
import { useStored, write } from '../lib/store'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

const SLOW_AFTER_MS = 6000

/** @typedef {import('../api/types').Kid} Kid */

/**
 * 2j (2i when there is no last idea yet), with 2l and 2q as its states. The
 * wait happens here: the pressed button holds three slow dots, and the story
 * button greys out so a second tap can't queue another request. Never a feed,
 * streaks, or a nudge about days since last played. With more than one kid,
 * the parent picks who's playing above the buttons (JUG-107).
 */
function HomeScreen() {
  const navigate = useNavigate()
  const online = useOnline()
  const account = useStored('account')
  const family = useStored('family')
  const lastId = useStored('lastActivityId')
  const last = useStored('activities')?.[lastId]
  const [request, setRequest] = useState(/** @type {'idle' | 'loading' | 'slow' | 'error'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [offlineTaps, setOfflineTaps] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()
  // Choices are saved one after another, and a juego or a story waits for the last one.
  const choosing = useRef(/** @type {Promise<unknown>} */ (Promise.resolve()))
  const picking = (family?.kids.length ?? 0) > 1

  useEffect(() => {
    document.title = 'Juguemos'
    // Who's playing may have changed on another phone.
    if (navigator.onLine) loadFamily().catch(() => {})
  }, [])

  const busy = request === 'loading' || request === 'slow'

  /** @param {Kid} kid */
  const toggle = (kid) => {
    if (!family || busy) return
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    // A family cached before JUG-107 has no kid ids until the refresh above lands.
    if (family.kids.some((each) => !each.id)) return
    const playing = kid.playing !== false
    if (playing && family.kids.filter((each) => each.playing !== false).length === 1) return
    const kids = family.kids.map((each) => (each.id === kid.id ? { ...each, playing: !playing } : each))
    write('family', { ...family, kids })
    setRequest('idle')
    const ids = kids.filter((each) => each.playing !== false).map((each) => /** @type {string} */ (each.id))
    choosing.current = choosing.current
      .then(() => choosePlaying(ids))
      .catch((error) => {
        setFailure(failureText(error))
        setRequest('error')
        return loadFamily().catch(() => {})
      })
  }

  const suggest = async () => {
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    setRequest('loading')
    const slow = window.setTimeout(() => setRequest('slow'), SLOW_AFTER_MS)
    try {
      await choosing.current
      const activity = await suggestActivity({ after: lastId })
      void navigate({ to: '/idea/$id', params: { id: activity.id } })
    } catch (error) {
      setFailure(failureText(error))
      setRequest('error')
    } finally {
      window.clearTimeout(slow)
    }
  }

  const openStories = async () => {
    setMenuOpen(false)
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    await choosing.current
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
          {!online && (
            <p key={offlineTaps} className="home__offline" role="status">
              {last ? 'Estás sin conexión. El último juego sigue acá.' : 'Estás sin conexión.'}
            </p>
          )}
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
        <PrimaryButton size="home" busy={busy} busyLabel="Pensando un juego" unavailable={!online} onClick={suggest}>
          ¡Juguemos!
        </PrimaryButton>
        {/* Voice pass pending: the line shown after ~6 s of thinking. */}
        {request === 'slow' && (
          <p className="home__status" role="status">
            Sigo pensando. Ya casi está.
          </p>
        )}
        {request === 'error' && (
          <p className="home__status" role="alert">
            {failure}
          </p>
        )}
        <SecondaryButton size="lg" disabled={busy} unavailable={!online} onClick={() => void openStories()}>
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

/**
 * Who's playing: every kid by name, marked unless the parent took them out.
 * Marked is filled with a check and unmarked is outlined, so colour is never
 * the only difference. The last kid playing stays in. No counts, no nudges.
 * @param {{ kids: Kid[], onToggle: (kid: Kid) => void }} props
 */
function WhoPlays({ kids, onToggle }) {
  const playingCount = kids.filter((kid) => kid.playing !== false).length
  return (
    <div className="who-plays" role="group" aria-labelledby="who-plays-label">
      {/* Voice pass pending: "¿Quiénes juegan?". */}
      <p id="who-plays-label" className="who-plays__label">
        ¿Quiénes juegan?
      </p>
      <div className="chips">
        {kids.map((kid, index) => {
          const playing = kid.playing !== false
          return (
            <button
              key={kid.id ?? index}
              type="button"
              className="chip chip--kid"
              aria-pressed={playing}
              aria-disabled={(playing && playingCount === 1) || undefined}
              onClick={() => onToggle(kid)}
            >
              {playing && (
                <span className="chip__check" aria-hidden="true">
                  ✓
                </span>
              )}
              {kid.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
