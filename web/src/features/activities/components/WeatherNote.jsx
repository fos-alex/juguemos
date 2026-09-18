import { useEffect, useId, useRef, useState } from 'react'
import { loadOutside } from '../api'
import { outsideLook } from '../model'
import { useStored } from '../../../shared/store'
import { WeatherMark } from '../../../shared/ui'
import '../activities.css'

/**
 * The weather the next juego is picked for, in Home's corner (JUG-191), so
 * the parent can see Ludi takes it into account. The drawing plays once when
 * it appears; a tap plays it again and shows its line beside it, and a tap
 * anywhere else puts the line away. Nothing shows while there is no weather:
 * a family that hasn't said where they live, a forecast that couldn't be
 * read, or an answer kept too long while offline.
 */
export function WeatherNote() {
  const outside = useStored('outside')
  const [open, setOpen] = useState(false)
  // Each tap that opens the line plays the drawing again.
  const [plays, setPlays] = useState(0)
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null))
  const lineId = useId()

  useEffect(() => {
    // Asked on every visit and on return to the foreground: the API keeps the
    // forecast, and night comes on its clock. A failure leaves what was kept.
    const refresh = () => {
      if (document.visibilityState === 'visible') loadOutside().catch(() => {})
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  useEffect(() => {
    if (!open) return
    const away = (/** @type {PointerEvent} */ event) => {
      if (!ref.current?.contains(/** @type {Node} */ (event.target))) setOpen(false)
    }
    const escape = (/** @type {KeyboardEvent} */ event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  if (!outside) return null
  const { sky, line } = outsideLook(outside)

  const tap = () => {
    if (!open) setPlays((count) => count + 1)
    setOpen(!open)
  }

  return (
    <div className="weather-note" ref={ref}>
      {/* Voice pass pending: "El clima". */}
      <button
        type="button"
        className="weather-note__button"
        aria-label="El clima"
        aria-expanded={open}
        aria-controls={lineId}
        onClick={tap}
      >
        <WeatherMark key={`${sky}-${plays}`} sky={sky} />
      </button>
      {/* Always there, so a screen reader reads the line when it arrives. */}
      <div id={lineId} role="status">
        {open && <p className="weather-note__line">{line}</p>}
      </div>
    </div>
  )
}
