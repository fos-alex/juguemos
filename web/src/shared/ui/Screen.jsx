import { useLayoutEffect } from 'react'
import { syncThemeColor } from '../hooks/useTheme'
import { BackIcon } from './Icons'
import './Screen.css'

/**
 * One screen: a column capped at the design width. `tone` repaints the whole
 * page, for the two screens that are meant to feel different.
 * @param {{ tone?: 'default' | 'accent' | 'reading', className?: string, children: React.ReactNode }} props
 */
export function Screen({ tone = 'default', className = '', children }) {
  useLayoutEffect(() => {
    if (tone === 'default') return
    document.body.dataset.tone = tone
    syncThemeColor()
    return () => {
      delete document.body.dataset.tone
      syncThemeColor()
    }
  }, [tone])

  return <main className={`screen screen--${tone} ${className}`}>{children}</main>
}

/**
 * Back arrow, optional inline title, optional trailing slot.
 * @param {{ onBack?: () => void, title?: string, trailing?: React.ReactNode }} props
 */
export function Header({ onBack, title, trailing }) {
  return (
    <header className={`header${trailing ? ' header--split' : ''}`}>
      <div className="header__lead">
        {onBack && <BackButton onClick={onBack} />}
        {title && <h1 className="header__title">{title}</h1>}
      </div>
      {trailing}
    </header>
  )
}

/** @param {{ onClick: () => void }} props */
export function BackButton({ onClick }) {
  return (
    <button type="button" className="back-button" onClick={onClick} aria-label="Volver">
      <BackIcon />
    </button>
  )
}

/** @param {{ className?: string, children: React.ReactNode }} props */
export function Body({ className = '', children }) {
  return <div className={`screen__body ${className}`}>{children}</div>
}

/**
 * The action area at the bottom, in the thumb zone.
 * @param {{ row?: boolean, sticky?: boolean, className?: string, children: React.ReactNode }} props
 */
export function Footer({ row = false, sticky = false, className = '', children }) {
  const classes = ['screen__footer', row && 'screen__footer--row', sticky && 'screen__footer--sticky', className]
  return <div className={classes.filter(Boolean).join(' ')}>{children}</div>
}
