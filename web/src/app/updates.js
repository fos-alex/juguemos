/**
 * Updates apply themselves. Every deploy ships a new service worker, which
 * takes over on its own and deletes the old caches; the page then reloads at
 * the next safe moment. That's right away, except while a story is being read
 * or the timer runs: there it waits until the parent leaves the screen or the
 * app goes to the background, so nothing is interrupted.
 */

/**
 * The screens a reload would interrupt: reading a story or writing one, the
 * next episode of a series, the timer, a game of ¿Qué suena?, and telling
 * Ludi about the family, where a voice note may be recording.
 */
const BUSY = [
  /^\/cuento\//,
  /^\/serie\/[^/]+\/episodio\/?$/,
  /^\/idea\/[^/]+\/(reloj|que-suena)\/?$/,
  /^\/familia\/contanos\/?$/,
]

/** How often an app left open asks whether a new version is out. */
const CHECK_EVERY_MS = 30 * 60 * 1000

/** At most one reload a minute for a missing chunk, so a chunk that's truly gone can't loop. */
const CHUNK_RELOAD_KEY = 'ludi:chunk-reload'

/** A new version has taken over, and this page still runs the old one. */
let pending = false

/** @param {string} path */
const isBusy = (path) => BUSY.some((screen) => screen.test(path))

/**
 * Registers the service worker and keeps this page on the latest version.
 * Production only: the dev server has no service worker.
 * @param {import('@tanstack/react-router').AnyRouter} router
 */
export async function keepUpToDate(router) {
  // A page running the previous version may ask for a chunk the new deploy
  // replaced: load the new version instead of showing a broken screen.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    location.reload()
  })

  // Leaving a busy screen, or going to the background, is the moment to reload.
  router.subscribe('onBeforeNavigate', ({ toLocation }) => {
    if (pending) location.assign(toLocation.href)
  })
  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'hidden') location.reload()
  })

  const { registerSW } = await import('virtual:pwa-register')
  registerSW({
    immediate: true,
    onNeedReload() {
      pending = true
      if (!isBusy(location.pathname)) location.reload()
    },
    // Browsers look for a new worker on each page load; an app left open
    // looks again when it comes back to the foreground, and every half hour.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => {})
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
