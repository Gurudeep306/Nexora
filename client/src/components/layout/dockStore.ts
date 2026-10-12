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
  { id: 'look', label: 'Theme Centre', hue: 310, to: '/theme' },
  { id: 'settings', label: 'Settings', hue: 260, chroma: 0.02, to: '/settings' },
  { id: 'search', label: 'Search', hue: 260, chroma: 0.02, action: 'search' },
]

export const DOCK_BY_ID = new Map(DOCK_ITEMS.map((i) => [i.id, i]))

export const MAX_PINNED = 14

export interface DockPrefs {
  pinned: string[]
  /** Icons swell under the pointer, as in the macOS Dock. */
  magnify: boolean
  /** Colour tiles, or plain monochrome glyphs. */
  iconStyle: 'colour' | 'mono'
  /** Slip the Dock off-screen until the cursor nears the bottom edge. */
  autoHide: boolean
}

export const DEFAULT_DOCK: DockPrefs = {
  pinned: ['hub', 'problems', 'contests', 'nexus', 'learn', 'gate', 'analytics', 'social', 'submissions', 'bookmarks', 'search'],
  magnify: true,
  iconStyle: 'colour',
  autoHide: false,
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
    pinned: pinned.length ? pinned : DEFAULT_DOCK.pinned,
    magnify: typeof r.magnify === 'boolean' ? r.magnify : DEFAULT_DOCK.magnify,
    iconStyle: r.iconStyle === 'mono' ? 'mono' : 'colour',
    autoHide: typeof r.autoHide === 'boolean' ? r.autoHide : DEFAULT_DOCK.autoHide,
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
