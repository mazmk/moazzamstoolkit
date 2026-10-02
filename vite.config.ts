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
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
