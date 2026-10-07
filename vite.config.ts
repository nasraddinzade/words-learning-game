import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /words-learning-game/ (SPEC §14). Vercel and other
// root-hosted deploys set BASE_PATH=/ (Vercel is detected by its VERCEL env var).
export const BASE = process.env.BASE_PATH ?? (process.env.VERCEL ? '/' : '/words-learning-game/');

export default defineConfig({
  base: BASE,
  // Fold the dev-tools flag to a constant so the production bundle drops the dev branch.
  define: { 'import.meta.env.VITE_DEV_TOOLS': JSON.stringify(process.env.VITE_DEV_TOOLS ?? '') },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Words Learning Game',
        short_name: 'Words',
        description: 'Arcade for learning 10 000 English words. Works offline.',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b0f1a',
        background_color: '#0b0f1a',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Word batches are loaded on demand and cached as they arrive (SPEC §9.1).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/words/') && url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: { cacheName: 'word-batches', expiration: { maxEntries: 40 } },
          },
        ],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { target: 'es2022', sourcemap: false },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
