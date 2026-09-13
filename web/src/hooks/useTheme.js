import { useSyncExternalStore } from 'react'

const listeners = new Set()

function isDark() {
  return document.documentElement.dataset.theme === 'dark'
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function toggleTheme() {
  document.documentElement.dataset.theme = isDark() ? 'light' : 'dark'
  localStorage.setItem('theme', document.documentElement.dataset.theme)
  syncThemeColor()
  for (const listener of listeners) listener()
}

export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, isDark)
}
