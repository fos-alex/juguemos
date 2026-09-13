import { useEffect, useState } from 'react'

interface ScreenWakeLock {
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

export function useWakeLock(): boolean {
  const [awake, setAwake] = useState(false)

  useEffect(() => {
    let sentinel: ScreenWakeLock | null = null
    let active = true

    const acquire = async () => {
      const nav = navigator as Navigator & {
        wakeLock?: { request(kind: 'screen'): Promise<ScreenWakeLock> }
      }
      if (!nav.wakeLock || document.visibilityState !== 'visible') return
      try {
        const lock = await nav.wakeLock.request('screen')
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
