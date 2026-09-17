import { useRef } from 'react'
import { useTheme } from '../hooks/useTheme'
import { MoonIcon, SunIcon } from './Icons'
import './ThemeToggle.css'

/**
 * Night mode's one tap. The icon shows where the tap goes: a moon by day, a
 * sun by night. After a tap, the new one turns in as the other goes
 * (JUG-159); a screen that opens with it just shows it.
 * Voice pass pending: "Modo noche" / "Modo día".
 */
export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  const tapped = useRef(false)
  const turn = tapped.current ? 'theme-toggle__icon' : ''

  const tap = () => {
    tapped.current = true
    toggle()
  }

  return (
    <button type="button" className="theme-toggle" aria-label={dark ? 'Modo día' : 'Modo noche'} onClick={tap}>
      {dark ? (
        <SunIcon key="sun" className={turn} />
      ) : (
        <MoonIcon key="moon" className={turn && `${turn} theme-toggle__icon--moon`} />
      )}
    </button>
  )
}
