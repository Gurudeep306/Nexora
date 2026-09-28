import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Appearance, the way macOS does it: Light, Dark, or follow the system.
 *
 * "system" is the default and stores nothing, so a Mac set to switch at sunset
 * takes the app with it. Choosing Light or Dark writes `data-theme` on <html>,
 * which is what the CSS in index.css keys off.
 *
 * The very first paint is handled by a tiny inline script in index.html — by
 * the time React mounts, the attribute is already correct, so there is no
 * flash of the wrong appearance.
 */
export type Appearance = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'nexora:appearance'

interface ThemeValue {
  /** What the user picked. */
  appearance: Appearance
  /** What is actually on screen right now — 'system' resolved against the OS. */
  resolved: 'light' | 'dark'
  setAppearance: (a: Appearance) => void
  /** Light → Dark → System → Light. */
  cycle: () => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function readStored(): Appearance {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* private mode — fall through to following the system */
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readStored)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Track the OS setting so "system" updates live, without a reload.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance

  useEffect(() => {
    const root = document.documentElement
    if (appearance === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', appearance)
    // Keep the old Tailwind `dark` class in sync for any component still using it.
    root.classList.toggle('dark', resolved === 'dark')
    // Tints the browser/OS chrome around the page to match.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#1c1d22' : '#f2f2f5')
  }, [appearance, resolved])

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a)
    try {
      if (a === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, a)
    } catch {
      /* the in-memory choice still applies for this session */
    }
  }, [])

  const cycle = useCallback(() => {
    setAppearance(appearance === 'light' ? 'dark' : appearance === 'dark' ? 'system' : 'light')
  }, [appearance, setAppearance])

  const value = useMemo(
    () => ({ appearance, resolved, setAppearance, cycle }),
    [appearance, resolved, setAppearance, cycle],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
