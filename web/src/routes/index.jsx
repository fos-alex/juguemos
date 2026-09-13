import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { suggestActivity } from '../api'
import { PrimaryButton, SecondaryButton } from '../components/Buttons'
import { Card, MetaLabel } from '../components/Card'
import { Drawer } from '../components/Drawer'
import { Footer, Screen } from '../components/Screen'
import { Wordmark } from '../components/Wordmark'
import { useOnline } from '../hooks/useOnline'
import { familyLine } from '../lib/format'
import { useStored, write } from '../lib/store'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

const SLOW_AFTER_MS = 6000

/**
 * 2j (2i when there is no last idea yet), with 2l and 2q as its states. The
 * wait happens here: the pressed button holds three slow dots, and the story
 * button greys out so a second tap can't queue another request. Never a feed,
 * streaks, or a nudge about days since last played.
 */
function HomeScreen() {
  const navigate = useNavigate()
  const online = useOnline()
  const account = useStored('account')
  const family = useStored('family')
  const lastId = useStored('lastActivityId')
  const last = useStored('activities')?.[lastId]
  const [request, setRequest] = useState(/** @type {'idle' | 'loading' | 'slow' | 'error'} */ ('idle'))
  const [offlineTaps, setOfflineTaps] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.title = 'Juguemos'
  }, [])

  const busy = request === 'loading' || request === 'slow'

  const suggest = async () => {
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    setRequest('loading')
    const slow = window.setTimeout(() => setRequest('slow'), SLOW_AFTER_MS)
    try {
      const activity = await suggestActivity({ after: lastId })
      void navigate({ to: '/idea/$id', params: { id: activity.id } })
    } catch {
      setRequest('error')
    } finally {
      window.clearTimeout(slow)
    }
  }

  const openStories = () => {
    setMenuOpen(false)
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    write('storyOptions', null)
    void navigate({ to: '/cuentos' })
  }

  /** @param {'/familia' | '/ajustes'} to */
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
        {family && <p className="home__family">{familyLine(family)}</p>}
      </header>

      {(!online || last) && (
        <div className="home__memory">
          {!online && (
            <p key={offlineTaps} className="home__offline" role="status">
              {last ? 'Estás sin conexión. La última idea sigue acá.' : 'Estás sin conexión.'}
            </p>
          )}
          {last && (
            <Card onClick={() => void navigate({ to: '/idea/$id', params: { id: last.id } })}>
              <MetaLabel as="span" wide>
                La última idea
              </MetaLabel>
              <span className="card-title">{last.title}</span>
              <span className="card-meta">
                {last.minutes} min · {last.place}
              </span>
            </Card>
          )}
        </div>
      )}

      <div className="home__spacer" />

      <Footer className="home__actions">
        <PrimaryButton size="home" busy={busy} busyLabel="Pensando una idea" unavailable={!online} onClick={suggest}>
          ¿Qué hacemos ahora?
        </PrimaryButton>
        {/* Voice pass pending: the line shown after ~6 s of thinking. */}
        {request === 'slow' && (
          <p className="home__status" role="status">
            Sigo pensando. Ya casi está.
          </p>
        )}
        {request === 'error' && (
          <p className="home__status" role="alert">
            Uy, algo falló. ¿Probamos de nuevo?
          </p>
        )}
        <SecondaryButton size="lg" disabled={busy} unavailable={!online} onClick={openStories}>
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
            ¿Qué hacemos ahora?
          </button>
          <button type="button" className="drawer__item" onClick={openStories}>
            Hora del cuento
          </button>
          <button type="button" className="drawer__item" onClick={() => go('/familia')}>
            Mi familia
          </button>
          {/* Where el baúl de juguetes, el diario, and recuerdos land after 0.1. */}
          <div className="drawer__upcoming">próximas funciones</div>
        </nav>
        <div className="drawer__footer">
          <button type="button" className="drawer__item drawer__item--muted" onClick={() => go('/ajustes')}>
            Ajustes
          </button>
        </div>
      </Drawer>
    </Screen>
  )
}
