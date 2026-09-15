import './Wordmark.css'

/**
 * The working wordmark: "Juguemos" and the ronda of three dots. The dots are
 * never scaled beyond the splash size and never given a face.
 * @param {{ size?: 'app' | 'splash' }} props
 */
export function Wordmark({ size = 'app' }) {
  return (
    <span className={`wordmark wordmark--${size}`} role="img" aria-label="Juguemos">
      <span className="wordmark__word" aria-hidden="true">
        Juguemos
      </span>
      <span className="wordmark__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  )
}
