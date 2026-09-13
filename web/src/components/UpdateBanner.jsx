import { useEffect, useState } from 'react'
import { applyUpdateNow, onAvailableChange } from '../lib/updates'

export function UpdateBanner() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    onAvailableChange(() => setAvailable(true))
    return () => onAvailableChange(null)
  }, [])

  if (!available) return null

  return (
    <div className="update-banner" role="status">
      <span>Hay una nueva versión de Juguemos.</span>
      <button className="update-banner__reload" onClick={applyUpdateNow}>
        Recargar
      </button>
    </div>
  )
}
