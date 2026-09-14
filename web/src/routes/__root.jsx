import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { ThemeProvider } from '../components/ThemeProvider'
import { UpdateBanner } from '../components/UpdateBanner'
import { read } from '../lib/store'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const target = firstRunTarget(location.pathname.replace(/\/+$/, '') || '/')
    if (target) throw redirect({ to: target, replace: true })
  },
  component: RootLayout,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <Outlet />
      <UpdateBanner />
    </ThemeProvider>
  )
}

const SIGNED_OUT = ['/entrada', '/cuenta']
const FIRST_RUN = ['/familia/contanos', '/familia/revisar', '/familia/corregir']

/**
 * Keeps the first run in order: account, verified email, family, then the
 * app. Returns where the parent belongs, or null when the path is fine.
 * @param {string} path
 */
function firstRunTarget(path) {
  if (path === '/demo') return null
  const account = read('account')
  if (!account) return SIGNED_OUT.includes(path) ? null : '/entrada'
  if (!account.emailVerified) return path === '/verificar' || path === '/cuenta' ? null : '/verificar'
  if (!read('family')) return FIRST_RUN.includes(path) ? null : '/familia/contanos'
  if ([...SIGNED_OUT, '/verificar', '/familia/contanos', '/familia/revisar'].includes(path)) return '/'
  return null
}
