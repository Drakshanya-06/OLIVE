import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api and /media are proxied to Django so you never hit CORS problems.
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900, rollupOptions: { output: { manualChunks: { charts: ['recharts'], maps: ['leaflet', 'react-leaflet'] } } } },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
