import type { IconName } from '@/components/icon/names'

/*
  Semantic icon for each Dock item id. Every surface that draws a Dock
  destination (Dock, More menu, Dock editor, launch grid, phone tab bar)
  renders it with <Icon>/<IconBadge>, so it follows the chosen icon set.
*/
export const DOCK_ICONS: Record<string, IconName> = {
  hub: 'home',
  problems: 'problems',
  contests: 'contests',
  nexus: 'nexus',
  learn: 'learn',
  gate: 'gate',
  analytics: 'analytics',
  social: 'social',
  workshop: 'workshop',
  achievements: 'achievements',
  submissions: 'submissions',
  bookmarks: 'bookmarks',
  profile: 'profile',
  look: 'palette',
  settings: 'settings',
  search: 'search',
  hive: 'bot',
}

export function dockIconName(id: string): IconName {
  return DOCK_ICONS[id] ?? 'grid'
}
