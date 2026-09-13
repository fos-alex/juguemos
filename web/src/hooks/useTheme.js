/**
 * Night mode. The theme follows the local clock: dark from 19:00 to 07:00,
 * light the rest of the day, flipping live at the switch. One tap changes it,
 * and that choice holds until the next switch, so night still arrives on its
 * own the next evening. index.html runs the same rule before the first paint.
 */
import { useSyncExternalStore } from 'react'
import { demoSettings } from '../lib/demo'
import { read, write } from '../lib/store'

const NIGHT_FROM = 19
const NIGHT_UNTIL = 7

const listeners = new Set()
let timer = 0

/** @param {Date} now */
function isNight(now) {
  const hour = now.getHours()
  return hour >= NIGHT_FROM || hour < NIGHT_UNTIL
}

/** The next 19:00 or 07:00 after `now`. @param {Date} now */
function nextSwitch(now) {
  const next = new Date(now)
  next.setHours(isNight(now) ? NIGHT_UNTIL : NIGHT_FROM, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime()
}

/** @returns {'light' | 'dark'} */
function resolve(now = new Date()) {
  const choice = read('theme')
  if (choice && now.getTime() < choice.until) return choice.theme
  return demoSettings().night || isNight(now) ? 'dark' : 'light'
}

/** Paints the resolved theme, cross-fading unless motion is reduced. @param {{ animate?: boolean }} options */
function apply({ animate = true } = {}) {
  const theme = resolve()
  const root = document.documentElement
  if (root.dataset.theme === theme) return
  const paint = () => {
    root.dataset.theme = theme
    syncThemeColor()
    for (const listener of listeners) listener()
  }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (animate && !calm && document.startViewTransition) document.startViewTransition(paint)
  else paint()
}

/** Re-checks the clock now and again at the next switch. */
export function refreshTheme({ animate = true } = {}) {
  apply({ animate })
  window.clearTimeout(timer)
  const now = new Date()
  timer = window.setTimeout(refreshTheme, nextSwitch(now) - now.getTime() + 500)
}

/** Once, at boot. Phones pause timers in the background, so coming back re-checks the clock. */
export function startTheme() {
  const tema = new URLSearchParams(location.search).get('tema')
  if (tema) write('theme', { theme: tema === 'oscuro' ? 'dark' : 'light', until: nextSwitch(new Date()) })
  refreshTheme({ animate: false })
  syncThemeColor()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshTheme()
  })
}

/** The one tap: the other theme, until the clock's next switch. */
export function toggleTheme() {
  write('theme', { theme: isDark() ? 'light' : 'dark', until: nextSwitch(new Date()) })
  apply()
}

function isDark() {
  return document.documentElement.dataset.theme === 'dark'
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, isDark)
}
