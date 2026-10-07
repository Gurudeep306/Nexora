import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { WALLPAPERS } from './src/theme/catalog.ts'

/**
 * The first-paint script in index.html needs to know each wallpaper's kind,
 * accent, tone and colours before any bundle has loaded. Rather than keep a
 * second copy of the catalogue in the HTML, inject a compact table of it at
 * build (and dev) time, so src/theme/catalog.ts stays the only source.
 */
function lookBoot(): Plugin {
  const table = Object.fromEntries(
    WALLPAPERS.map((w) => [
      w.id,
      w.kind === 'original'
        ? ['o', w.accent, w.color.dark, w.color.light, w.tint.dark, w.tint.light]
        : w.kind === 'photo'
          ? ['p', w.accent, w.tone, w.color, w.tint]
          : ['n', w.accent],
    ]),
  )
  return {
    name: 'nexora-look-boot',
    transformIndexHtml: (html) => html.replace('/*__WALLPAPERS__*/{}', JSON.stringify(table)),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), lookBoot()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth/github': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth/google': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      '/gate-fig': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
