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
        name: 'Juguemos',
        short_name: 'Juguemos',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFF9F0',
        theme_color: '#FFF9F0',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff}'],
        // Spanish needs Latin and Latin-Ext only; other subsets still load on demand via unicode-range.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,hebrew,math,symbols}-*.woff2'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    proxy: {
      // The API trusts only its own origin, so the dev server passes as it.
      '/api': {
        target: 'https://juguemos.local:3000',
        changeOrigin: true,
        secure: false,
        headers: { origin: 'https://juguemos.local:3000' },
      },
    },
  },
})
