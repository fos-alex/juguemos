import './Wordmark.css'

/**
 * The working wordmark: "Ludi" and the ronda of three dots. The dots are
 * never scaled beyond the splash size and never given a face.
 * @param {{ size?: 'app' | 'splash' }} props
 */
export function Wordmark({ size = 'app' }) {
  return (
    <span className={`wordmark wordmark--${size}`} role="img" aria-label="Ludi">
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
