import { useSyncExternalStore } from 'react'

/**
 * Everything that can live in the Dock, and the user's arrangement of it.
 *
 * Each destination has its own calibrated tile colour (a hue), so the Dock
 * and launchpad read at a glance. The glyph is semantic (dockIcons.ts) and
 * drawn in the user's icon set; the tile is an <IconBadge> (DockBadge.tsx),
 * so it follows the chosen icon container and shape.
 */
export interface DockItem {
  id: string
  label: string
  /** OKLCH hue of the icon tile. */
  hue: number
  /** Chroma of the tile; low for utility items such as Settings. */
  chroma?: number
  to?: string
  /** Served by Express, not a client route. */
  external?: boolean
  action?: 'search'
  /** Only staff and admins see it (Hive, the AI workspace). */
  staffOnly?: boolean
}

export const DOCK_ITEMS: DockItem[] = [
  { id: 'hub', label: 'Home', hue: 255, to: '/hub' },
  { id: 'problems', label: 'Problems', hue: 25, to: '/problems' },
  { id: 'contests', label: 'Contests', hue: 78, to: '/contests' },
  { id: 'nexus', label: 'Nexus', hue: 295, to: '/nexus' },
  { id: 'learn', label: 'Learn', hue: 150, to: '/learn' },
  { id: 'gate', label: 'GATE', hue: 175, to: '/gate' },
  { id: 'analytics', label: 'Analytics', hue: 210, to: '/analytics' },
  { id: 'social', label: 'Social', hue: 185, to: '/social' },
  { id: 'workshop', label: 'Workshop', hue: 50, to: '/workshop' },
  { id: 'achievements', label: 'Achievements', hue: 95, to: '/achievements' },
  { id: 'submissions', label: 'Submissions', hue: 270, to: '/submissions' },
  { id: 'bookmarks', label: 'Bookmarks', hue: 12, to: '/bookmarks' },
  { id: 'profile', label: 'Profile', hue: 235, to: '/profile' },
  { id: 'look', label: 'Appearance', hue: 310, to: '/theme' },
  { id: 'settings', label: 'Settings', hue: 260, chroma: 0.02, to: '/settings' },
  { id: 'search', label: 'Search', hue: 260, chroma: 0.02, action: 'search' },
  { id: 'hive', label: 'Hive', hue: 285, to: '/hive', staffOnly: true },
]

export const DOCK_BY_ID = new Map(DOCK_ITEMS.map((i) => [i.id, i]))

export const MAX_PINNED = 14

export interface DockPrefs {
  /** 2 = saved after mono became the default (older saves migrate once). */
  v?: 2
  pinned: string[]
  /** Icons swell under the pointer, as in the macOS Dock. */
  magnify: boolean
  /** Colour tiles, or plain monochrome glyphs. */
  iconStyle: 'colour' | 'mono'
  /** Slip the Dock off-screen until the cursor nears the bottom edge. */
  autoHide: boolean
  /** Which edge of the screen it sits on (wide screens; phones keep the tab bar). */
  position: DockPosition
  /** Resting icon size. */
  size: DockSize
  /** Names: on hover only, or always under each icon. */
  labels: 'hover' | 'always'
  /** The bar: paper (the theme's surface), tinted with the accent, or ink. */
  surface: DockSurface
}

export type DockPosition = 'bottom' | 'left' | 'right'
export type DockSize = 'small' | 'medium' | 'large'
export type DockSurface = 'paper' | 'tinted' | 'ink'
export const DOCK_POSITIONS: { id: DockPosition; label: string }[] = [
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
]
export const DOCK_SIZES: { id: DockSize; label: string; base: number; peak: number }[] = [
  { id: 'small', label: 'Small', base: 38, peak: 58 },
  { id: 'medium', label: 'Medium', base: 46, peak: 72 },
  { id: 'large', label: 'Large', base: 54, peak: 82 },
]
export const DOCK_SURFACES: { id: DockSurface; label: string }[] = [
  { id: 'paper', label: 'Paper' },
  { id: 'tinted', label: 'Tinted' },
  { id: 'ink', label: 'Ink' },
]

export const DEFAULT_DOCK: DockPrefs = {
  pinned: ['hub', 'problems', 'contests', 'nexus', 'learn', 'gate', 'analytics', 'social', 'submissions', 'bookmarks', 'search'],
  magnify: true,
  iconStyle: 'mono',
  autoHide: false,
  position: 'bottom',
  size: 'medium',
  labels: 'hover',
  surface: 'paper',
}

export const DOCK_FOCUS_PREFIXES = ['/solve', '/learn/dsa', '/gate/cbt']

export function isDockFocusRoute(pathname: string): boolean {
  return DOCK_FOCUS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const KEY = 'nexora:dock'

export function sanitizeDock(raw: unknown): DockPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DockPrefs>
  const pinned = Array.isArray(r.pinned)
    ? [...new Set(r.pinned.filter((id): id is string => typeof id === 'string' && DOCK_BY_ID.has(id)))].slice(0, MAX_PINNED)
    : DEFAULT_DOCK.pinned
  return {
    v: 2,
    pinned: pinned.length ? pinned : DEFAULT_DOCK.pinned,
    magnify: typeof r.magnify === 'boolean' ? r.magnify : DEFAULT_DOCK.magnify,
    // Before v2 the colour tiles were simply the default: move those to mono once.
    iconStyle: r.v === 2 && r.iconStyle === 'colour' ? 'colour' : 'mono',
    autoHide: typeof r.autoHide === 'boolean' ? r.autoHide : DEFAULT_DOCK.autoHide,
    position: DOCK_POSITIONS.some((x) => x.id === r.position) ? (r.position as DockPosition) : DEFAULT_DOCK.position,
    size: DOCK_SIZES.some((x) => x.id === r.size) ? (r.size as DockSize) : DEFAULT_DOCK.size,
    labels: r.labels === 'always' ? 'always' : 'hover',
    surface: DOCK_SURFACES.some((x) => x.id === r.surface) ? (r.surface as DockSurface) : DEFAULT_DOCK.surface,
  }
}

function read(): DockPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? sanitizeDock(JSON.parse(raw)) : DEFAULT_DOCK
  } catch {
    return DEFAULT_DOCK
  }
}

let state: DockPrefs = typeof window === 'undefined' ? DEFAULT_DOCK : read()
const listeners = new Set<() => void>()

export function setDock(patch: Partial<DockPrefs>) {
  state = sanitizeDock({ ...state, ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* the in-memory arrangement still applies */
  }
  listeners.forEach((l) => l())
}

export function getDock(): DockPrefs {
  return state
}

export function useDock(): DockPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => DEFAULT_DOCK,
  )
}

/**
 * The tile colour for an item, in OKLCH. Its lightness comes from --dock-l
 * (index.css, .dock-badge), tuned per light/dark mode so the glyph stays
 * legible on soft and bare containers as well as on solid ones.
 */
export function tileColor(item: DockItem): string {
  // Yellows turn muddy at the shared lightness; lift them a little.
  const l = item.hue >= 60 && item.hue <= 110 ? 'calc(var(--dock-l) + 0.05)' : 'var(--dock-l)'
  return `oklch(${l} ${item.chroma ?? 0.16} ${item.hue})`
}
