let applyUpdate: () => void = () => window.location.reload()
let onAvailable: (() => void) | null = null

export function announceUpdate() {
  onAvailable?.()
}

export function setApplyUpdate(fn: () => void) {
  applyUpdate = fn
}

export function applyUpdateNow() {
  applyUpdate()
}

export function onAvailableChange(fn: (() => void) | null) {
  onAvailable = fn
}
