/*
  Lazy loaders for the self-hosted typefaces in ./fonts.ts. Each import pulls
  in only that package's @font-face CSS (as its own chunk); the browser then
  downloads just the subsets the page actually uses. The defaults (Geist,
  JetBrains Mono) are bundled in main.tsx and need no loader.
*/
type Loader = () => Promise<unknown>

export const UI_FONT_LOADERS: Record<string, Loader> = {
  onest: () => import('@fontsource-variable/onest'),
  manrope: () => import('@fontsource-variable/manrope'),
  figtree: () => import('@fontsource-variable/figtree'),
  jakarta: () => import('@fontsource-variable/plus-jakarta-sans'),
  outfit: () => import('@fontsource-variable/outfit'),
  sora: () => import('@fontsource-variable/sora'),
  instrument: () => import('@fontsource-variable/instrument-sans'),
  schibsted: () => import('@fontsource-variable/schibsted-grotesk'),
  hanken: () => import('@fontsource-variable/hanken-grotesk'),
  'red-hat': () => Promise.all([import('@fontsource-variable/red-hat-text'), import('@fontsource-variable/red-hat-display')]),
  plex: () => import('@fontsource-variable/ibm-plex-sans'),
  'space-grotesk': () => import('@fontsource-variable/space-grotesk'),
  bricolage: () => import('@fontsource-variable/bricolage-grotesque'),
  lexend: () => import('@fontsource-variable/lexend'),
  atkinson: () => import('@fontsource-variable/atkinson-hyperlegible-next'),
  nunito: () => import('@fontsource-variable/nunito'),
  literata: () => import('@fontsource-variable/literata'),
  newsreader: () => import('@fontsource-variable/newsreader/opsz.css'),
  'inter-tight': () => import('@fontsource-variable/inter-tight'),
}

export const CODE_FONT_LOADERS: Record<string, Loader> = {
  'geist-mono': () => import('@fontsource-variable/geist-mono'),
  fira: () => import('@fontsource-variable/fira-code'),
  'plex-mono': () =>
    Promise.all([
      import('@fontsource/ibm-plex-mono/400.css'),
      import('@fontsource/ibm-plex-mono/500.css'),
      import('@fontsource/ibm-plex-mono/600.css'),
      import('@fontsource/ibm-plex-mono/700.css'),
    ]),
  'source-code': () => import('@fontsource-variable/source-code-pro'),
  victor: () => import('@fontsource-variable/victor-mono'),
  martian: () => import('@fontsource-variable/martian-mono'),
  commit: () =>
    Promise.all([
      import('@fontsource/commit-mono/400.css'),
      import('@fontsource/commit-mono/500.css'),
      import('@fontsource/commit-mono/600.css'),
      import('@fontsource/commit-mono/700.css'),
    ]),
}

/* Solution handwriting (GATE worked solutions). Shantell ships per-axis
   files; 'infm' carries wght + INFM, the two axes we use. */
export const SOLUTION_FONT_LOADERS: Record<string, Loader> = {
  shantell: () => import('@fontsource-variable/shantell-sans/infm.css'),
  patrick: () => import('@fontsource/patrick-hand/400.css'),
  architects: () => import('@fontsource/architects-daughter/400.css'),
  mali: () =>
    Promise.all([
      import('@fontsource/mali/400.css'),
      import('@fontsource/mali/500.css'),
      import('@fontsource/mali/600.css'),
      import('@fontsource/mali/700.css'),
    ]),
}

const started = new Map<string, Promise<unknown>>()

function load(key: string, loader: Loader | undefined): Promise<unknown> {
  if (!loader) return Promise.resolve()
  let p = started.get(key)
  if (!p) {
    p = loader().catch(() => started.delete(key))
    started.set(key, p)
  }
  return p
}

export const loadUiFont = (id: string) => load(`ui:${id}`, UI_FONT_LOADERS[id])
export const loadCodeFont = (id: string) => load(`code:${id}`, CODE_FONT_LOADERS[id])
export const loadSolutionFont = (id: string) => load(`solution:${id}`, SOLUTION_FONT_LOADERS[id])
