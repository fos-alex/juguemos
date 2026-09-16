import './Card.css'

/**
 * A white card with a hairline border, or the lilac `accent` card kept for
 * "Por qué ahora". Pass `onClick` to make the whole card one tap target, and
 * `pressed` as well when that tap turns the card on and off.
 * @param {{
 *   tone?: 'default' | 'accent', onClick?: () => void, pressed?: boolean,
 *   className?: string, children: React.ReactNode,
 * }} props
 */
export function Card({ tone = 'default', onClick, pressed, className = '', children }) {
  const classes = `card card--${tone} ${className}`
  if (onClick) {
    return (
      <button type="button" className={`${classes} card--button`} aria-pressed={pressed} onClick={onClick}>
        {children}
      </button>
    )
  }
  return <div className={classes}>{children}</div>
}

/**
 * Uppercase metadata: `15 MIN · ADENTRO` (13 px, .06em) or, with `wide`, a row
 * label like `CHICOS` (12 px, .1em).
 * @param {{ tone?: 'grass' | 'faint' | 'primary' | 'muted', wide?: boolean, as?: 'div' | 'span' | 'h2', className?: string, children: React.ReactNode }} props
 */
export function MetaLabel({ tone = 'faint', wide = false, as: Tag = 'div', className = '', children }) {
  return <Tag className={`meta${wide ? ' meta--wide' : ''} tone-${tone} ${className}`}>{children}</Tag>
}

/**
 * A short bold label that isn't uppercase: `Por qué ahora`, `Más fácil`.
 * @param {{ tone?: 'grass' | 'faint' | 'primary' | 'muted', small?: boolean, as?: 'div' | 'h2', children: React.ReactNode }} props
 */
export function Label({ tone = 'muted', small = false, as: Tag = 'h2', children }) {
  return <Tag className={`label${small ? ' label--sm' : ''} tone-${tone}`}>{children}</Tag>
}

/**
 * A lilac placeholder block that holds the space of what is coming.
 * @param {{ width?: string | number, height: number, round?: boolean, tone?: 'default' | 'soft' | 'accent' | 'accent-strong', className?: string }} props
 */
export function Skeleton({ width = '100%', height, round = false, tone = 'default', className = '' }) {
  return (
    <span
      className={`skeleton skeleton--${tone}${round ? ' skeleton--round' : ''} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
