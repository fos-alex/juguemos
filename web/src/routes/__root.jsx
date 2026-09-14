import { useEffect } from 'react'
import { createRootRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { ensureSession } from '../api'
import { ThemeProvider } from '../components/ThemeProvider'
import { UpdateBanner } from '../components/UpdateBanner'
import { read } from '../lib/store'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const account = await ensureSession()
    const target = firstRunTarget(location.pathname.replace(/\/+$/, '') || '/', account)
    if (target) throw redirect({ to: target, replace: true })
  },
  component: RootLayout,
})

function RootLayout() {
  useRecheckInForeground()
  return (
    <ThemeProvider>
      <Outlet />
      <UpdateBanner />
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

const SIGNED_OUT = ['/entrada', '/cuenta']
const FIRST_RUN = ['/familia/contanos', '/familia/revisar', '/familia/corregir']

/**
 * Keeps the first run in order: a signed-in account, a family, then the app.
 * Returns where the parent belongs, or null when the path is fine. Verifying
 * the email waits until the API sends email, so /verificar sends them on.
 * @param {string} path
 * @param {import('../api/mock').Account | null} account
 */
function firstRunTarget(path, account) {
  if (!account) return SIGNED_OUT.includes(path) ? null : '/entrada'
  if (!read('family')) return FIRST_RUN.includes(path) ? null : '/familia/contanos'
  if ([...SIGNED_OUT, '/verificar', '/familia/contanos', '/familia/revisar'].includes(path)) return '/'
  return null
}
