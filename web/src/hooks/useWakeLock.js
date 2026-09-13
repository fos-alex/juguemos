import { useEffect, useState } from 'react'

export function useWakeLock() {
  const [awake, setAwake] = useState(false)

  useEffect(() => {
    let sentinel = null
    let active = true

    const acquire = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (!active) {
          await lock.release()
          return
        }
        sentinel = lock
        setAwake(true)
        lock.addEventListener('release', () => setAwake(false))
      } catch {
        setAwake(false)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    document.addEventListener('visibilitychange', onVisibility)
    void acquire()

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
    }
  }, [])

  return awake
}
