import { Icon, type IconName } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'

/* Server stores legacy icon keys — map them to a semantic icon + a token color class. */
const ICON_MAP: Record<string, { name: IconName; className: string }> = {
  flag: { name: 'flag', className: 'text-info' },
  calendar: { name: 'calendar', className: 'text-cyan' },
  sword: { name: 'problems', className: 'text-accent' },
  swords: { name: 'problems', className: 'text-accent' },
  diamond: { name: 'gem', className: 'text-cyan' },
  medal_green: { name: 'medal', className: 'text-success' },
  medal_blue: { name: 'medal', className: 'text-info' },
  medal_purple: { name: 'medal', className: 'text-primary-bright' },
  medal_red: { name: 'medal', className: 'text-accent' },
  muscle: { name: 'practice', className: 'text-warning' },
  target: { name: 'target', className: 'text-cyan' },
  trophy: { name: 'trophy', className: 'text-gold' },
  crown: { name: 'crown', className: 'text-gold' },
  lightning: { name: 'bolt', className: 'text-warning' },
  moon: { name: 'moon', className: 'text-primary-bright' },
  sunrise: { name: 'sunrise', className: 'text-streak' },
  globe: { name: 'globe', className: 'text-info' },
  tags: { name: 'tag', className: 'text-success' },
  fire: { name: 'flame', className: 'text-streak' },
  shield: { name: 'shield', className: 'text-cyan' },
  dragon: { name: 'flame', className: 'text-accent' },
  cat: { name: 'sparkles', className: 'text-primary-bright' },
}

export function AchievementIcon({ icon, locked, className }: { icon: string; locked?: boolean; className?: string }) {
  const { name, className: colorClass } = ICON_MAP[icon] ?? { name: 'award' as const, className: 'text-gold' }
  return <Icon name={name} className={cn('size-6', locked ? 'text-foreground-faint' : colorClass, className)} />
}
