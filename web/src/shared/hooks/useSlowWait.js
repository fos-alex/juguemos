import { useEffect, useState } from 'react'

/** How long a wait has to last before the app says anything else about it. */
export const SLOW_AFTER_MS = 6000

/**
 * Whether a wait has gone on for `ms` already. It turns true once the wait
 * has lasted that long and false again the moment the wait ends, so a screen
 * can hold something back until the wait is worth explaining: the waiting
 * animation itself, or the plain line that says what is happening.
 * @param {boolean} waiting whether the screen is waiting at all
 * @param {number} [ms] how long counts as long
 */
export function useSlowWait(waiting, ms = SLOW_AFTER_MS) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!waiting) return setSlow(false)
    const timer = window.setTimeout(() => setSlow(true), ms)
    return () => window.clearTimeout(timer)
  }, [waiting, ms])

  return waiting && slow
}
