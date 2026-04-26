import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        // Aquarell-Avatare in /avatars/gouache/* werden NICHT gecacht — die
        // sind aktuell unkomprimiert (9-13 MB pro Bild) und sprengen das
        // Workbox-Limit. Sie werden zur Laufzeit normal vom Server geladen.
        // Vor Production-Deploy → durch sharp-Pipeline auf <500 KB schrumpfen,
        // dann kann das Exclude wieder weg (siehe GOUACHE_PLAN.md Phase 5).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/avatars/gouache/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Fall back to index.html for SPA navigation, but not for API/socket routes
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('html2canvas')) return 'vendor-canvas';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          }
          if (id.includes('/admin/')) return 'admin';
          if (id.includes('/components/') && (id.includes('Editor') || id.includes('Editor'))) return 'editors';
          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 750
  }
});
