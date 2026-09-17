import './Icons.css'

/**
 * The Plaza icon set. Every icon is one 24 px drawing on the same grid: a 2 px
 * line in `currentColor`, round caps and joins, no fill, and nothing inside the
 * outer 2 px of the box. Colour comes from whatever the icon sits in, so night
 * mode needs no second drawing. The rules are in
 * [`docs/design.md`](../../../../docs/design.md).
 *
 * Icons are decorative: the button around one carries the label, so every icon
 * is `aria-hidden`. Add a new icon here rather than writing an `<svg>` in a
 * screen, so the set stays one weight.
 * @param {{ size?: number, className?: string, children: React.ReactNode }} props
 */
function Icon({ size = 24, className = '', children }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** @typedef {{ size?: number, className?: string }} IconProps */

/* Navigation and the small actions. */

/** Back. Also the "cancelar" mark on the voice note, at a smaller size. @param {IconProps} props */
export function BackIcon(props) {
  return (
    <Icon {...props}>
      <path d="M19.5 12H4.5" />
      <path d="M11 5.5 4.5 12 11 18.5" />
    </Icon>
  )
}

/** Straight to Home, from a screen whose back goes somewhere else. @param {IconProps} props */
export function HomeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9v11h12V9" />
      <path d="M10 20v-5.5h4V20" />
    </Icon>
  )
}

/** Close a drawer or a sheet. @param {IconProps} props */
export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6.2 6.2 11.6 11.6" />
      <path d="M17.8 6.2 6.2 17.8" />
    </Icon>
  )
}

/** Chosen, on a toggle or a row. Never the only signal that something is on. @param {IconProps} props */
export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M19.6 6.6 9.4 17.4l-5-5" />
    </Icon>
  )
}

/** Add one more. @param {IconProps} props */
export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4.8v14.4" />
      <path d="M4.8 12h14.4" />
    </Icon>
  )
}

/** Open the menu. @param {IconProps} props */
export function MenuIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  )
}

/** Slide up to fix the recording. @param {IconProps} props */
export function ArrowUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 19.5V4.5" />
      <path d="M5.5 11 12 4.5l6.5 6.5" />
    </Icon>
  )
}

/* The voice note. */

/** The microphone: the capsule, its holder, and the stand. @param {IconProps} props */
export function MicIcon(props) {
  return (
    <Icon {...props}>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17v4" />
      <path d="M8.5 21h7" />
    </Icon>
  )
}

/** The recording stays on without a finger on it. @param {IconProps} props */
export function LockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4.6" y="10.2" width="14.8" height="9.6" rx="2.8" />
      <path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6" />
    </Icon>
  )
}

/* Night mode. */

/** Shown at night, where the tap goes back to day. @param {IconProps} props */
export function SunIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Icon>
  )
}

/** Shown by day, where the tap goes to night. @param {IconProps} props */
export function MoonIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />
    </Icon>
  )
}

/* The menu's sections. */

/**
 * ¡Juguemos! The wordmark's ronda, and the one filled icon in the set: it is
 * the brand mark rather than a pictogram. It keeps the wordmark's three
 * colours, never grows past this size, and never gets a face.
 * @param {IconProps} props
 */
export function RondaIcon({ size = 24, className = '' }) {
  return (
    <svg
      className={`icon icon--ronda ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="6.5" r="4.2" fill="var(--dot-sun)" />
      <circle cx="7.2" cy="14.8" r="4.2" fill="var(--dot-grass)" />
      <circle cx="16.8" cy="14.8" r="4.2" fill="var(--dot-jacaranda)" />
    </svg>
  )
}

/** Hora del cuento. An open book, never a screen. @param {IconProps} props */
export function BookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 7.2v12.3" />
      <path d="M12 7.2C10.6 5.9 8.6 5.2 5.4 5.2A1.4 1.4 0 0 0 4 6.6v10.2a1.4 1.4 0 0 0 1.4 1.4c3.2 0 5.2.7 6.6 2" />
      <path d="M12 7.2c1.4-1.3 3.4-2 6.6-2A1.4 1.4 0 0 1 20 6.6v10.2a1.4 1.4 0 0 1-1.4 1.4c-3.2 0-5.2.7-6.6 2" />
    </Icon>
  )
}

/**
 * Mi familia. A grown-up and a child, as outlines with no faces: a pictogram,
 * not a character.
 * @param {IconProps} props
 */
export function FamilyIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="7.6" cy="6.8" r="3" />
      <path d="M2.6 20.2a5 5 0 0 1 10 0" />
      <circle cx="17.4" cy="11.6" r="2.3" />
      <path d="M14.6 20.2a2.8 2.8 0 0 1 5.6 0" />
    </Icon>
  )
}

/** El baúl de juguetes. The chest, with its lid and clasp. @param {IconProps} props */
export function ToyBoxIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.2" y="9" width="17.6" height="10.8" rx="2.6" />
      <path d="M3.2 13h17.6" />
      <path d="M10.7 13v2.2h2.6V13" />
    </Icon>
  )
}

/** Materiales. Scissors, open, for what there is at home to make things with. @param {IconProps} props */
export function MaterialsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="6.5" cy="6.5" r="2.6" />
      <circle cx="6.5" cy="17.5" r="2.6" />
      <path d="M8.4 15.6 19.5 4.5" />
      <path d="M8.4 8.4 12 12" />
      <path d="M14.2 14.2l5.3 5.3" />
    </Icon>
  )
}

/** Ajustes. Sliders rather than a gear, which reads mechanical. @param {IconProps} props */
export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 8.5h6.6" />
      <circle cx="14" cy="8.5" r="2.4" />
      <path d="M17.4 8.5H20" />
      <path d="M4 15.5h2.6" />
      <circle cx="10" cy="15.5" r="2.4" />
      <path d="M13.4 15.5H20" />
    </Icon>
  )
}

/*
 * Interest marks (JUG-160): what the things kids love leave behind, rather
 * than the things themselves, so none of them is a creature. Each is the
 * drawing's lines alone, so the story's wait can draw the same mark by hand
 * (Waiting.jsx). Which interest gets which mark is `interestMark()` in the
 * family feature.
 */

/** @typedef {'car' | 'footprint' | 'tractor' | 'bow' | 'notes' | 'ball' | 'train' | 'paw' | 'waves' | 'rocket'} Mark */

/** @type {Record<Mark, React.ReactNode>} */
export const MARKS = {
  // Autos: a car in profile.
  car: (
    <>
      <path d="M6 16H3v-3.5L5 8h9l4 4.5h2a1 1 0 0 1 1 1V16h-2" />
      <path d="M10 16h5" />
      <path d="M9.5 8v4.5H18" />
      <circle cx="8" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
    </>
  ),
  // Dinosaurios: a three-toed footprint.
  footprint: (
    <>
      <path d="M12 21c-3.2 0-4.8-2.6-4.2-5.4L3.5 6.5l5.8 4.6L12 3l2.7 8.1 5.8-4.6-4.3 9.1c.6 2.8-1 5.4-4.2 5.4z" />
    </>
  ),
  // Tractores y camiones: a big back wheel and a small front one.
  tractor: (
    <>
      <path d="M5 11V5h6l1.5 6H20v4" />
      <path d="M16 11V7.5" />
      <circle cx="7.5" cy="15.5" r="4.5" />
      <circle cx="7.5" cy="15.5" r="1" />
      <circle cx="18" cy="17.5" r="2.5" />
      <path d="M12 17.5h3.5" />
    </>
  ),
  // Muñecas: a bow.
  bow: (
    <>
      <path d="M12 11 5 7.5c-1.2-.6-2.5.3-2.5 1.6v3.8c0 1.3 1.3 2.2 2.5 1.6z" />
      <path d="m12 11 7-3.5c1.2-.6 2.5.3 2.5 1.6v3.8c0 1.3-1.3 2.2-2.5 1.6z" />
      <circle cx="12" cy="11" r="1.6" />
      <path d="m11 12.6-3 7" />
      <path d="m13 12.6 3 7" />
    </>
  ),
  // Música: two notes.
  notes: (
    <>
      <path d="M9 17.5V6l11-2v11.5" />
      <path d="M9 9.5l11-2" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  // Fútbol: a ball.
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 8.2 3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
      <path d="M12 8.2V3.5M15.2 10.5l4.4-1.4M14 14.3l2.7 3.8M10 14.3l-2.7 3.8M8.8 10.5 4.4 9.1" />
    </>
  ),
  // Trenes: a steam engine in profile.
  train: (
    <>
      <path d="M2.5 8.5h8" />
      <path d="M3.5 16V8.5h6V16" />
      <path d="M9.5 11h9a2.5 2.5 0 0 1 2.5 2.5V16H3.5" />
      <path d="M15.5 11V7h3v4" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  // Animales: a paw print.
  paw: (
    <>
      <path d="M12 12c-2.8 0-5 3.2-5 5.5 0 1.7 1.3 2.5 2.7 2.5 1 0 1.5-.5 2.3-.5s1.3.5 2.3.5c1.4 0 2.7-.8 2.7-2.5 0-2.3-2.2-5.5-5-5.5z" />
      <circle cx="5" cy="10.5" r="1.8" />
      <circle cx="9" cy="5.8" r="2" />
      <circle cx="15" cy="5.8" r="2" />
      <circle cx="19" cy="10.5" r="1.8" />
    </>
  ),
  // El agua, el mar y los piratas: waves.
  waves: (
    <>
      <path d="M3 7c1.5 0 1.5-1.5 3-1.5S7.5 7 9 7s1.5-1.5 3-1.5S13.5 7 15 7s1.5-1.5 3-1.5S19.5 7 21 7" />
      <path d="M3 12c1.5 0 1.5-1.5 3-1.5S7.5 12 9 12s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
      <path d="M3 17c1.5 0 1.5-1.5 3-1.5S7.5 17 9 17s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
    </>
  ),
  // El espacio: a rocket.
  rocket: (
    <>
      <path d="M12 2.5c3 2 4.5 5.5 4.5 9.5V17h-9v-5c0-4 1.5-7.5 4.5-9.5z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M7.5 12.5 4.5 16v3l3-2" />
      <path d="m16.5 12.5 3 3.5v3l-3-2" />
      <path d="M10.5 20.5h3" />
    </>
  ),
}

/** One interest's mark, from the set above. @param {IconProps & { mark: Mark }} props */
export function MarkIcon({ mark, ...props }) {
  return <Icon {...props}>{MARKS[mark]}</Icon>
}
