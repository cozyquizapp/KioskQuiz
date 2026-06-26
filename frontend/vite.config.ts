import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false
    }),
    VitePWA({
      // 'prompt' lässt das Plugin KEIN auto-Registration-Snippet injizieren.
      // Wir registrieren selbst in main.tsx mit Auto-Reload + Update-Polling
      // (60s), damit neue Builds nicht im Service-Worker-Cache hängen bleiben
      // und User keine Caches manuell leeren müssen.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'logo.ico', 'logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cozy Quiz Team',
        short_name: 'CozyQuiz',
        description: 'Cozy Wolf Quiz — Team View',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/team',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.png', sizes: '1500x1500', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cache app shell (JS/CSS/HTML/fonts/images).
        // 2026-05-07: cozywolf-PNGs via sharp komprimiert (3000x3000 + 4-5 MB
        // → 1024x1024 indexed-PNG + ~200-250 KB pro Pose, -94 %). Jetzt klein
        // genug fuer Standard-Precache, kein Exclude mehr noetig.
        // 2026-05-08: avif + webp dazu — sharp-Pipeline (compress-cozywolf.js)
        // erzeugt jetzt drei Formate pro Pose, <CozyWolfImage> picked via
        // <picture>. SW muss alle drei precachen, sonst zieht der Browser die
        // AVIF-Variante on-demand bei jedem Cold-Load.
        // 2026-05-08 (Sound-Audit-Lücke): wav dazu — SFX (44-345 KB) instant
        // statt on-demand-Latenz. mp3 NICHT inkludiert: Lobby-BG-Tracks sind
        // 4-5 MB jeweils, würden Precache massiv aufblähen + überschreiten
        // das 3-MB-Limit. BG-Music läuft eh dauerhaft, on-demand-Load OK.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,avif,wav}'],
        // 3 MB Limit fuer joker-PNGs (2.3 MB) und category-Logos (1.7 MB).
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Fall back to index.html for SPA navigation, but not for API/socket routes
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        // Sobald ein neuer SW installiert ist, sofort übernehmen und alle
        // Tabs zwingen, mit dem neuen Cache zu arbeiten — sonst bleibt die
        // alte Version im Browser hängen, bis alle Tabs/PWA-Instanzen zur
        // Domain geschlossen sind. Zusammen mit dem registerSW-Polling in
        // main.tsx kommt jeder neue Build zeitnah beim User an.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor-Splitting fuer die schwersten Libs — durch separate Chunks
        // laedt /team auf Phones deutlich schneller, weil Browser-Cache pro
        // Vendor-Chunk wiederverwendet wird.
        // 2026-05-06 (Cleanup): three/leaflet/react-leaflet/@react-three
        // raus — wurden nur von QQCityLabPage gebraucht, die ist geloescht.
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('html2canvas')) return 'vendor-canvas';
            if (id.includes('qrcode')) return 'vendor-qrcode';
            if (id.includes('react-router')) return 'vendor-router';
            // 2026-06-26: Three.js-Stack (3D-Landing-Hero) in eigenen Chunk —
            // MUSS vor der react-Regel stehen, sonst landet @react-three/* (enthaelt
            // "react") in vendor-react und wuerde auf JEDER Seite eager geladen.
            // Eigener Chunk → laedt nur lazy mit QQDemoShowcase3D.
            if (
              id.includes('three') || id.includes('@react-three') || id.includes('postprocessing') ||
              id.includes('react-reconciler') || id.includes('its-fine') || id.includes('suspend-react') ||
              id.includes('react-use-measure') || id.includes('zustand') || id.includes('maath')
            ) return 'vendor-three';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          }
          if (id.includes('/admin/')) return 'admin';
          if (id.includes('/components/') && id.includes('Editor')) return 'editors';
          return undefined;
        }
      }
    }
  }
});
