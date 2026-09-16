import './Buttons.css'

/**
 * The four buttons. `busy` swaps the label for the waiting dots and ignores
 * taps; `unavailable` looks flat but still receives taps, so a screen can
 * answer them (offline repeats its line instead of failing).
 *
 * `busyMark` puts something else in the dots' place, which is how a long wait
 * gets the waiting animation (JUG-133) without every button in the app taking
 * it on.
 *
 * @typedef {{
 *   size?: string,
 *   busy?: boolean,
 *   busyLabel?: string,
 *   busyMark?: React.ReactNode,
 *   unavailable?: boolean,
 *   className?: string,
 *   children: React.ReactNode,
 * } & React.ButtonHTMLAttributes<HTMLButtonElement>} ButtonProps
 */

/** @param {ButtonProps & { variant: string }} props */
function Button({
  variant,
  size,
  busy = false,
  busyLabel = 'Pensando',
  busyMark,
  unavailable = false,
  className = '',
  type = 'button',
  onClick,
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size && `btn--${size}`,
    busy && 'is-busy',
    unavailable && 'is-unavailable',
    className,
  ]
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(' ')}
      aria-busy={busy || undefined}
      aria-disabled={unavailable || undefined}
      aria-label={busy ? busyLabel : undefined}
      onClick={busy ? (event) => event.preventDefault() : onClick}
      {...rest}
    >
      {busy ? (busyMark ?? <Dots size={size === 'home' ? 'lg' : 'md'} />) : children}
    </button>
  )
}

/** Flat jacarandá. Sizes: `home` (132 px), `bar` (64 px, default), `md` (60 px). @param {ButtonProps} props */
export function PrimaryButton({ size = 'bar', ...props }) {
  return <Button variant="primary" size={size} {...props} />
}

/** White with a grass border. Sizes: `lg` (62 px), default (60 px), `sm` (56 px). @param {ButtonProps & { outline?: 'grass' | 'primary' }} props */
export function SecondaryButton({ outline = 'grass', className = '', ...props }) {
  const classes = outline === 'primary' ? `btn--outline-primary ${className}` : className
  return <Button variant="secondary" className={classes} {...props} />
}

/** A primary demoted to lilac, for the answer the screen no longer recommends. @param {ButtonProps} props */
export function QuietButton(props) {
  return <Button variant="quiet" {...props} />
}

/** Underlined text, no box. Sizes: `lg`, default, `inline` (left-aligned). @param {ButtonProps} props */
export function TertiaryButton(props) {
  return <Button variant="tertiary" {...props} />
}

/** Mocked for now: Sign in with Google is scheduled for 0.3 in docs/releases.md. @param {Omit<ButtonProps, 'children'>} props */
export function GoogleButton({ size, ...props }) {
  return (
    <SecondaryButton size={size} busyLabel="Conectando con Google" {...props}>
      <span className="google-glyph" aria-hidden="true">
        G
      </span>
      Continuar con Google
    </SecondaryButton>
  )
}

/**
 * The one waiting language for the whole app: three slow dots, no spinner.
 * @param {{ size?: 'md' | 'lg', tone?: 'on-primary' | 'page' }} props
 */
export function Dots({ size = 'md', tone = 'on-primary' }) {
  return (
    <span className={`dots dots--${size} dots--${tone}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}
