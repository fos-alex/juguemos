import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // Plain JS route tree: JSDoc guides, nothing typechecks.
    tanstackRouter({ target: 'react', autoCodeSplitting: true, disableTypes: true }),
    react(),
    VitePWA({
      // Each deploy's worker takes over on its own and deletes the old caches;
      // app/updates.js reloads the page at a safe moment.
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Ludi',
        short_name: 'Ludi',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFF9F0',
        theme_color: '#FFF9F0',
        // One drawing covers both purposes: public/icon.svg is full bleed, so a
        // phone can crop it to any shape, and its ronda stays inside the
        // maskable safe zone. public/ holds the PNGs it was rendered to.
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff}'],
        // Spanish needs Latin and Latin-Ext only; other subsets still load on demand via unicode-range.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,hebrew,math,symbols}-*.woff2'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        // Google sends the browser to /api/auth/callback/google, which has to
        // reach the API instead of being answered with the app.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // Behind Caddy in the dev stack (compose.dev.yml), requests arrive for
    // ludi.local and for the phone's Tailscale address.
    allowedHosts: ['ludi.local', '.ts.net'],
    proxy: {
      // The API trusts only its own origin, so the dev server passes as it.
      '/api': {
        target: 'https://ludi.local:3000',
        changeOrigin: true,
        secure: false,
        headers: { origin: 'https://ludi.local:3000' },
      },
    },
  },
})
