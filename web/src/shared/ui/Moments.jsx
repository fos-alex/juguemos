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

/** @typedef {'sun' | 'heat' | 'cloud' | 'fog' | 'rain' | 'storm' | 'wind' | 'cold' | 'moon'} Sky */

/** The cloud over rain and over a storm, smaller and higher than a cloud alone. */
const HIGH_CLOUD = 'M13.62 23.65H26.38A5.52 5.52 0 0 0 26.89 12.63A7.22 7.22 0 0 0 13.03 14.55A4.59 4.59 0 0 0 13.62 23.65z'

/** Each weather's drawing, on a 40 px grid. Every part that moves has its own class. @type {Record<Sky, React.ReactNode>} */
const SKIES = {
  sun: (
    <>
      <circle className="weather-mark__sun" cx="20" cy="20" r="7.5" />
      <path
        className="weather-mark__rays"
        d="M31.5 20h4M28.13 28.13l2.83 2.83M20 31.5v4M11.87 28.13l-2.83 2.83M8.5 20h-4M11.87 11.87 9.04 9.04M20 8.5v-4M28.13 11.87l2.83-2.83"
      />
    </>
  ),
  heat: (
    <>
      <circle className="weather-mark__sun" cx="20" cy="15" r="5.5" />
      <path
        className="weather-mark__rays"
        d="M28.5 15h3M26.01 21.01l2.12 2.12M20 23.5v3M13.99 21.01l-2.12 2.12M11.5 15h-3M13.99 8.99l-2.12-2.12M20 6.5v-3M26.01 8.99l2.12-2.12"
      />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '320ms' }} d="M8 31q3-3 6 0t6 0 6 0 6 0" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '420ms' }} d="M12 36q3-3 6 0t6 0 6 0" />
    </>
  ),
  cloud: (
    <path
      className="weather-mark__cloud"
      d="M12.5 30.5H27.5A6.5 6.5 0 0 0 28.1 17.53A8.5 8.5 0 0 0 11.8 19.8A5.4 5.4 0 0 0 12.5 30.5z"
    />
  ),
  fog: (
    <>
      <path className="weather-mark__line" pathLength="1" d="M8 13h18" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '110ms' }} d="M13 19.5h19" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '220ms' }} d="M8 26h20" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '330ms' }} d="M14 32.5h14" />
    </>
  ),
  rain: (
    <>
      <path className="weather-mark__cloud" d={HIGH_CLOUD} />
      <path className="weather-mark__drop" style={{ '--at': '300ms' }} d="m14 29.5-1.5 4" />
      <path className="weather-mark__drop" style={{ '--at': '420ms' }} d="m20.5 29.5-1.5 4" />
      <path className="weather-mark__drop" style={{ '--at': '360ms' }} d="m27 29.5-1.5 4" />
    </>
  ),
  storm: (
    <>
      <path className="weather-mark__cloud" d={HIGH_CLOUD} />
      <path className="weather-mark__bolt" d="M22.5 22 17 30h4.5l-2 7 7.5-9.5h-4.5l2.5-5.5z" />
    </>
  ),
  wind: (
    <>
      <path className="weather-mark__line" pathLength="1" d="M5 14h13.5a3 3 0 1 0-2.12-5.12" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '120ms' }} d="M5 20h26.25a3.75 3.75 0 1 0-2.66-6.4" />
      <path className="weather-mark__line" pathLength="1" style={{ '--at': '240ms' }} d="M5 26h18a3 3 0 1 1-2.12 5.12" />
    </>
  ),
  cold: (
    <>
      <g className="weather-mark__hat">
        <path className="weather-mark__dome" d="M9.5 26a10.5 10.5 0 0 1 21 0" />
        <rect className="weather-mark__band" x="8" y="26" width="24" height="6.5" rx="3.25" />
        <path d="M14 28.5V30M20 28.5V30M26 28.5V30" />
      </g>
      <circle className="weather-mark__pompom" cx="20" cy="12" r="3.2" />
    </>
  ),
  moon: (
    <>
      <path className="weather-mark__moon" d="M25 10.1A12 12 0 1 0 31.3 25.1 9 9 0 0 1 25 10.1z" />
      <path className="weather-mark__star" style={{ '--at': '380ms' }} d="M31 5.5v5M28.5 8h5" />
      <path className="weather-mark__star" style={{ '--at': '480ms' }} d="M35 15v3M33.5 16.5h3" />
    </>
  ),
}

/**
 * The weather a juego is picked for, drawn for Home's corner (JUG-191): a
 * sun, heat, a cloud, fog, rain, a storm, wind, a wool hat for the cold, or
 * the moon at night. It plays once when it appears, in under a second: the
 * rays turn in, the rain falls, the wind blows through, the moon swings in.
 * Line drawings in the primary, with the sun's yellow as the one fill, so
 * they read on sand and at night. The words beside it say what it means.
 * @param {{ sky: Sky, className?: string }} props
 */
export function WeatherMark({ sky, className = '' }) {
  return (
    <svg
      className={`weather-mark ${className}`.trim()}
      viewBox="0 0 40 40"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SKIES[sky]}
    </svg>
  )
}
