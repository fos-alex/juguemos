import { useNavigate } from '@tanstack/react-router'
import { toggleTheme, useTheme } from '../hooks/useTheme'
import { Wordmark } from './Wordmark'

interface TopBarProps {
  back?: { to: '/'; label: string } | { to: '/cuentos'; label: string }
}

export function TopBar({ back }: TopBarProps) {
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
