import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_WALLPAPER,
  findWallpaper,
  getCustomWallpapers,
  removeCustomWallpaper,
  resolveAccent,
  saveCustomWallpaper,
  wallpaperTone,
  type AccentId,
  type CardStyle,
  type CustomWallpaper,
  type FontColor,
  type FontSize,
  type FontStyle,
  type GlassStyle,
  type IconPack,
  type IconShape,
  type Tone,
  type Wallpaper,
} from '@/theme/catalog'

export type Appearance = 'light' | 'dark' | 'system'

export interface Look {
  wallpaper: string
  accent: AccentId
  glass: GlassStyle
  cardStyle: CardStyle
  iconPack: IconPack
  iconShape: IconShape
  fontStyle: FontStyle
  fontSize: FontSize
  fontColor: FontColor
}

const APPEARANCE_KEY = 'nexora:appearance'
export const LOOK_KEY = 'nexora:look'

const DEFAULT_LOOK: Look = {
  wallpaper: DEFAULT_WALLPAPER,
  accent: 'multicolor',
  glass: 'frosted',
  cardStyle: 'glass',
  iconPack: 'vibrant',
  iconShape: 'squircle',
  fontStyle: 'space-grotesk',
  fontSize: 'comfortable',
  fontColor: 'default',
}

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
  setCardStyle: (cs: CardStyle) => void
  setIconPack: (ip: IconPack) => void
  setIconShape: (is: IconShape) => void
  setFontStyle: (fs: FontStyle) => void
  setFontSize: (fs: FontSize) => void
  setFontColor: (fc: FontColor) => void
  customWallpapers: CustomWallpaper[]
  addCustomWallpaper: (wp: CustomWallpaper) => void
  deleteCustomWallpaper: (id: string) => void
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
  const accents: AccentId[] = [
    'multicolor',
    'blue',
    'cyan',
    'ice',
    'purple',
    'plasma',
    'pink',
    'red',
    'orange',
    'yellow',
    'green',
    'graphite',
  ]
  const cardStyles: CardStyle[] = ['glass', 'neon', 'minimal', 'holo', 'gradient']
  const iconPacks: IconPack[] = [
    'vibrant',
    'neon',
    'anime',
    'glitch',
    'crystal',
    'retro',
    'emerald',
    'duotone',
    'clay',
    'minimal',
  ]
  const iconShapes: IconShape[] = ['squircle', 'circle', 'diamond', 'shield', 'hexagon', 'pill', 'free']
  const fontStyles: FontStyle[] = [
    'syne',
    'space-grotesk',
    'orbitron',
    'bricolage',
    'unbounded',
    'handwriting-caveat',
    'handwriting-kalam',
    'cyber',
    'cinzel',
    'retro',
    'modern',
    'handwriting',
    'handwriting-architect',
    'handwriting-indie',
    'serif',
  ]
  const fontSizes: FontSize[] = ['normal', 'comfortable', 'large', 'huge']
  const fontColors: FontColor[] = [
    'default',
    'white',
    'cyan',
    'amber',
    'emerald',
    'rose',
    'violet',
    'ice',
    'gold',
  ]

  let fs = (r.fontStyle && fontStyles.includes(r.fontStyle as FontStyle) ? r.fontStyle : DEFAULT_LOOK.fontStyle) as FontStyle
  // Normalize legacy aliases
  if (fs === 'modern') fs = 'space-grotesk'
  else if (fs === 'handwriting' || fs === 'handwriting-indie') fs = 'handwriting-caveat'
  else if (fs === 'handwriting-architect') fs = 'syne'
  else if (fs === 'serif') fs = 'cinzel'

  return {
    wallpaper: findWallpaper(r.wallpaper).id,
    accent: accents.includes(r.accent as AccentId) ? (r.accent as AccentId) : DEFAULT_LOOK.accent,
    glass: r.glass === 'clear' || r.glass === 'solid' || r.glass === 'frosted' ? r.glass : DEFAULT_LOOK.glass,
    cardStyle: cardStyles.includes(r.cardStyle as CardStyle) ? (r.cardStyle as CardStyle) : DEFAULT_LOOK.cardStyle,
    iconPack: iconPacks.includes(r.iconPack as IconPack) ? (r.iconPack as IconPack) : DEFAULT_LOOK.iconPack,
    iconShape: iconShapes.includes(r.iconShape as IconShape) ? (r.iconShape as IconShape) : DEFAULT_LOOK.iconShape,
    fontStyle: fs,
    fontSize: fontSizes.includes(r.fontSize as FontSize) ? (r.fontSize as FontSize) : DEFAULT_LOOK.fontSize,
    fontColor: fontColors.includes(r.fontColor as FontColor) ? (r.fontColor as FontColor) : DEFAULT_LOOK.fontColor,
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
  const [customList, setCustomList] = useState<CustomWallpaper[]>(getCustomWallpapers)

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
    root.dataset.cardStyle = look.cardStyle
    root.dataset.iconPack = look.iconPack
    root.dataset.iconShape = look.iconShape
    root.dataset.fontStyle = look.fontStyle
    root.dataset.fontSize = look.fontSize
    root.dataset.fontColor = look.fontColor
    root.dataset.wall = wallpaper.kind
    root.dataset.wallTone = wallTone


    const tint =
      wallpaper.kind === 'original'
        ? wallpaper.tint[resolved]
        : wallpaper.kind === 'photo' || wallpaper.kind === 'custom'
          ? wallpaper.tint
          : ''
    const color =
      wallpaper.kind === 'original'
        ? wallpaper.color[resolved]
        : wallpaper.kind === 'photo' || wallpaper.kind === 'custom'
          ? wallpaper.color
          : ''

    if (tint) root.style.setProperty('--wall-tint', tint)
    else root.style.removeProperty('--wall-tint')
    if (color) root.style.setProperty('--wall-color', color)
    else root.style.removeProperty('--wall-color')

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#1c1d22' : '#f2f2f5')
  }, [
    appearance,
    resolved,
    resolvedAccent,
    look.glass,
    look.cardStyle,
    look.iconPack,
    look.iconShape,
    look.fontStyle,
    look.fontSize,
    look.fontColor,
    wallpaper,
    wallTone,
  ])


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

  const addCustomWallpaper = useCallback(
    (wp: CustomWallpaper) => {
      saveCustomWallpaper(wp)
      setCustomList(getCustomWallpapers())
      update({ wallpaper: wp.id })
    },
    [update],
  )

  const deleteCustomWallpaper = useCallback(
    (id: string) => {
      removeCustomWallpaper(id)
      setCustomList(getCustomWallpapers())
      if (look.wallpaper === id) {
        update({ wallpaper: DEFAULT_WALLPAPER })
      }
    },
    [look.wallpaper, update],
  )

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
      setCardStyle: (cardStyle) => update({ cardStyle }),
      setIconPack: (iconPack) => update({ iconPack }),
      setIconShape: (iconShape) => update({ iconShape }),
      setFontStyle: (fontStyle) => update({ fontStyle }),
      setFontSize: (fontSize) => update({ fontSize }),
      setFontColor: (fontColor) => update({ fontColor }),
      customWallpapers: customList,

      addCustomWallpaper,
      deleteCustomWallpaper,
      applyLook: (l) => update(l),
    }),
    [
      appearance,
      resolved,
      setAppearance,
      cycle,
      look,
      wallpaper,
      wallTone,
      resolvedAccent,
      customList,
      addCustomWallpaper,
      deleteCustomWallpaper,
      update,
    ],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
