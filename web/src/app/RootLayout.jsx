import { useEffect, useRef } from 'react'
import { Outlet, useRouter } from '@tanstack/react-router'
import { useStored } from '../shared/store'
import { ThemeProvider } from './ThemeProvider'

/** What wraps every screen: night mode, and the guard run again when the session may have ended. */
export function RootLayout() {
  useRecheckInForeground()
  useRecheckWhenSignedOut()
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}

/** Runs the guard again when the app comes back, so a session that ended while it was away signs this device out. */
function useRecheckInForeground() {
  const router = useRouter()
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void router.invalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])
}

/**
 * Runs the guard again when the account leaves the store: a call found the
 * session ended, or the parent signed out. The guard then sends them on.
 */
function useRecheckWhenSignedOut() {
  const router = useRouter()
  const account = useStored('account')
  const hadAccount = useRef(Boolean(account))
  useEffect(() => {
    if (hadAccount.current && !account) void router.invalidate()
    hadAccount.current = Boolean(account)
  }, [account, router])
}
