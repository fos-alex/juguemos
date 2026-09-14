import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { keepUpToDate } from './lib/updates'
import { applyInitialTheme } from './components/ThemeProvider'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito-sans'
import './styles/index.css'

const router = createRouter({ routeTree, defaultPreload: 'intent' })

if (import.meta.env.PROD) void keepUpToDate(router)

applyInitialTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
