import { useSyncExternalStore, type CSSProperties } from 'react'
import {
  Activity,
  Bookmark,
  BrainCircuit,
  Code2,
  GraduationCap,
  House,
  ListChecks,
  Medal,
  Network,
  Palette,
  Search,
  Settings,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'
import type { IconPack, IconShape } from '@/theme/catalog'

/**
 * Everything that can live in the Dock, and the user's arrangement of it.
 *
 * Each destination has its own calibrated icon tile colour (a hue),
 * so the Dock and launchpad read at a glance with high visual prestige.
 */
export interface DockItem {
  id: string
  label: string
  icon: LucideIcon
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
  { id: 'hub', label: 'Home', icon: House, hue: 255, to: '/hub' },
  { id: 'problems', label: 'Problems', icon: Swords, hue: 25, to: '/problems' },
  { id: 'contests', label: 'Contests', icon: Trophy, hue: 78, to: '/contests' },
  { id: 'nexus', label: 'Nexus', icon: Network, hue: 295, to: '/nexus' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, hue: 150, to: '/learn' },
  { id: 'gate', label: 'GATE', icon: BrainCircuit, hue: 175, to: '/gate' },
  { id: 'analytics', label: 'Analytics', icon: Activity, hue: 210, to: '/analytics' },
  { id: 'social', label: 'Social', icon: UsersRound, hue: 185, to: '/social' },
  { id: 'ailab', label: 'AI Lab', icon: FlaskConical, hue: 330, to: '/ailab' },
  { id: 'workshop', label: 'Workshop', icon: Code2, hue: 50, to: '/workshop' },
  { id: 'achievements', label: 'Achievements', icon: Medal, hue: 95, to: '/achievements' },
  { id: 'submissions', label: 'Submissions', icon: ListChecks, hue: 270, to: '/submissions' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, hue: 12, to: '/bookmarks' },
  { id: 'explainlab', label: 'ExplainLab', icon: Sparkles, hue: 350, to: '/explainlab', external: true },
  { id: 'profile', label: 'Profile', icon: UserRound, hue: 235, to: '/profile' },
  { id: 'look', label: 'Appearance', icon: Palette, hue: 310, to: '/settings?tab=look' },
  { id: 'settings', label: 'Settings', icon: Settings, hue: 260, chroma: 0.02, to: '/settings' },
  { id: 'search', label: 'Search', icon: Search, hue: 260, chroma: 0.02, action: 'search' },
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
  pinned: ['hub', 'problems', 'contests', 'nexus', 'learn', 'gate', 'analytics', 'social', 'ailab', 'submissions', 'bookmarks', 'search'],
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

/** The icon tile background for an item, adapted to chosen pack and shape. */
export function tileStyle(
  item: DockItem,
  pack: IconPack = 'vibrant',
  shape: IconShape = 'squircle',
): CSSProperties {
  const c = item.chroma ?? 0.17
  const style: CSSProperties = {}

  // Shape application
  if (shape === 'circle') style.borderRadius = '50%'
  else if (shape === 'hexagon') style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  else if (shape === 'free') {
    style.background = 'transparent'
    style.boxShadow = 'none'
    return style
  } else {
    style.borderRadius = '28%'
  }

  // Pack aesthetics
  if (pack === 'neon') {
    style.background = `radial-gradient(circle at 50% 50%, oklch(0.20 0.05 ${item.hue}), oklch(0.12 0.03 ${item.hue}))`
    style.border = `1px solid oklch(0.72 0.22 ${item.hue})`
    style.boxShadow = `0 0 16px oklch(0.72 0.22 ${item.hue} / 0.45)`
  } else if (pack === 'minimal') {
    style.background = 'oklch(1 0 0 / 0.06)'
    style.border = '1px solid oklch(1 0 0 / 0.1)'
    style.backdropFilter = 'blur(10px)'
  } else if (pack === 'duotone') {
    style.background = `linear-gradient(135deg, oklch(0.35 0.12 ${item.hue} / 0.7), oklch(0.18 0.08 ${item.hue} / 0.9))`
    style.border = `1px solid oklch(0.6 0.15 ${item.hue} / 0.35)`
  } else if (pack === 'clay') {
    style.background = `linear-gradient(180deg, oklch(0.70 ${c} ${item.hue}), oklch(0.52 ${c + 0.03} ${item.hue + 8}))`
    style.boxShadow = `inset 0 2px 3px oklch(1 0 0 / 0.45), inset 0 -3px 4px oklch(0 0 0 / 0.35), 0 8px 16px -4px oklch(0 0 0 / 0.4)`
  } else {
    // Vibrant default
    style.background = `linear-gradient(180deg, oklch(0.74 ${c} ${item.hue}), oklch(0.56 ${c + 0.03} ${item.hue + 8}))`
    style.boxShadow = `inset 0 1px 0 oklch(1 0 0 / 0.3), 0 4px 12px -2px oklch(0 0 0 / 0.25)`
  }

  return style
}
