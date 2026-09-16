import { Dots } from './Buttons'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSlowWait } from '../hooks/useSlowWait'
import './Waiting.css'

/**
 * How long the dots hold the wait on their own. A wait that ends inside it,
 * like a story from a template, never animates at all.
 */
const ANIMATES_AFTER_MS = 700

/** How many pieces each animation is drawn from. */
const PIECES = { ronda: 5 }

/**
 * The waiting animation (JUG-132, JUG-133): a calm, slow loop that says
 * Juguemos is working on it, for the waits the dots alone make look frozen.
 *
 * It is the dots for the first moment and takes over only if the wait lasts,
 * and it is the dots for good when the phone asks for less motion. There is
 * no mascot, character, or cartoon in it, and nothing in it counts: it loops
 * back to where it started, so it never reads as progress.
 *
 * Drawn in CSS from the tokens, like every other graphic in the app, so it
 * works in night mode wherever it is put.
 *
 * @param {{
 *   variant?: 'ronda',
 *   size?: 'strip' | 'screen',
 *   tone?: 'page' | 'reading' | 'on-primary',
 *   className?: string,
 * }} props `size` is the room it takes: `strip` beside a word, `screen` on its
 *   own. `tone` is where it sits: `on-primary` takes the button's own ink, and
 *   `reading` holds it back so it doesn't brighten a dim room.
 */
export function Waiting({ variant = 'ronda', size = 'strip', tone = 'page', className = '' }) {
  const calm = useReducedMotion()
  const animates = useSlowWait(true, ANIMATES_AFTER_MS)

  if (calm || !animates) {
    return <Dots size={size === 'screen' ? 'lg' : 'md'} tone={tone === 'on-primary' ? 'on-primary' : 'page'} />
  }

  const classes = ['waiting', `waiting--${variant}`, `waiting--${size}`, `waiting--${tone}`, className]
  return (
    <span className={classes.filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: PIECES[variant] }, (_, index) => (
        <span key={index} className="waiting__piece" style={{ '--piece': String(index) }} />
      ))}
    </span>
  )
}
