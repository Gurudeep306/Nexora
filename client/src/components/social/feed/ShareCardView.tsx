import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import type { ShareCard } from './types'

const META: Record<ShareCard['type'], { icon: IconName; label: string; tone: string; glow: string }> = {
  solved: { icon: 'check-circle', label: 'Problem solved', tone: 'text-state-success', glow: 'var(--color-state-success)' },
  gate_test: { icon: 'gate', label: 'GATE mock test', tone: 'text-state-info', glow: 'var(--color-state-info)' },
  streak: { icon: 'flame', label: 'Streak milestone', tone: 'text-state-warning', glow: 'var(--color-state-warning)' },
  lesson: { icon: 'learn', label: 'Lesson finished', tone: 'text-accent-brand', glow: 'var(--color-accent-brand)' },
  achievement: { icon: 'trophy', label: 'Achievement unlocked', tone: 'text-state-gold', glow: 'var(--color-state-gold)' },
}

/** A "look what I did" card attached to a post — built by the server from real data. */
export function ShareCardView({ card, className }: { card: ShareCard; className?: string }) {
  const m = META[card.type] ?? META.solved
  const inner = (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border p-4', className)}
      style={{
        background: `radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, ${m.glow} 22%, transparent), transparent 60%), linear-gradient(135deg, var(--color-bg-surface-2), var(--color-bg-surface))`,
      }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={cn('grid size-12 shrink-0 place-items-center rounded-2xl border border-border', m.tone)}
          style={{ background: `color-mix(in oklab, ${m.glow} 14%, var(--color-bg-surface))`, boxShadow: `0 8px 24px -10px ${m.glow}` }}
        >
          <Icon name={m.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-semibold tracking-[0.12em] uppercase', m.tone)}>{m.label}</p>
          <p className="truncate text-[15px] font-semibold text-text-primary">{card.title}</p>
          {card.subtitle && <p className="truncate text-xs text-text-secondary">{card.subtitle}</p>}
        </div>
        {card.stat && <span className="shrink-0 rounded-lg border border-border bg-bg-app/40 px-2.5 py-1 font-mono text-sm font-semibold text-text-primary tabular-nums">{card.stat}</span>}
      </div>
    </div>
  )
  return card.link?.startsWith('/') ? (
    <Link to={card.link} onClick={(e) => e.stopPropagation()} className="block transition-transform hover:-translate-y-0.5">
      {inner}
    </Link>
  ) : (
    inner
  )
}
