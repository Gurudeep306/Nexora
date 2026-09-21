import {
  Activity,
  BookOpen,
  Brain,
  Building2,
  ChartColumn,
  CircleDot,
  Coins,
  Crown,
  Dice5,
  Droplets,
  Gamepad2,
  GitBranch,
  Hash,
  Leaf,
  Link2,
  Network,
  Puzzle,
  Route,
  Search,
  Shapes,
  TreePine,
  TrendingUp,
  Type,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/* Server sends legacy HTML icon strings like `<i class="icon-book"></i>` — map them to lucide. */
const NODE_ICONS: Record<string, LucideIcon> = {
  'icon-abc': Type,
  'icon-bolt': Zap,
  'icon-book': BookOpen,
  'icon-brain': Brain,
  'icon-building': Building2,
  'icon-chart': ChartColumn,
  'icon-coins': Coins,
  'icon-crown': Crown,
  'icon-dice': Dice5,
  'icon-gamepad': Gamepad2,
  'icon-geometry': Shapes,
  'icon-graph': Network,
  'icon-hash': Hash,
  'icon-leaf': Leaf,
  'icon-link': Link2,
  'icon-path': Route,
  'icon-pine': TreePine,
  'icon-puzzle': Puzzle,
  'icon-search': Search,
  'icon-tree': GitBranch,
  'icon-trending': TrendingUp,
  'icon-water': Droplets,
  'icon-wave-line': Activity,
}

export function nodeIcon(iconHtml: string | undefined): LucideIcon {
  if (!iconHtml) return CircleDot
  const match = /icon-[\w-]+/.exec(iconHtml)
  return (match && NODE_ICONS[match[0]]) || CircleDot
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
