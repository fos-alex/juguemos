let pending = false

export function requestTurn() {
  pending = true
}

export function consumeTurn(): boolean {
  const wasPending = pending
  pending = false
  return wasPending
}
