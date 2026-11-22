import type { IconOrBrand } from '@/components/icon/names'
import { apiUrl } from '@/lib/api'

export interface NavItem {
  to: string
  label: string
  /** Semantic icon — render with <Icon name={item.icon} />. */
  icon: IconOrBrand
  end?: boolean
  /** Served by Express as a separate page (not a client route) — full page load */
  external?: boolean
  /** Only shown to admins */
  adminOnly?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Play',
    items: [
      { to: '/hub', label: 'Home', icon: 'home' },
      { to: '/problems', label: 'Problems', icon: 'problems' },
      { to: '/contests', label: 'Contests', icon: 'contests' },
      { to: '/workshop', label: 'Workshop', icon: 'workshop' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { to: '/nexus', label: 'Nexus', icon: 'nexus' },
      { to: '/analytics', label: 'Analytics', icon: 'analytics' },
      { to: '/achievements', label: 'Achievements', icon: 'achievements' },
      { to: '/learn', label: 'Learn', icon: 'learn' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { to: '/social', label: 'Community', icon: 'social' },
      { to: '/messages', label: 'Messages', icon: 'messages' },
      { to: '/live', label: 'Live', icon: 'live' },
    ],
  },
  {
    title: 'Discover',
    items: [{ to: '/explore', label: 'Explore', icon: 'compass' }],
  },
  {
    title: 'Library',
    items: [
      { to: '/submissions', label: 'Submissions', icon: 'submissions' },
      { to: '/bookmarks', label: 'Bookmarks', icon: 'bookmarks' },
    ],
  },
]

/* Creator tools still live as standalone server pages (public/*.html) */
export const CREATE_SECTION: NavSection = {
  title: 'Create',
  items: [
    { to: apiUrl('/studio'), label: 'Creator Studio', icon: 'studio', external: true, adminOnly: true },
    { to: apiUrl('/forgebuilder'), label: 'ForgeBuilder', icon: 'builder', external: true, adminOnly: true },
  ],
}

/** Shown to anyone holding an admin-panel permission. */
export const ADMIN_ITEM: NavItem = { to: '/admin', label: 'Admin', icon: 'shield' }

/** Staff-only multi-agent workspace. */
export const HIVE_ITEM: NavItem = { to: '/hive', label: 'Hive · AI workspace', icon: 'hive' }

export const ACCOUNT_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: 'profile' },
  { to: '/theme', label: 'Appearance', icon: 'palette' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

/** Section + label for the current path — used by the topbar breadcrumbs. */
export function navMeta(pathname: string): { section?: string; label: string } {
  if (pathname.startsWith('/solve')) return { section: 'Play', label: 'Solve' }
  // GATE is reached from the dock and Learn rather than the nav sections.
  if (pathname.startsWith('/gate/notes')) return { section: 'Grow', label: 'Notes' }
  if (pathname === '/gate' || pathname.startsWith('/gate/')) return { section: 'Grow', label: 'GATE' }
  if (pathname.startsWith('/profile/')) return { section: 'Players', label: decodeURIComponent(pathname.split('/')[2] ?? '') }
  for (const sec of [...NAV_SECTIONS, CREATE_SECTION, { title: 'Account', items: ACCOUNT_ITEMS }]) {
    const hit = sec.items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    if (hit) return { section: sec.title, label: hit.label }
  }
  return { label: 'NexoraGuru' }
}

/** Keyboard "g then x" shortcuts. */
export const GO_SHORTCUTS: Record<string, string> = {
  h: '/hub',
  p: '/problems',
  c: '/contests',
  n: '/nexus',
  a: '/analytics',
  l: '/learn',
  s: '/social',
  b: '/bookmarks',
  u: '/submissions',
  ',': '/settings',
}
