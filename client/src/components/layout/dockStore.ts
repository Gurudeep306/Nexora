import { useSyncExternalStore, type CSSProperties } from 'react'
import {
  Bookmark,
  ChartNoAxesCombined,
  FlaskConical,
  GraduationCap,
  FileQuestion,
  Hammer,
  LayoutGrid,
  ListChecks,
  Medal,
  Network,
  Palette,
  PenTool,
  Search,
  Settings,
  Swords,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Everything that can live in the Dock, and the user's arrangement of it.
 *
 * Each destination has its own icon tile colour (a hue), the way apps in the
 * macOS Dock do, so the Dock reads at a glance instead of as a row of grey
 * glyphs. Two entries are actions rather than pages: Search opens the
 * command palette, Appearance opens the Look settings.
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
  { id: 'hub', label: 'Hub', icon: LayoutGrid, hue: 255, to: '/hub' },
  { id: 'problems', label: 'Problems', icon: Swords, hue: 25, to: '/problems' },
  { id: 'contests', label: 'Contests', icon: Trophy, hue: 78, to: '/contests' },
  { id: 'nexus', label: 'Nexus', icon: Network, hue: 295, to: '/nexus' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, hue: 150, to: '/learn' },
  { id: 'gate', label: 'GATE', icon: FileQuestion, hue: 170, to: '/gate' },
  { id: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined, hue: 210, to: '/analytics' },
  { id: 'social', label: 'Social', icon: Users, hue: 185, to: '/social' },
  { id: 'ailab', label: 'AI Lab', icon: FlaskConical, hue: 330, to: '/ailab' },
  { id: 'workshop', label: 'Workshop', icon: Hammer, hue: 50, to: '/workshop' },
  { id: 'achievements', label: 'Achievements', icon: Medal, hue: 95, to: '/achievements' },
  { id: 'submissions', label: 'Submissions', icon: ListChecks, hue: 270, to: '/submissions' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, hue: 12, to: '/bookmarks' },
  { id: 'explainlab', label: 'ExplainLab', icon: PenTool, hue: 350, to: '/explainlab', external: true },
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

/** Full-focus surfaces where the Dock never appears — while solving a problem
 *  or reading a lesson — regardless of auto-hide. Navigation hubs like the
 *  Problem Arena and Learn home keep the Dock so there's always a way out. */
export const DOCK_FOCUS_PREFIXES = ['/solve', '/learn/dsa']

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

/** The icon tile background for an item, in the current appearance. */
export function tileStyle(item: DockItem): CSSProperties {
  const c = item.chroma ?? 0.17
  return {
    background: `linear-gradient(180deg, oklch(0.74 ${c} ${item.hue}), oklch(0.56 ${c + 0.03} ${item.hue + 8}))`,
  }
}
