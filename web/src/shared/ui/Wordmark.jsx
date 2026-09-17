import './Wordmark.css'

/**
 * The working wordmark: "Ludi" and the ronda of three dots. The dots are
 * never scaled beyond the splash size and never given a face. With `greet`,
 * they hop once in turn when it appears (JUG-159).
 * @param {{ size?: 'app' | 'splash', greet?: boolean }} props
 */
export function Wordmark({ size = 'app', greet = false }) {
  return (
    <span className={`wordmark wordmark--${size}${greet ? ' wordmark--greet' : ''}`} role="img" aria-label="Ludi">
      <span className="wordmark__word" aria-hidden="true">
        Ludi
      </span>
      <span className="wordmark__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  )
}
