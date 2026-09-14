/**
 * The app's local state, persisted in localStorage so it survives reloads and
 * stays readable offline. One key per piece of state (see KEYS); components
 * subscribe with useStored(key). The real API will write through here too,
 * which is what keeps the last idea and the open story available offline.
 */
import { useSyncExternalStore } from 'react'

/**
 * @typedef {'account' | 'family' | 'familyDraft' | 'parseResult' | 'activities' | 'lastActivityId'
 *   | 'timer' | 'storyOptions' | 'stories' | 'storyPositions' | 'theme' | 'demo'} Key
 */

const PREFIX = 'juguemos:'
const cache = new Map()
const listeners = new Set()

/** @param {Key} key */
function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function notify() {
  for (const listener of listeners) listener()
}

/** @param {Key} key */
export function read(key) {
  if (!cache.has(key)) cache.set(key, load(key))
  return cache.get(key)
}

/** @param {Key} key @param {unknown} value `null` removes the key */
export function write(key, value) {
  cache.set(key, value ?? null)
  try {
    if (value == null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the in-memory value still holds for this session.
  }
  notify()
}

/** Forgets everything except the listed keys. @param {Key[]} keep */
export function clearAll(keep = []) {
  for (const name of Object.keys(localStorage)) {
    if (name.startsWith(PREFIX) && !keep.includes(/** @type {Key} */ (name.slice(PREFIX.length)))) {
      localStorage.removeItem(name)
    }
  }
  for (const key of [...cache.keys()]) if (!keep.includes(key)) cache.delete(key)
  notify()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** @param {Key} key */
export function useStored(key) {
  return useSyncExternalStore(subscribe, () => read(key))
}
