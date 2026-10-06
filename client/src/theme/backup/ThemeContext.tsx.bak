import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_WALLPAPER,
  findWallpaper,
  resolveAccent,
  wallpaperTone,
  type AccentId,
  type GlassStyle,
  type Tone,
  type Wallpaper,
} from '@/theme/catalog'

/**
 * The whole "look", the way macOS System Settings splits it:
 *
 *   Appearance   Light · Dark · Auto (follow the system)
 *   Wallpaper    an original, a photo, or none
 *   Colour       an accent, or Multicolour (take the wallpaper's own)
 *   Glass        Frosted · Clear · Solid — Solid is "Reduce transparency"
 *
 * Everything lands on <html> as data attributes plus one custom property
 * (the wallpaper tint), and index.css does the rest. The first paint is
 * handled by the inline script in index.html, which reads the same storage
 * keys, so there is no flash of the wrong look while React boots.
 */
export type Appearance = 'light' | 'dark' | 'system'

export interface Look {
  wallpaper: string
  accent: AccentId
  glass: GlassStyle
}

const APPEARANCE_KEY = 'nexora:appearance'
export const LOOK_KEY = 'nexora:look'

const DEFAULT_LOOK: Look = { wallpaper: DEFAULT_WALLPAPER, accent: 'multicolor', glass: 'frosted' }

interface ThemeValue {
  appearance: Appearance
  resolved: Tone
  setAppearance: (a: Appearance) => void
  cycle: () => void

  look: Look
  wallpaper: Wallpaper
  /** Tone of whatever is actually behind the glass. */
  wallTone: Tone
  resolvedAccent: Exclude<AccentId, 'multicolor'>
  setWallpaper: (id: string) => void
  setAccent: (a: AccentId) => void
  setGlass: (g: GlassStyle) => void
  /** Replace the whole look at once (used when an account's saved look loads). */
  applyLook: (l: Partial<Look>) => void
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

export function sanitizeLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Look>
  const accents: AccentId[] = ['multicolor', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite']
  return {
    wallpaper: findWallpaper(r.wallpaper).id,
    accent: accents.includes(r.accent as AccentId) ? (r.accent as AccentId) : DEFAULT_LOOK.accent,
    glass: r.glass === 'clear' || r.glass === 'solid' || r.glass === 'frosted' ? r.glass : DEFAULT_LOOK.glass,
  }
}

function readLook(): Look {
  try {
    const raw = localStorage.getItem(LOOK_KEY)
    return raw ? sanitizeLook(JSON.parse(raw)) : DEFAULT_LOOK
  } catch {
    return DEFAULT_LOOK
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const [look, setLook] = useState<Look>(readLook)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: Tone = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance
  const wallpaper = useMemo(() => findWallpaper(look.wallpaper), [look.wallpaper])
  const wallTone = wallpaperTone(wallpaper, resolved)
  const resolvedAccent = resolveAccent(look.accent, wallpaper)

  useEffect(() => {
    const root = document.documentElement
    if (appearance === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', appearance)
    root.classList.toggle('dark', resolved === 'dark')
    root.dataset.accent = resolvedAccent
    root.dataset.glass = look.glass
    root.dataset.wall = wallpaper.kind
    root.dataset.wallTone = wallTone
    const tint =
      wallpaper.kind === 'original' ? wallpaper.tint[resolved] : wallpaper.kind === 'photo' ? wallpaper.tint : ''
    const color =
      wallpaper.kind === 'original' ? wallpaper.color[resolved] : wallpaper.kind === 'photo' ? wallpaper.color : ''
    if (tint) root.style.setProperty('--wall-tint', tint)
    else root.style.removeProperty('--wall-tint')
    if (color) root.style.setProperty('--wall-color', color)
    else root.style.removeProperty('--wall-color')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#1c1d22' : '#f2f2f5')
  }, [appearance, resolved, resolvedAccent, look.glass, wallpaper, wallTone])

  const persist = (next: Look) => {
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(next))
    } catch {
      /* the in-memory look still applies for this session */
    }
  }

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

  const update = useCallback((patch: Partial<Look>) => {
    setLook((prev) => {
      const next = sanitizeLook({ ...prev, ...patch })
      persist(next)
      return next
    })
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({
      appearance,
      resolved,
      setAppearance,
      cycle,
      look,
      wallpaper,
      wallTone,
      resolvedAccent,
      setWallpaper: (id) => update({ wallpaper: id }),
      setAccent: (accent) => update({ accent }),
      setGlass: (glass) => update({ glass }),
      applyLook: (l) => update(l),
    }),
    [appearance, resolved, setAppearance, cycle, look, wallpaper, wallTone, resolvedAccent, update],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
