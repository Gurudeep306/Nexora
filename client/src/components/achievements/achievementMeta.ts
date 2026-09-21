import {
  Award,
  Bot,
  Calendar,
  Cat,
  Crown,
  Flag,
  Flame,
  Gem,
  Globe,
  Medal,
  Moon,
  Shield,
  Sunrise,
  Swords,
  Tags,
  Target,
  Trophy,
  Zap,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react'

export interface AchievementRow {
  id: string
  title: string
  description: string
  icon: string
  category: string
  target: number
  progress: number
  xp_reward: number
  unlocked_at: string | null
}

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  sword: Swords,
  fire: Flame,
  shield: Shield,
  dragon: Bot,
  muscle: Dumbbell,
  target: Target,
  trophy: Trophy,
  crown: Crown,
  medal_green: Medal,
  medal_blue: Medal,
  medal_purple: Medal,
  medal_red: Medal,
  globe: Globe,
  lightning: Zap,
  diamond: Gem,
  moon: Moon,
  sunrise: Sunrise,
  flag: Flag,
  tags: Tags,
  calendar: Calendar,
  cat: Cat,
}

export function achievementIcon(key: string): LucideIcon {
  return ACHIEVEMENT_ICONS[key] ?? Award
}

export interface Rarity {
  label: string
  variant: 'gold' | 'accent' | 'cyan' | 'default'
  color: string
}

export function rarityOf(a: AchievementRow): Rarity {
  if (a.xp_reward >= 500 || a.category === 'special')
    return { label: 'Legendary', variant: 'gold', color: 'var(--color-gold)' }
  if (a.xp_reward >= 200) return { label: 'Epic', variant: 'accent', color: 'var(--color-accent)' }
  if (a.xp_reward >= 100) return { label: 'Rare', variant: 'cyan', color: 'var(--color-cyan)' }
  return { label: 'Common', variant: 'default', color: 'var(--color-foreground-faint)' }
}

export const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Milestones',
  streak: 'Streaks',
  solve: 'Solves',
  rating: 'Rating',
  special: 'Special',
  daily: 'Daily',
  general: 'General',
}
