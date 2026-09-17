import { Dots } from './Buttons'
import { MARKS } from './Icons'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSlowWait } from '../hooks/useSlowWait'
import './Waiting.css'

/** @typedef {import('./Icons').Mark} Mark */
/** @typedef {'crayon' | 'pencil' | 'pen'} Tool */

/**
 * How long the dots hold the wait on their own. A wait that ends inside it,
 * like a story from a template, never animates at all.
 */
const ANIMATES_AFTER_MS = 700

/** How many dots the ronda turns. */
const RONDA_PIECES = 5

/**
 * What each tool draws when the story has no mark: a toddler's zigzag, a
 * house, and a line of handwriting. On the icons' 24 px grid.
 * @type {Record<Tool, React.ReactNode>}
 */
const SCRIBBLES = {
  crayon: <path d="M3 16 6 7l2.5 10L12 6l2.5 11L18 7l3 9" />,
  pencil: (
    <>
      <path d="M4.5 20v-8.5L12 5l7.5 6.5V20z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  pen: (
    <>
      <path d="M2.5 11c2 0 3-6 4.5-6S7.5 11 9 11s2.5-6 4-6 1.5 6 3 6 2.5-6 4-6 1 4 1.5 5" />
      <path d="M2.5 18h13" />
    </>
  ),
}

/**
 * The waiting animation (JUG-132, JUG-133, JUG-160): a slow loop that says
 * Ludi is working on it, for the waits the dots alone make look frozen.
 *
 * It is the dots for the first moment and takes over only if the wait lasts,
 * and it is the dots for good when the phone asks for less motion. There is
 * no mascot, character, or cartoon in it, and nothing in it counts: it loops
 * back to where it started, so it never reads as progress.
 *
 * Drawn from the tokens, like every other graphic in the app, so it works in
 * night mode wherever it is put.
 *
 * Two variants. `ronda` is the wordmark's dots holding hands and turning, for
 * every wait but a story's. `drawing` is a story being written: a `tool` by
 * the kids' age draws the story's `mark` by hand, or its own scribble when the
 * story has none. At `strip` size the tool is left out and only the lines draw.
 *
 * @param {{
 *   variant?: 'ronda' | 'drawing',
 *   tool?: Tool,
 *   mark?: Mark | null,
 *   size?: 'strip' | 'screen',
 *   tone?: 'page' | 'reading' | 'on-primary',
 *   className?: string,
 * }} props `size` is the room it takes: `strip` beside a word, `screen` on its
 *   own, at whatever `--waiting-size` the place it sits in gives it. `tone`
 *   is where it sits: `on-primary` takes the button's own ink, and `reading`
 *   holds it back so it doesn't brighten a dim room.
 */
export function Waiting({ variant = 'ronda', tool = 'pencil', mark = null, size = 'strip', tone = 'page', className = '' }) {
  const calm = useReducedMotion()
  const animates = useSlowWait(true, ANIMATES_AFTER_MS)

  if (calm || !animates) {
    return <Dots size={size === 'screen' ? 'lg' : 'md'} tone={tone === 'on-primary' ? 'on-primary' : 'page'} />
  }

  const drawing = variant === 'drawing'
  const classes = [
    'waiting',
    `waiting--${variant}`,
    drawing && `waiting--${tool}`,
    `waiting--${size}`,
    `waiting--${tone}`,
    className,
  ]
  return (
    <span className={classes.filter(Boolean).join(' ')} aria-hidden="true">
      {drawing ? (
        <>
          <svg className="waiting__drawing" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {mark ? MARKS[mark] : SCRIBBLES[tool]}
          </svg>
          {size === 'screen' && <span className="waiting__tool" />}
        </>
      ) : (
        Array.from({ length: RONDA_PIECES }, (_, index) => (
          <span key={index} className="waiting__piece" style={{ '--piece': String(index) }} />
        ))
      )}
    </span>
  )
}
