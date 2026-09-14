/**
 * Switches for the /demo page, so states that are hard to reach by hand can be
 * reviewed against the mockups. Only the API client, the online check, and
 * the night-mode clock read them; the product screens never know they exist.
 */
import { read, useStored, write } from './store'

/**
 * @typedef {{
 *   offline: boolean,
 *   slow: boolean,
 *   failNext: boolean,
 *   activityLayout: 'porque' | 'pasos',
 *   night: boolean,
 * }} DemoSettings
 */

/** @type {DemoSettings} */
const DEFAULTS = {
  offline: false,
  slow: false,
  failNext: false,
  activityLayout: 'porque',
  night: false,
}

/** @returns {DemoSettings} */
export function demoSettings() {
  return { ...DEFAULTS, ...read('demo') }
}

/** @param {Partial<DemoSettings>} patch */
export function updateDemo(patch) {
  write('demo', { ...read('demo'), ...patch })
}

/** @returns {DemoSettings} */
export function useDemo() {
  return { ...DEFAULTS, ...useStored('demo') }
}
