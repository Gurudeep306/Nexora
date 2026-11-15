import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LOOK, hiveLook, isHivePath, lookAttributes, sanitizeLook, type Look } from '@/theme/look'
import { PALETTE_BY_ID, DEFAULT_PALETTE, resolveMode, type Palette, type ThemeMode } from '@/theme/palettes'
import { oklchToHex } from '@/theme/color'
import { loadCodeFont, loadUiFont } from '@/theme/fontLoaders'
import { STYLE_BY_ID } from '@/theme/styles'

export type Appearance = 'light' | 'dark' | 'system'
export type { Look }

const APPEARANCE_KEY = 'nexora:appearance'
export const LOOK_KEY = 'nexora:look'
const RECENT_KEY = 'nexora:recent-themes'
const MAX_RECENT = 6

interface ThemeValue {
  /** The user's preference. */
  appearance: Appearance
  setAppearance: (a: Appearance) => void
  /** Light → dark → system. */
  cycle: () => void
  /** The mode actually rendered (a single-mode theme overrides the preference). */
  mode: ThemeMode
  /** Alias of `mode`, kept for older call sites. */
  resolved: ThemeMode
  /** True when the current theme offers only one mode. */
  modeLocked: boolean
  /** The mode the user wants (preference resolved against the OS). */
  preferredMode: ThemeMode
  look: Look
  /** The look actually on the page: `look`, except inside Hive (see hiveLook). */
  shown: Look
  /** Hive's route calls this while mounted, so Hive keeps its pre-journal look. */
  setHiveScope: (on: boolean) => void
  palette: Palette
  /** Change part of the look; the result is validated. */
  setLook: (patch: Partial<Look>) => void
  /** Replace the whole look at once (an account's saved look). */
  applyLook: (l: Partial<Look>) => void
  resetLook: () => void
  /** Most recently applied themes, newest first. */
  recentThemes: string[]
}

const ThemeContext = createContext<ThemeValue | null>(null)

function readAppearance(): Appearance {
  try {
    const v = localStorage.getItem(APPEARANCE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* private mode */
  }
  return 'system'
}

function readLook(): Look {
  try {
    const raw = localStorage.getItem(LOOK_KEY)
    return raw ? sanitizeLook(JSON.parse(raw)) : DEFAULT_LOOK
  } catch {
    return DEFAULT_LOOK
  }
}

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && PALETTE_BY_ID.has(id)).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function systemMode(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance)
  const [system, setSystem] = useState<ThemeMode>(systemMode)
  const [look, setLookState] = useState<Look>(readLook)
  const [recentThemes, setRecent] = useState<string[]>(readRecent)
  const [hiveScope, setHiveScope] = useState(() => isHivePath(window.location.pathname))
  const shown = useMemo(() => (hiveScope ? hiveLook(look) : look), [hiveScope, look])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches ? 'light' : 'dark')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const palette = PALETTE_BY_ID.get(shown.theme) ?? PALETTE_BY_ID.get(DEFAULT_PALETTE)!
  const preferredMode: ThemeMode = appearance === 'system' ? system : appearance
  const mode = resolveMode(palette, preferredMode)
  const modeLocked = !(palette.dark && palette.light)

  useEffect(() => {
    const root = document.documentElement
    for (const [k, v] of Object.entries(lookAttributes(shown, mode))) {
      if (v === undefined) root.removeAttribute(k)
      else root.setAttribute(k, v)
    }
    root.classList.toggle('dark', mode === 'dark')
    const bg = palette[mode]?.bg[0]
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oklchToHex(bg))
  }, [shown, mode, palette])

  useEffect(() => {
    void loadUiFont(shown.font)
  }, [shown.font])
  useEffect(() => {
    void loadCodeFont(shown.codeFont)
  }, [shown.codeFont])
  // A style can set its headings in a face of its own (Editorial's serif).
  useEffect(() => {
    const extra = STYLE_BY_ID.get(shown.style)?.displayFont
    if (extra) void loadUiFont(extra)
  }, [shown.style])
  // Solutions are a small corner of the app — fetch their face only once a
  // solution actually mounts (gate/solution/GateSolution.tsx), not on every page.

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a)
    try {
      if (a === 'system') localStorage.removeItem(APPEARANCE_KEY)
      else localStorage.setItem(APPEARANCE_KEY, a)
    } catch {
      /* ignore */
    }
  }, [])

  const cycle = useCallback(() => {
    setAppearance(appearance === 'light' ? 'dark' : appearance === 'dark' ? 'system' : 'light')
  }, [appearance, setAppearance])

  const setLook = useCallback((patch: Partial<Look>) => {
    setLookState((prev) => {
      const next = sanitizeLook({ ...prev, ...patch })
      try {
        localStorage.setItem(LOOK_KEY, JSON.stringify(next))
      } catch {
        /* the in-memory look still applies for this session */
      }
      return next
    })
    if (patch.theme) {
      const id = patch.theme
      setRecent((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT)
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    }
  }, [])

  const resetLook = useCallback(() => setLook(DEFAULT_LOOK), [setLook])

  const value = useMemo<ThemeValue>(
    () => ({
      appearance,
      setAppearance,
      cycle,
      mode,
      resolved: mode,
      modeLocked,
      preferredMode,
      look,
      shown,
      setHiveScope,
      palette,
      setLook,
      applyLook: setLook,
      resetLook,
      recentThemes,
    }),
    [appearance, setAppearance, cycle, mode, modeLocked, preferredMode, look, shown, palette, setLook, resetLook, recentThemes],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
