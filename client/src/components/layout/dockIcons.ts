import type { IconName } from '@/components/icon/names'

/*
  Semantic icon for each Dock item id (dockStore.ts still carries Lucide
  components for the Dock/Deck/LaunchGrid; surfaces that render the themed
  icon set look the id up here and fall back to item.icon when unknown).
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
}

export function dockIconName(id: string): IconName | undefined {
  return DOCK_ICONS[id]
}
