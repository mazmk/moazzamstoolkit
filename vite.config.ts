import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

import { seo } from './build/seo.ts'

export default defineConfig({
  // '/' locally; the Pages workflow sets VITE_BASE to '/<repo>/'.
  base: process.env.VITE_BASE || '/',
  plugins: [tailwindcss(), react(), seo()],
  // ffmpeg.wasm spawns its worker with `new URL('./worker.js', import.meta.url)`; pre-bundling
  // would move the module and break that URL in dev.
  // jSquash codecs find their .wasm the same way, so they're excluded for the same reason.
  // Worker-only deps are pre-bundled up front; discovered later, Vite would reload the page mid-batch.
  optimizeDeps: {
    include: ['fflate', 'upng-js', 'node-unrar-js'],
    exclude: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      '@jsquash/jpeg',
      '@jsquash/webp',
      '@jsquash/avif',
      '@jsquash/oxipng',
    ],
  },
  // ES-module workers, so the image compressor's workers can lazy-load codecs with import().
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
