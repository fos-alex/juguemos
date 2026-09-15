import { useState } from 'react'
import { useOnline } from './useOnline'

/**
 * The connection, and a count of taps made while offline. `<OfflineNotice>`
 * uses the count as its key, so each tap announces the offline line again
 * instead of the tap doing nothing.
 * @returns {{ online: boolean, taps: number, tap: () => void }}
 */
export function useOfflineNotice() {
  const online = useOnline()
  const [taps, setTaps] = useState(0)
  return { online, taps, tap: () => setTaps((count) => count + 1) }
}
