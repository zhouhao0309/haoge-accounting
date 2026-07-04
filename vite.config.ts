import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve('src/renderer'),
  base: './',
  build: {
    outDir: resolve('out/renderer'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve('src/renderer/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
