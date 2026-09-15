import { createContext, use } from 'react'

/** Provided by ThemeProvider in the root layout. */
export const ThemeContext = createContext({ dark: false, toggle: () => {} })

/** The current theme and night mode's one tap. @returns {{ dark: boolean, toggle: () => void }} */
export function useTheme() {
  return use(ThemeContext)
}

/** The phone's status bar takes the page's background. */
export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor)
}
