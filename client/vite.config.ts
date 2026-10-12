import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { LOOK_TABLES, sanitizeLookWith } from './src/theme/look.ts'
import { PALETTES } from './src/theme/palettes.ts'
import { oklchToHex } from './src/theme/color.ts'
import { buildThemeCss } from './src/theme/themeCss.ts'

const THEME_CSS = 'virtual:nexora-theme.css'
const RESOLVED_THEME_CSS = '\0' + THEME_CSS

/**
 * The theme layer, generated from src/theme (the single source of truth):
 *
 *  • virtual:nexora-theme.css — every palette × mode, accent override and
 *    font stack as CSS (see src/theme/themeCss.ts);
 *  • the first-paint script in index.html gets the look validator itself
 *    (sanitizeLookWith's source) plus the tables it validates against, and
 *    each theme's page colour per mode for <meta name="theme-color">, so the
 *    page and the app can never disagree about what a valid look is.
 */
function themeLayer(): Plugin {
  const modes = Object.fromEntries(
    PALETTES.map((p) => [p.id, [p.dark ? oklchToHex(p.dark.bg[0]) : 0, p.light ? oklchToHex(p.light.bg[0]) : 0]]),
  )
  return {
    name: 'nexora-theme-layer',
    resolveId: (id) => (id === THEME_CSS ? RESOLVED_THEME_CSS : undefined),
    load: (id) => (id === RESOLVED_THEME_CSS ? buildThemeCss() : undefined),
    transformIndexHtml: (html) =>
      html
        .replace('/*__LOOK_TABLES__*/{}', JSON.stringify(LOOK_TABLES))
        .replace('/*__PALETTE_MODES__*/{}', JSON.stringify(modes))
        .replace('/*__SANITIZE_LOOK__*/null', `(${sanitizeLookWith.toString()})`),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), themeLayer()],
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
