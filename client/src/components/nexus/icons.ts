import type { IconName } from '@/components/icon/names'

/* Server sends legacy HTML icon strings like `<i class="icon-book"></i>` — map them to semantic icons. */
const NODE_ICONS: Record<string, IconName> = {
  'icon-abc': 'type',
  'icon-bolt': 'bolt',
  'icon-book': 'book',
  'icon-brain': 'brain',
  'icon-building': 'building',
  'icon-chart': 'analytics',
  'icon-coins': 'coins',
  'icon-crown': 'crown',
  'icon-dice': 'random',
  'icon-gamepad': 'gamepad',
  'icon-geometry': 'shapes',
  'icon-graph': 'graph',
  'icon-hash': 'hash',
  'icon-leaf': 'leaf',
  'icon-link': 'link',
  'icon-path': 'route',
  'icon-pine': 'pine',
  'icon-puzzle': 'puzzle',
  'icon-search': 'search',
  'icon-tree': 'tree',
  'icon-trending': 'trending-up',
  'icon-water': 'droplet',
  'icon-wave-line': 'activity',
}

/** Semantic icon for a skill node's legacy icon string — render with <Icon name={…} />. */
export function nodeIcon(iconHtml: string | undefined): IconName {
  if (!iconHtml) return 'target'
  const match = /icon-[\w-]+/.exec(iconHtml)
  return (match && NODE_ICONS[match[0]]) || 'target'
}

/* Rating tier → token color classes (never raw hex in markup). */
export function ratingTextClass(rating: number | null | undefined): string {
  const r = rating ?? 0
  if (r >= 2400) return 'text-destructive'
  if (r >= 2100) return 'text-accent'
  if (r >= 1900) return 'text-primary-bright'
  if (r >= 1600) return 'text-info'
  if (r >= 1400) return 'text-cyan'
  if (r >= 1200) return 'text-success'
  return 'text-foreground-dim'
}
