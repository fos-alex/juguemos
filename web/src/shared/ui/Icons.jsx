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
