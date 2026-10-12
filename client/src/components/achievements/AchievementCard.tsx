import { motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { IconBadge } from '@/components/icon/Icon'
import { Badge, Card, Progress } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { achievementIcon, rarityOf, type AchievementRow } from './achievementMeta'

export function AchievementCard({ achievement, index }: { achievement: AchievementRow; index: number }) {
  const reduce = useReducedMotion()
  const rarity = rarityOf(achievement)
  const earned = Boolean(achievement.unlocked_at)
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.target)) * 100))

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, delay: reduce ? 0 : Math.min(index * 0.035, 0.5), ease: [0.34, 1.56, 0.64, 1] }}
      className="h-full"
    >
      <Card
        glow={earned}
        className={cn('flex h-full flex-col p-4', !earned && 'opacity-70 grayscale-[35%]')}
        style={
          earned
            ? { borderColor: rarity.color, boxShadow: `0 0 14px color-mix(in srgb, ${rarity.color} 30%, transparent)` }
            : undefined
        }
      >
        <div className="flex items-start gap-3">
          {earned ? (
            <IconBadge name={achievementIcon(achievement.icon)} color={rarity.color} box="lg" />
          ) : (
            <IconBadge name="lock" tone="neutral" box="lg" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn('font-display text-sm tracking-wide', earned ? 'text-foreground' : 'text-foreground-dim')}>
                {achievement.title}
              </h3>
              <Badge variant={rarity.variant} className="shrink-0">
                {rarity.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-foreground-dim">{achievement.description}</p>
          </div>
        </div>

        <div className="mt-3 flex-1" />

        {earned ? (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1 font-semibold" style={{ color: rarity.color }}>
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              Unlocked {formatDate(achievement.unlocked_at as string)}
            </span>
            <span className="font-mono text-gold tabular-nums">+{achievement.xp_reward} XP</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-foreground-faint">
              <span>
                {achievement.progress} / {achievement.target}
              </span>
              <span className="font-mono tabular-nums">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <p className="text-right font-mono text-[10px] text-gold/80 tabular-nums">
              reward +{achievement.xp_reward} XP
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
