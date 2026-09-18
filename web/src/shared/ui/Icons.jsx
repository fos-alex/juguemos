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

/** It went well, on the feedback tap (JUG-23). @param {IconProps} props */
export function ThumbUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7.5 10.5v10" />
      <path d="M7.5 10.5 11 4a2.2 2.2 0 0 1 3.2 2.3l-.7 4.2h5a2 2 0 0 1 1.95 2.45l-1.6 6a2 2 0 0 1-1.95 1.55H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
    </Icon>
  )
}

/** It wasn't for us, on the feedback tap (JUG-23). The thumb up turned over. @param {IconProps} props */
export function ThumbDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16.5 13.5v-10" />
      <path d="M16.5 13.5 13 20a2.2 2.2 0 0 1-3.2-2.3l.7-4.2h-5a2 2 0 0 1-1.95-2.45l1.6-6a2 2 0 0 1 1.95-1.55h12.4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1z" />
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

/* ¿Qué suena? (JUG-177). */

/** A sound to hear: the speaker and two waves. @param {IconProps} props */
export function SoundIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </Icon>
  )
}

/** Music: two notes joined by a beam, for a juego that plays sound. @param {IconProps} props */
export function MusicIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 17.5V5.5l11-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
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

/**
 * Lo que jugamos (JUG-188). A clock whose rim turns back on itself, for going
 * back to what the family already played and read.
 * @param {IconProps} props
 */
export function HistoryIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.2 13.5A8 8 0 1 0 6.3 6.3L3.8 8.8" />
      <path d="M3.8 4.6v4.2H8" />
      <path d="M12 8v4.4l2.8 1.8" />
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
 * Interest marks (JUG-160, JUG-166): the animals and toys kids love, drawn as
 * line pictograms on the same grid as the rest of the set, and a few things a
 * game leaves behind (a ball, a bow, notes, waves, a paw print). An animal
 * gets an eye as a dot at most, never a mouth or an expression, so none of
 * them becomes a character. Each is the drawing's lines alone, and no line
 * is longer than the story's wait can draw (Waiting.jsx draws 100 units), so
 * the wait can draw the same mark by hand. Which words get which mark is
 * `interestMark()` in the family feature.
 */

/**
 * @typedef {'dinosaur' | 'dragon' | 'dog' | 'cat' | 'horse' | 'unicorn' | 'rabbit' | 'cow' | 'lion' | 'bear' | 'elephant' | 'bird' | 'butterfly' | 'fish' | 'whale' | 'car' | 'truck' | 'tractor' | 'train' | 'plane' | 'boat' | 'rocket' | 'robot' | 'blocks' | 'ball' | 'bow' | 'notes' | 'waves' | 'paw'} Mark
 */

/** @type {Record<Mark, React.ReactNode>} */
export const MARKS = {
  /* Animals. */
  // Dinosaurios: a long-necked dinosaur.
  dinosaur: (
    <>
      <path d="M2.5 17Q6 16.5 8.5 12.5Q11 10 14 11L16.3 6Q17 4 19 4Q21.5 4 21.5 5.5Q21.5 7 19.5 7L18.8 7L17.8 12.5Q17.5 14.5 16 15.2V20H13V16H11V20H8V16Q5.5 17 2.5 17Z" />
      <path d="M19.3 5.5h.01" />
    </>
  ),
  // Dragones: a dragon with its wing up.
  dragon: (
    <>
      <path d="M2.5 16Q5.5 17 8 13.5Q9.5 11.5 13 12L15.5 8Q16.5 6.5 18.5 6.5H20Q21.5 6.5 21.5 8Q21.5 9.5 20 9.5H18.3L17.3 13Q17 15.5 15 16V20H12.5V17H10.5V20H8V17Q5.5 17.8 2.5 16Z" />
      <path d="M10 12L8 3.5L11 6L13.5 4.5L14.5 9.5" />
      <path d="M17 6.8L16.2 4.2M19 6.5L19 4" />
      <path d="M18.6 8h.01" />
      <path d="M2.5 16L2.3 13.5M2.5 16L4.8 17" />
    </>
  ),
  // Perros: a dog in profile.
  dog: (
    <>
      <path d="M5.5 11H14L15 7Q15.5 4.5 18 4.5Q19.8 4.5 20.2 6L21.3 6.8Q21.7 9 19.5 9H17.7L17.2 12.2Q17 14 16 14.7V19.5H14V15.5H8.5V19.5H6.5V14.7Q5.5 14 5.5 11Z" />
      <path d="M16.2 5.2Q14.4 5.4 14.5 8.6" />
      <path d="M5.5 11.5Q3 10.5 3.5 7.5" />
      <path d="M18.5 6.7h.01" />
    </>
  ),
  // Gatos: a cat sitting.
  cat: (
    <>
      <path d="M7.5 3L9.3 5.8H12.7L14.5 3L15.2 7.5Q15.5 10 13.5 11.5Q18 14 17.5 18.5Q17.3 21 14 21H9Q6.5 21 6.5 18.5Q6.5 14 10.5 11.5Q6.8 10 6.8 7.5Z" />
      <path d="M17 19.5Q21 19 20.5 15Q20.3 13 21.5 12" />
      <path d="M9.8 8h.01M12.2 8h.01" />
      <path d="M12 16v5" />
    </>
  ),
  // Caballos: a horse in profile.
  horse: (
    <>
      <path d="M5 10H14L16 5Q16.5 3.5 18 4L21.5 8Q21.8 9.5 20.3 9.5L17.8 8.5L16.5 12V20H14.5V14H8V20H6.5V13.5Q5 12.5 5 10Z" />
      <path d="M17 4.2L17.6 2.8" />
      <path d="M5 10.5Q2.5 11 3 16" />
      <path d="M18.5 6.2h.01" />
    </>
  ),
  // Unicornios: a unicorn's head.
  unicorn: (
    <>
      <path d="M8.5 20.5Q8.5 13 11 9.5L12.5 7L15.5 6.5L20.5 11.5Q21.5 13 20 14Q18.5 14.5 17 13.5L15.5 12.5Q14.5 16 16 20.5Z" />
      <path d="M15 6.8L18.5 2.5" />
      <path d="M12.5 7L12 4L14.2 6.7" />
      <path d="M11 9Q8.5 9.5 9.5 12Q7.5 13 8.7 15.5" />
      <path d="M16 9.5h.01" />
    </>
  ),
  // Conejos: a rabbit sitting.
  rabbit: (
    <>
      <path d="M8 20.5Q3.5 20.5 4 15.5Q4.5 11 10 11Q12 9 14 9Q18 8.5 18.5 11.5Q18.8 13.5 16 14L15.5 14Q17 17 15 20.5Z" />
      <path d="M13.5 9.5Q11 5 12 3Q13.5 2.5 15 8.8" />
      <path d="M15 8.8Q16 3.5 17.5 3.8Q18.5 4.5 16.8 9.3" />
      <path d="M16 11h.01" />
    </>
  ),
  // La granja: a cow.
  cow: (
    <>
      <rect x="3.5" y="9" width="12.5" height="6.5" rx="2.5" />
      <path d="M6 15.5V20M9 15.5V20M11 15.5V20M14 15.5V20" />
      <path d="M15.5 6H20.5V12.5Q20.5 14 19 14H17Q15.5 14 15.5 12.5Z" />
      <path d="M15.5 6Q14.2 5.5 14.5 3.5M20.5 6Q21.8 5.5 21.5 3.5" />
      <path d="M15.5 11H20.5" />
      <path d="M7 9Q7.5 12 10.5 11.5Q12 11 11.5 9" />
      <path d="M3.5 11Q2.3 12.5 2.8 15" />
      <path d="M17.2 8.7h.01M18.8 8.7h.01" />
    </>
  ),
  // Leones: a lion's mane.
  lion: (
    <>
      <path d="M12 5.8A1.98 1.98 0 0 1 15.46 6.82A1.98 1.98 0 0 1 17.82 9.54A1.98 1.98 0 0 1 18.33 13.11A1.98 1.98 0 0 1 16.84 16.39A1.98 1.98 0 0 1 13.8 18.34A1.98 1.98 0 0 1 10.2 18.34A1.98 1.98 0 0 1 7.16 16.39A1.98 1.98 0 0 1 5.67 13.11A1.98 1.98 0 0 1 6.18 9.54A1.98 1.98 0 0 1 8.54 6.82A1.98 1.98 0 0 1 12 5.8Z" />
      <circle cx="12" cy="12.4" r="3.8" />
      <path d="M12 13.2V14.2" />
      <path d="M10.5 11.4h.01M13.5 11.4h.01" />
    </>
  ),
  // Osos y peluches: a teddy bear.
  bear: (
    <>
      <circle cx="12" cy="8.5" r="4.3" />
      <path d="M8.06 6.78A2 2 0 1 1 9.8 4.81" />
      <path d="M14.2 4.81A2 2 0 1 1 15.94 6.78" />
      <circle cx="12" cy="10" r="1.5" />
      <path d="M8.8 11.5Q6 13 6 16.5Q6 20.5 9.5 20.5H14.5Q18 20.5 18 16.5Q18 13 15.2 11.5" />
      <path d="M10.2 7.3h.01M13.8 7.3h.01" />
      <path d="M12 20.5V17.5" />
    </>
  ),
  // Elefantes: an elephant with its trunk down.
  elephant: (
    <>
      <path d="M17 14.5V20H14.5V16H8.5V20H6V15.5Q4 14 4 11Q4 6 10 6H14.5Q19.5 6 20 11V16.5Q20 18 21.5 18" />
      <path d="M21.5 16.3Q18 16 18 13L17 14.5" />
      <path d="M13.5 7.5Q10.5 8 11 11.5Q11.5 14 14.5 13" />
      <path d="M17 9.5h.01" />
      <path d="M4 10.5L3 13" />
    </>
  ),
  // Pájaros: a bird sitting.
  bird: (
    <>
      <path d="M18.5 7Q18.5 4 15.5 4Q12.5 4 12.5 7.5Q8 8 5.5 12L2.5 13L5 14.5Q7 18.5 12 18.5Q18.5 18.5 18.5 12Z" />
      <path d="M18.5 6.5L21 7.8L18.5 8.8" />
      <path d="M9 12Q12 11 14.5 13Q12.5 15.5 9 12Z" />
      <path d="M12 18.5V21M15 18.3V21" />
      <path d="M16 6.5h.01" />
    </>
  ),
  // Mariposas y bichos: a butterfly.
  butterfly: (
    <>
      <path d="M12 7V19" />
      <path d="M12 10Q8 3 4.5 4.5Q2.5 5.5 4 9.5Q5 12 12 12" />
      <path d="M12 10Q16 3 19.5 4.5Q21.5 5.5 20 9.5Q19 12 12 12" />
      <path d="M12 12Q6 12 5.5 15.5Q5.5 19 8.5 18.5Q11 18 12 14" />
      <path d="M12 12Q18 12 18.5 15.5Q18.5 19 15.5 18.5Q13 18 12 14" />
      <path d="M12 7L10 3.5M12 7L14 3.5" />
    </>
  ),
  // Peces: a fish.
  fish: (
    <>
      <path d="M7 12C8.5 8 12 6 15 6C18.5 6 20.5 9 21.5 12C20.5 15 18.5 18 15 18C12 18 8.5 16 7 12Z" />
      <path d="M7 12L3 8.5V15.5Z" />
      <path d="M17.5 10.5h.01" />
      <path d="M13 9Q14.5 12 13 15" />
    </>
  ),
  // Ballenas y delfines: a whale blowing water.
  whale: (
    <>
      <path d="M21 13.5Q21 18 15.5 18Q10 18 7.5 14L5 11.5L2.5 12.5L3.5 9L6.5 9.5L9 12Q11 9.5 15.5 9.5Q21 9.5 21 13.5Z" />
      <path d="M15 8V5M15 5Q14 3 12.5 4M15 5Q16 3 17.5 4" />
      <path d="M17.5 12.5h.01" />
    </>
  ),

  /* Toys and things that go. */
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
  // Camiones: a dump truck.
  truck: (
    <>
      <path d="M2.5 15.5V11H13V15.5" />
      <path d="M3.5 11L2.5 6L12.5 7.8L13 11" />
      <path d="M13 9H17L20.5 12.5V16.5H18.8" />
      <path d="M13 16.5H15M9 16.5H10.5M2.5 15.5V16.5H5" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="16.9" cy="17" r="2" />
      <path d="M15 9V12.5H20" />
    </>
  ),
  // Tractores y máquinas de obra: a big back wheel and a small front one.
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
  // Aviones: a plane seen from above.
  plane: (
    <>
      <path d="M12 2.5Q13.5 2.5 13.5 5V9.5L21 14V16L13.5 13.5V18L16 20V21.5L12 20.5L8 21.5V20L10.5 18V13.5L3 16V14L10.5 9.5V5Q10.5 2.5 12 2.5Z" />
    </>
  ),
  // Barcos y piratas: a sailboat.
  boat: (
    <>
      <path d="M3 15H21L18.5 19.5H5.5Z" />
      <path d="M12 15V3" />
      <path d="M12 3.5L19 13H12" />
      <path d="M10 6L5 13H10Z" />
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
  // Robots: a robot's head.
  robot: (
    <>
      <rect x="5" y="8" width="14" height="11" rx="2" />
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" />
      <circle cx="9.5" cy="12.5" r="1.2" />
      <circle cx="14.5" cy="12.5" r="1.2" />
      <path d="M9.5 16H14.5" />
      <path d="M3 12V15M21 12V15" />
    </>
  ),
  // Bloques: three blocks stacked.
  blocks: (
    <>
      <rect x="3" y="12.5" width="8.5" height="8.5" rx="1.5" />
      <rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1.5" />
      <rect x="7.8" y="3" width="8.5" height="8.5" rx="1.5" />
      <path d="M10.2 9.2L12 5.3L13.8 9.2M10.8 8H13.2" />
      <circle cx="16.75" cy="16.75" r="2" />
      <path d="M5.3 18.5H9.2L7.25 15Z" />
    </>
  ),

  /* What a game leaves behind. */
  // Fútbol: a ball.
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 8.2 3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
      <path d="M12 8.2V3.5M15.2 10.5l4.4-1.4M14 14.3l2.7 3.8M10 14.3l-2.7 3.8M8.8 10.5 4.4 9.1" />
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
  // El agua, el mar y los piratas: waves.
  waves: (
    <>
      <path d="M3 7c1.5 0 1.5-1.5 3-1.5S7.5 7 9 7s1.5-1.5 3-1.5S13.5 7 15 7s1.5-1.5 3-1.5S19.5 7 21 7" />
      <path d="M3 12c1.5 0 1.5-1.5 3-1.5S7.5 12 9 12s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
      <path d="M3 17c1.5 0 1.5-1.5 3-1.5S7.5 17 9 17s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
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
}

/** One interest's mark, from the set above. @param {IconProps & { mark: Mark }} props */
export function MarkIcon({ mark, ...props }) {
  return <Icon {...props}>{MARKS[mark]}</Icon>
}
