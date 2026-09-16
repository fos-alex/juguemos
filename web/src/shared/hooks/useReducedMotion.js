import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** @param {() => void} listener */
function subscribe(listener) {
  const query = matchMedia(QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

/**
 * Whether the phone asks for less motion. `base.css` already stops every
 * animation and transition when it does, so this is for the places that need
 * to render something else instead of the same thing held still.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches)
}
