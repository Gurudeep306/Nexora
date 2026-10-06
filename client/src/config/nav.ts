import {
  House,
  Swords,
  Trophy,
  Hammer,
  Network,
  BarChart3,
  Medal,
  Sparkles,
  GraduationCap,
  Users,
  History,
  Bookmark,
  User,
  Settings,
  Clapperboard,
  PenTool,
  Blocks,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
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
      { to: '/hub', label: 'Home', icon: House },
      { to: '/problems', label: 'Problems', icon: Swords },
      { to: '/contests', label: 'Contests', icon: Trophy },
      { to: '/workshop', label: 'Workshop', icon: Hammer },
    ],
  },
  {
    title: 'Grow',
    items: [
      { to: '/nexus', label: 'Nexus', icon: Network },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/achievements', label: 'Achievements', icon: Medal },
      { to: '/ailab', label: 'AI Lab', icon: Sparkles },
      { to: '/learn', label: 'Learn', icon: GraduationCap },
    ],
  },
  {
    title: 'Connect',
    items: [{ to: '/social', label: 'Social', icon: Users }],
  },
  {
    title: 'Library',
    items: [
      { to: '/submissions', label: 'Submissions', icon: History },
      { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    ],
  },
]

/* Creator tools still live as standalone server pages (public/*.html) */
export const CREATE_SECTION: NavSection = {
  title: 'Create',
  items: [
    { to: '/studio', label: 'Creator Studio', icon: Clapperboard, external: true, adminOnly: true },
    { to: '/explainlab', label: 'ExplainLab', icon: PenTool, external: true },
    { to: '/forgebuilder', label: 'ForgeBuilder', icon: Blocks, external: true, adminOnly: true },
  ],
}

export const ACCOUNT_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Section + label for the current path — used by the topbar breadcrumbs. */
export function navMeta(pathname: string): { section?: string; label: string } {
  if (pathname.startsWith('/solve')) return { section: 'Play', label: 'Solve' }
  if (pathname.startsWith('/profile/')) return { section: 'Players', label: decodeURIComponent(pathname.split('/')[2] ?? '') }
  for (const sec of [...NAV_SECTIONS, CREATE_SECTION, { title: 'Account', items: ACCOUNT_ITEMS }]) {
    const hit = sec.items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    if (hit) return { section: sec.title, label: hit.label }
  }
  return { label: 'Nexora' }
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
  i: '/ailab',
  ',': '/settings',
}
