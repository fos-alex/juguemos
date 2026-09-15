import { useNavigate } from '@tanstack/react-router'
import { useTheme } from '../shared/hooks/useTheme'
import { useStored } from '../shared/store'
import { Drawer, Wordmark } from '../shared/ui'
import './AppMenu.css'

/**
 * The app's menu (2k), in a drawer over Home: the account, the sections, and
 * night mode and Ajustes at the foot. ¡Juguemos! is the current item. "Hora
 * del cuento" goes through Home, which first waits for who's playing to save.
 * @param {{ open: boolean, onClose: () => void, onStories: () => void }} props
 */
export function AppMenu({ open, onClose, onStories }) {
  const navigate = useNavigate()
  const account = useStored('account')
  const { dark, toggle } = useTheme()

  /** @param {'/familia' | '/juguetes' | '/ajustes'} to */
  const go = (to) => {
    onClose()
    void navigate({ to })
  }

  return (
    <Drawer open={open} onClose={onClose} label="Menú">
      <div className="drawer__header">
        <button type="button" className="close-button" aria-label="Cerrar el menú" onClick={onClose}>
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
        <button type="button" className="drawer__item is-current" aria-current="page" onClick={onClose}>
          ¡Juguemos!
        </button>
        <button type="button" className="drawer__item" onClick={onStories}>
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
        <button type="button" className="drawer__item drawer__item--muted" onClick={toggle}>
          {dark ? 'Modo día' : 'Modo noche'}
        </button>
        <button type="button" className="drawer__item drawer__item--muted" onClick={() => go('/ajustes')}>
          Ajustes
        </button>
      </div>
    </Drawer>
  )
}
