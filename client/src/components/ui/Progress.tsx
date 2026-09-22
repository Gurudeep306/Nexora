import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number
  max?: number
  className?: string
  barClassName?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}
    >
      <div
        className={cn('h-full rounded-full bg-gradient-to-r from-primary to-primary-bright transition-[width] duration-500 ease-out', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function XpBar({ xp, nextLevelXp, level, levelName }: { xp: number; nextLevelXp: number; level?: number | string; levelName?: string }) {
  const pct = nextLevelXp > 0 ? Math.min(100, (xp / nextLevelXp) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-display font-semibold text-primary-bright">
          {level != null && <>LVL {level} · </>}
          {levelName ?? 'Rift Walker'}
        </span>
        <span className="font-mono text-foreground-dim tabular-nums">
          {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary via-primary-bright to-cyan transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgb(139 92 246 / 0.55)' }}
        >
          <span aria-hidden="true" className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgb(255_255_255/0.35)_50%,transparent_65%)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  )
}
