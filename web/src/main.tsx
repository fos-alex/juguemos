import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { announceUpdate, setApplyUpdate } from './lib/updates'
import { syncThemeColor } from './hooks/useTheme'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito-sans'
import './styles/index.css'

const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({ onNeedRefresh: announceUpdate })
    setApplyUpdate(() => updateSW(true))
  })
}

syncThemeColor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
