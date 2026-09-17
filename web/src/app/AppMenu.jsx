import { useNavigate } from '@tanstack/react-router'
import { useTheme } from '../shared/hooks/useTheme'
import { useStored } from '../shared/store'
import {
  BookIcon,
  CloseIcon,
  Drawer,
  FamilyIcon,
  MaterialsIcon,
  MoonIcon,
  RondaIcon,
  SettingsIcon,
  SunIcon,
  ToyBoxIcon,
  Wordmark,
} from '../shared/ui'
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

  /** @param {'/familia' | '/juguetes' | '/materiales' | '/ajustes'} to */
  const go = (to) => {
    onClose()
    void navigate({ to })
  }

  return (
    <Drawer open={open} onClose={onClose} label="Menú">
      <div className="drawer__header">
        <button type="button" className="close-button" aria-label="Cerrar el menú" onClick={onClose}>
          <CloseIcon />
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
          <RondaIcon size={22} />
          ¡Juguemos!
        </button>
        <button type="button" className="drawer__item" onClick={onStories}>
          <BookIcon size={22} />
          Hora del cuento
        </button>
        <button type="button" className="drawer__item" onClick={() => go('/familia')}>
          <FamilyIcon size={22} />
          Mi familia
        </button>
        {/* JUG-94. Voice pass pending. */}
        <button type="button" className="drawer__item" onClick={() => go('/juguetes')}>
          <ToyBoxIcon size={22} />
          El baúl de juguetes
        </button>
        {/* JUG-153. Voice pass pending. */}
        <button type="button" className="drawer__item" onClick={() => go('/materiales')}>
          <MaterialsIcon size={22} />
          Materiales
        </button>
      </nav>
      <div className="drawer__footer">
        {/* Voice pass pending. Stays open, so the parent sees the switch happen. */}
        <button type="button" className="drawer__item drawer__item--muted" onClick={toggle}>
          {dark ? <SunIcon size={22} /> : <MoonIcon size={22} />}
          {dark ? 'Modo día' : 'Modo noche'}
        </button>
        <button type="button" className="drawer__item drawer__item--muted" onClick={() => go('/ajustes')}>
          <SettingsIcon size={22} />
          Ajustes
        </button>
      </div>
    </Drawer>
  )
}
