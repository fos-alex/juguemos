/**
 * Switches for the /demo page, so states that are hard to reach by hand can be
 * reviewed against the mockups. Only the mock API and the online check read
 * them; the product screens never know they exist.
 */
import { read, useStored, write } from './store'

/**
 * @typedef {{
 *   misread: boolean,
 *   offline: boolean,
 *   slow: boolean,
 *   failNext: boolean,
 *   activityLayout: 'porque' | 'pasos',
 * }} DemoSettings
 */

/** @type {DemoSettings} */
const DEFAULTS = {
  misread: false,
  offline: false,
  slow: false,
  failNext: false,
  activityLayout: 'porque',
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
