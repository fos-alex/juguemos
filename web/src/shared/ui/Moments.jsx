import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import './Moments.css'

/*
 * The one-off moments (JUG-159): small drawings that play once when something
 * finishes, and never ask for anything. Drawn from the tokens so they work in
 * night mode, and all `aria-hidden`: the words around them say what happened.
 * When the phone asks for less motion, the petals don't fall and the drawing
 * is simply there.
 */

/** Where each petal starts across the screen, and how late it lets go, in ms. */
const PETALS = [
  [6, 0],
  [18, 380],
  [29, 120],
  [41, 620],
  [52, 240],
  [63, 520],
  [74, 60],
  [85, 440],
  [94, 300],
  [12, 820],
  [47, 960],
  [80, 760],
]

/**
 * Jacarandá petals coming down once over the whole screen, then gone. For the
 * moment a juego's time is up: silent, and nothing to dismiss.
 */
export function PetalFall() {
  return (
    <div className="petal-fall" aria-hidden="true">
      {PETALS.map(([left, delay], index) => (
        <span
          key={index}
          className="petal-fall__petal"
          style={{ left: `${left}%`, animationDelay: `${delay}ms`, '--sway': index % 2 ? '1' : '-1' }}
        />
      ))}
    </div>
  )
}

/**
 * The end of a story, drawn by hand as the parent reaches it: *Fin* with a
 * line under it by day, and at night a moon and two stars. It draws the first
 * time it comes into view, so a long story doesn't finish drawing off screen.
 */
export function FinMark() {
  const { dark } = useTheme()
  const ref = useRef(/** @type {SVGSVGElement | null} */ (null))
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || seen) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setSeen(true)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [seen])

  return (
    <svg
      ref={ref}
      className={`fin-mark${seen ? ' is-drawn' : ''}`}
      viewBox="0 0 96 44"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {dark ? (
        <>
          <path className="fin-mark__line" pathLength="1" d="M52 6a15 15 0 1 0 14 24A12 12 0 0 1 52 6z" />
          <path className="fin-mark__star" pathLength="1" d="M76 8v8M72 12h8" />
          <path className="fin-mark__star fin-mark__star--late" pathLength="1" d="M26 26v6M23 29h6" />
        </>
      ) : (
        <>
          <path className="fin-mark__line" pathLength="1" d="M22 31c0-8 .5-15 1-22 6-.6 11-.6 15 0M22.5 20c4-.4 7.5-.4 11 0" />
          <path className="fin-mark__line fin-mark__line--i" pathLength="1" d="M46 20v11" />
          <circle className="fin-mark__dot" cx="46" cy="12" r="1.8" />
          <path className="fin-mark__line fin-mark__line--n" pathLength="1" d="M56 31V20m0 5c2-4 5.5-5.5 8.5-5 3 .6 3.5 3.5 3.5 6.5V31" />
          <path className="fin-mark__swash" pathLength="1" d="M16 39c18-3 42-4 64-6" />
        </>
      )}
    </svg>
  )
}
