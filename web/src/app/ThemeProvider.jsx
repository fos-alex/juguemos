import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { syncThemeColor, ThemeContext } from '../shared/hooks/useTheme'
import { read, useStored, write } from '../shared/store'
import { chooseTheme, nextSwitch, resolveTheme } from '../shared/theme'

/**
 * Night mode. Resolves the theme from the clock and the parent's one-tap
 * choice; re-checks at every 19:00 and 07:00 and whenever the app comes back
 * to the foreground; and paints it on <html>.
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const now = useSwitchClock()
  const choice = useStored('theme')
  const theme = resolveTheme({ now, choice })

  useLayoutEffect(() => {
    paint(theme)
  }, [theme])

  const value = useMemo(
    () => ({
      dark: theme === 'dark',
      toggle: () => write('theme', chooseTheme(theme === 'dark' ? 'light' : 'dark', new Date())),
    }),
    [theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

/**
 * Once, in main.jsx before React renders, so a night launch doesn't start
 * light. `?tema=oscuro` or `?tema=claro` counts as a tap.
 */
export function applyInitialTheme() {
  const now = new Date()
  const tema = new URLSearchParams(location.search).get('tema')
  if (tema) write('theme', chooseTheme(tema === 'oscuro' ? 'dark' : 'light', now))
  document.documentElement.dataset.theme = resolveTheme({ now, choice: read('theme') })
}

/** The time, refreshed at each switch and on return to the foreground (phones pause timers in the background). */
function useSwitchClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(new Date()), nextSwitch(now) - now.getTime() + 500)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [now])

  return now
}

/** A change cross-fades in 200 ms (base.css), and is instant with reduced motion. @param {'light' | 'dark'} theme */
function paint(theme) {
  const root = document.documentElement
  const apply = () => {
    root.dataset.theme = theme
    syncThemeColor()
  }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (root.dataset.theme !== theme && !calm && document.startViewTransition) document.startViewTransition(apply)
  else apply()
}
