import { useTheme } from '../hooks/useTheme'

/**
 * Night mode's one tap. The glyph shows where the tap goes: a moon by day, a
 * sun by night. Placeholder glyphs until the 0.2 iconography.
 * Voice pass pending: "Modo noche" / "Modo día".
 */
export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button type="button" className="theme-toggle" aria-label={dark ? 'Modo día' : 'Modo noche'} onClick={toggle}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </>
        ) : (
          <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />
        )}
      </svg>
    </button>
  )
}
