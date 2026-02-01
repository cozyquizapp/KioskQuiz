import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
