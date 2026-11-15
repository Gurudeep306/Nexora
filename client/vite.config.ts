import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { LOOK_TABLES, sanitizeLookWith } from './src/theme/look.ts'
import { PALETTES } from './src/theme/palettes.ts'
import { oklchToHex } from './src/theme/color.ts'
import { buildThemeCss } from './src/theme/themeCss.ts'
import { pagesHeaders, pagesRedirects } from './pages-files.ts'

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

/**
 * Cloudflare Pages control files (_redirects, _headers) for the split deploy —
 * see pages-files.ts. GATE figures come from public/gate-fig, a symlink to
 * the repo's root public/gate-fig that Vite copies (dereferenced) into dist/.
 */
function pagesFiles(apiUrl: string | undefined): Plugin {
  return {
    name: 'nexora-pages-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: pagesRedirects(apiUrl) })
      this.emitFile({ type: 'asset', fileName: '_headers', source: pagesHeaders(apiUrl) })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), themeLayer(), pagesFiles(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL)],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // monaco-editor 0.57 only exposes its files through an exports map
      // ("monaco-editor/editor/editor.api"), but monaco-vim still imports the
      // old "monaco-editor/esm/vs/..." paths. Point those at the real files.
      { find: /^monaco-editor\/esm\/vs\/(.*?)(\.js)?$/, replacement: path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/$1.js') },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth/github': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth/google': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      // GATE figures come from public/gate-fig (a symlink to the repo's
      // public/gate-fig); proxy only if that link is missing in this checkout.
      ...(fs.existsSync(path.resolve(__dirname, 'public/gate-fig'))
        ? {}
        : { '/gate-fig': { target: 'http://localhost:3000', changeOrigin: true } }),
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}))
