import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  label = 'Progress',
}: {
  value: number
  max?: number
  className?: string
  barClassName?: string
  /** Accessible name (screen readers announce "<label>, n%"). */
  label?: string
}) {
  // A missing or NaN value reads as 0 (an absent aria-valuenow is invalid).
  const now = Number.isFinite(value) ? value : 0
  const pct = max > 0 ? Math.min(100, Math.max(0, (now / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={now}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      data-ui="progress"
      data-done={pct >= 100 || undefined}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border/20', className)}
    >
      <div
        data-ui="progress-bar"
        className={cn('h-full rounded-full bg-primary/20 transition-[width] duration-500 ease-out', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function XpBar({ xp, nextLevelXp, level, levelName }: { xp: number; nextLevelXp: number; level?: number | string; levelName?: string }) {
  const pct = nextLevelXp > 0 ? Math.min(100, (xp / nextLevelXp) * 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm font-medium">
        <span className="flex items-center gap-1">
          {level != null && (
            <>
              <span className="text-xs font-mono text-text-secondary">LVL {level} · </span>
            </>
          )}
          <span className="text-foreground">{levelName ?? 'Rift Walker'}</span>
        </span>
        <span className="font-mono text-text-secondary tabular-nums">
          {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
        </span>
      </div>
      <div data-ui="progress" data-done={pct >= 100 || undefined} className="relative h-2.5 w-full overflow-hidden rounded-full bg-border/20">
        <div
          data-ui="progress-bar"
          className="h-full rounded-full bg-primary/20 transition-[width] duration-700 ease-[var(--ease-emphasized)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}