import { useEffect, useRef } from 'react'
import { createRootRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { ensureSession } from '../api'
import { ThemeProvider } from '../components/ThemeProvider'
import { read, useStored } from '../lib/store'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/+$/, '') || '/'
    // The catalog admin has no login yet, and needs no family.
    if (path === '/admin' || path.startsWith('/admin/')) return
    const account = await ensureSession()
    const target = firstRunTarget(path, account)
    if (target) throw redirect({ ...target, replace: true })
  },
  component: RootLayout,
})

function RootLayout() {
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

const SIGNED_OUT = ['/entrada', '/cuenta']
const FIRST_RUN = ['/familia/contanos', '/familia/revisar', '/familia/corregir']

/**
 * Keeps the first run in order: a signed-in account, a family, then the app.
 * Returns where the parent belongs, or null when the path is fine. A session
 * that ended sends them to sign in again; a device that never had one, or
 * signed out, to the entry. The family starts in the form until the app can
 * read a family's own words (JUG-11). Verifying the email waits until the API
 * sends email, so /verificar sends them on.
 * @param {string} path
 * @param {import('../api/types').Account | null} account
 * @returns {{ to: string, search?: { modo: 'entrar' } } | null}
 */
function firstRunTarget(path, account) {
  if (!account) {
    if (SIGNED_OUT.includes(path)) return null
    return read('sessionEnded') ? { to: '/cuenta', search: { modo: 'entrar' } } : { to: '/entrada' }
  }
  if (!read('family')) return FIRST_RUN.includes(path) ? null : { to: '/familia/corregir' }
  if ([...SIGNED_OUT, '/verificar', '/familia/contanos', '/familia/revisar'].includes(path)) return { to: '/' }
  return null
}
