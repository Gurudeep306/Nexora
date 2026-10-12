import type { IconName } from '@/components/icon/names'

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

export const ACHIEVEMENT_ICONS: Record<string, IconName> = {
  sword: 'problems',
  fire: 'flame',
  shield: 'shield',
  dragon: 'flame',
  muscle: 'practice',
  target: 'target',
  trophy: 'trophy',
  crown: 'crown',
  medal_green: 'medal',
  medal_blue: 'medal',
  medal_purple: 'medal',
  medal_red: 'medal',
  globe: 'globe',
  lightning: 'bolt',
  diamond: 'gem',
  moon: 'moon',
  sunrise: 'sunrise',
  flag: 'flag',
  tags: 'tag',
  calendar: 'calendar',
  cat: 'sparkles',
}

/** Semantic icon for an achievement's legacy icon key. */
export function achievementIcon(key: string): IconName {
  return ACHIEVEMENT_ICONS[key] ?? 'award'
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
