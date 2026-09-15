import { useEffect, useState } from 'react'

/**
 * Seconds left until `endsAt`, ticking once a second and stopping at zero.
 * Nothing happens at zero: no sound, no vibration. The count just stops.
 * @param {number | null | undefined} endsAt epoch milliseconds
 */
export function useCountdown(endsAt) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!endsAt) return
    setNow(Date.now())
    const interval = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [endsAt])

  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0
}
