import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import './Moments.css'

/*
 * The one-off moments (JUG-159): small drawings that play once when something
 * starts or finishes, and never ask for anything. Drawn from the tokens so they
 * work in night mode, and all `aria-hidden`: the words around them say what
 * happened. When the phone asks for less motion, the petals don't fall and the
 * drawing is simply there.
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

/**
 * The strokes of "Ludi" in the order a hand writes them, with when each starts
 * and how long it takes, in ms, at about one pen speed. They were traced from
 * Fredoka 600's own outlines, with the wordmark's kerning and letter-spacing,
 * so the finished drawing is the wordmark: the viewBox is the text's box in
 * tens of font units, and each stroke is as wide as its letter's stem.
 * @type {{ d: string, width?: number, at: number, ms: number }[]}
 */
const LUDI_STROKES = [
  { d: 'M13.1 36V90.8', width: 15.2, at: 0, ms: 100 },
  { d: 'M13.1 91.8H48.1', width: 13.2, at: 100, ms: 70 },
  { d: 'M64.2 55.8V73.9C64.2 84.6 70.3 90.8 80.9 90.8C87.5 90.8 97.6 84.4 97.6 73.9V55.8', at: 210, ms: 160 },
  { d: 'M97.6 55.8V90.8', at: 370, ms: 70 },
  {
    d: 'M149.9 64.5C147.9 60.6 142 55.8 134.9 55.8C125.1 55.8 117.7 63.3 117.7 73.3C117.7 83.3 125.2 90.8 135.1 90.8C142 90.8 147.9 86 149.8 82.2',
    at: 480,
    ms: 170,
  },
  { d: 'M152.4 33.1V90.8', width: 15.2, at: 680, ms: 110 },
  { d: 'M174.6 55.9V90.9', at: 830, ms: 70 },
]

/** When the pen lifts from the last stroke: the i's dot and the ronda come after. */
const LUDI_WRITTEN = Math.max(...LUDI_STROKES.map(({ at, ms }) => at + ms))

/**
 * The wordmark writing itself, for Bienvenida (JUG-173): "Ludi" stroke by
 * stroke, then the i's dot, then the ronda hops in one dot after another, in
 * about a second and a half. It is the splash wordmark at rest, with the same
 * size and dots, so with reduced motion it is simply there. The screen's
 * heading says the name.
 */
export function DrawnWordmark() {
  return (
    <span
      className="wordmark wordmark--splash drawn-wordmark"
      style={{ '--written': `${LUDI_WRITTEN}ms` }}
      aria-hidden="true"
    >
      <svg
        className="wordmark__word drawn-wordmark__word"
        viewBox="0 0 185.2 121"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {LUDI_STROKES.map(({ d, width, at, ms }) => (
          <path key={d} d={d} pathLength="1" strokeWidth={width} style={{ '--at': `${at}ms`, '--for': `${ms}ms` }} />
        ))}
        <rect className="drawn-wordmark__dot" x="166.9" y="25.6" width="15.4" height="15.5" rx="6.2" />
      </svg>
      <span className="wordmark__dots">
        <span />
        <span />
        <span />
      </span>
    </span>
  )
}
