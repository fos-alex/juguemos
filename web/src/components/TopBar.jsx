import { useNavigate } from '@tanstack/react-router'
import { toggleTheme, useTheme } from '../hooks/useTheme'
import { Wordmark } from './Wordmark'

/** @param {{ back?: { to: '/' | '/cuentos', label: string } }} props */
export function TopBar({ back }) {
  const navigate = useNavigate()
  const dark = useTheme()

  return (
    <header className={`topbar${back ? '' : ' topbar--home'}`}>
      {back ? (
        <button className="link-button" onClick={() => void navigate({ to: back.to })}>
          ← {back.label}
        </button>
      ) : (
        <Wordmark />
      )}
      <button className="link-button" onClick={toggleTheme}>
        {dark ? 'Modo día' : 'Modo noche'}
      </button>
    </header>
  )
}
