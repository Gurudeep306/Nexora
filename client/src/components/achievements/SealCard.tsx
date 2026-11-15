import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/icon/Icon'
import { cn, formatDate } from '@/lib/utils'
import { achievementIcon, type AchievementRow } from './achievementMeta'
import './seals.css'

/**
 * An achievement as an embossed paper seal (the journal style). Earned:
 * ink with a clay rim, stamped in once the first time it scrolls into
 * view. Locked: debossed and muted, with the rule to earn it in italic.
 */
export function SealCard({ a }: { a: AchievementRow }) {
  const still = useReducedMotion()
  const earned = !!a.unlocked_at
  const pct = Math.min(100, Math.round((a.progress / Math.max(1, a.target)) * 100))
  return (
    <article className={cn('ac-seal', earned ? 'is-earned' : 'is-locked')}>
      <motion.span
        className="ac-seal-disc"
        aria-hidden="true"
        initial={earned && !still ? { scale: 1.2, rotate: -10 } : false}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon name={earned ? achievementIcon(a.icon) : 'lock'} className="size-6" />
      </motion.span>
      <div className="ac-seal-body">
        <h3 className="ac-seal-title ed-serif">{a.title}</h3>
        <p className="ac-seal-rule">{a.description}</p>
        {earned ? (
          <p className="ac-seal-meta">
            Earned {formatDate(a.unlocked_at as string)} · +{a.xp_reward} XP
          </p>
        ) : (
          <div className="ac-seal-meta">
            <span>
              {Math.min(a.progress, a.target)} / {a.target}
            </span>
            <span className="ac-seal-track" role="progressbar" aria-label={`${a.title} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </span>
            <span>+{a.xp_reward} XP</span>
          </div>
        )}
      </div>
    </article>
  )
}
