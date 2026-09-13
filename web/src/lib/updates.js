let applyUpdate = () => window.location.reload()
let onAvailable = null

export function announceUpdate() {
  onAvailable?.()
}

export function setApplyUpdate(fn) {
  applyUpdate = fn
}

export function applyUpdateNow() {
  applyUpdate()
}

export function onAvailableChange(fn) {
  onAvailable = fn
}
