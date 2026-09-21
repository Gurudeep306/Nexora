import {
  Award,
  CalendarDays,
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Gem,
  Globe,
  Medal,
  Moon,
  Shield,
  Sunrise,
  Sword,
  Swords,
  Tags,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* Server stores legacy icon keys — map them to lucide + a token color class. */
const ICON_MAP: Record<string, { Icon: LucideIcon; className: string }> = {
  flag: { Icon: Flag, className: 'text-info' },
  calendar: { Icon: CalendarDays, className: 'text-cyan' },
  sword: { Icon: Sword, className: 'text-accent' },
  swords: { Icon: Swords, className: 'text-accent' },
  diamond: { Icon: Gem, className: 'text-cyan' },
  medal_green: { Icon: Medal, className: 'text-success' },
  medal_blue: { Icon: Medal, className: 'text-info' },
  medal_purple: { Icon: Medal, className: 'text-primary-bright' },
  medal_red: { Icon: Medal, className: 'text-accent' },
  muscle: { Icon: Dumbbell, className: 'text-warning' },
  target: { Icon: Target, className: 'text-cyan' },
  trophy: { Icon: Trophy, className: 'text-gold' },
  crown: { Icon: Crown, className: 'text-gold' },
  lightning: { Icon: Zap, className: 'text-warning' },
  moon: { Icon: Moon, className: 'text-primary-bright' },
  sunrise: { Icon: Sunrise, className: 'text-streak' },
  globe: { Icon: Globe, className: 'text-info' },
  tags: { Icon: Tags, className: 'text-success' },
  fire: { Icon: Flame, className: 'text-streak' },
  shield: { Icon: Shield, className: 'text-cyan' },
  dragon: { Icon: Swords, className: 'text-accent' },
}

export function AchievementIcon({ icon, locked, className }: { icon: string; locked?: boolean; className?: string }) {
  const { Icon, className: colorClass } = ICON_MAP[icon] ?? { Icon: Award, className: 'text-gold' }
  return <Icon className={cn('size-6', locked ? 'text-foreground-faint' : colorClass, className)} aria-hidden="true" />
}
