/**
 * Night mode's rule, with no React and no DOM: dark from 19:00 to 07:00 local
 * time, unless a one-tap choice still holds. A choice lasts until the next
 * switch, so night still arrives on its own the next evening.
 */

const NIGHT_FROM = 19
const NIGHT_UNTIL = 7

/** @typedef {'light' | 'dark'} Theme */
/** @typedef {{ theme: Theme, until: number }} ThemeChoice */

/** @param {Date} now */
export function isNight(now) {
  const hour = now.getHours()
  return hour >= NIGHT_FROM || hour < NIGHT_UNTIL
}

/** The next 19:00 or 07:00 after `now`, as a timestamp. @param {Date} now */
export function nextSwitch(now) {
  const next = new Date(now)
  next.setHours(isNight(now) ? NIGHT_UNTIL : NIGHT_FROM, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime()
}

/**
 * @param {{ now: Date, choice?: ThemeChoice | null, night?: boolean }} input `night` forces night (/demo)
 * @returns {Theme}
 */
export function resolveTheme({ now, choice = null, night = false }) {
  if (choice && now.getTime() < choice.until) return choice.theme
  return night || isNight(now) ? 'dark' : 'light'
}

/** A choice of `theme` that holds until the next switch. @param {Theme} theme @param {Date} now @returns {ThemeChoice} */
export function chooseTheme(theme, now) {
  return { theme, until: nextSwitch(now) }
}
