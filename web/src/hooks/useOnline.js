import { useSyncExternalStore } from 'react'
import { useDemo } from '../lib/demo'

function subscribe(listener) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

/** The browser's connection, or the offline switch on /demo. */
export function useOnline() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  return online && !useDemo().offline
}
