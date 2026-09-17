import { useEffect, useState } from 'react'
import { nextSwitch } from '../theme'

/**
 * The time, refreshed at each 19:00 and 07:00 and on return to the foreground
 * (phones pause timers in the background). Night mode turns on it, and so
 * does what Ludi offers before bed (JUG-26).
 */
export function useSwitchClock() {
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
