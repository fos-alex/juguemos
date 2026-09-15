/**
 * Short vibrations for the voice note, like a messaging app's (JUG-135): one
 * tick when a note starts, locks, or is sent, and two when it's dropped.
 * Plain browser APIs and no React, like the recorder. The rest of the app
 * stays still: no sound and no vibration anywhere else.
 *
 * Android's browsers vibrate through `navigator.vibrate`. Safari on iPhone has
 * no vibration API; toggling a hidden switch through its label makes the
 * system tick instead, which works from iOS 17.4 to 26.4 and does nothing on
 * later versions. A desktop feels nothing either way.
 */

/** @typedef {'start' | 'lock' | 'send' | 'cancel'} Haptic */

/** Milliseconds on, off, on. @type {Record<Haptic, number[]>} */
const PATTERNS = { start: [18], lock: [12], send: [12], cancel: [14, 70, 14] }

/** @type {HTMLLabelElement | null} */
let switchLabel = null

/** @param {Haptic} kind */
export function haptic(kind) {
  const pattern = PATTERNS[kind]
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
    return
  }
  if (!matchMedia('(pointer: coarse)').matches) return
  tickSwitch()
  if (pattern.length > 2) setTimeout(tickSwitch, pattern[0] + pattern[1])
}

/** One system tick on iPhone: a click on the label of an `<input type="checkbox" switch>`. */
function tickSwitch() {
  try {
    if (!switchLabel) {
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.id = 'voice-haptic-switch'
      input.tabIndex = -1
      switchLabel = document.createElement('label')
      switchLabel.htmlFor = input.id
      // Outside the React root, so its clicks reach no handler of the app.
      const box = document.createElement('div')
      box.setAttribute('aria-hidden', 'true')
      box.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);opacity:0;pointer-events:none'
      box.append(input, switchLabel)
      document.body.append(box)
    }
    switchLabel.click()
  } catch {
    // No tick is fine.
  }
}
