import { useTheme } from '../hooks/useTheme'
import { MoonIcon, SunIcon } from './Icons'
import './ThemeToggle.css'

/**
 * Night mode's one tap. The icon shows where the tap goes: a moon by day, a
 * sun by night.
 * Voice pass pending: "Modo noche" / "Modo día".
 */
export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button type="button" className="theme-toggle" aria-label={dark ? 'Modo día' : 'Modo noche'} onClick={toggle}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
