import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-surface-2 rounded', className)} aria-hidden="true" />
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
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border/20', className)}
    >
      <div
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
              <span className="text-xs font-mono text-foreground/60">LVL {level} · </span>
            </>
          )}
          <span className="text-foreground">{levelName ?? 'Rift Walker'}</span>
        </span>
        <span className="font-mono text-foreground/60 tabular-nums">
          {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-border/20">
        <div
          className="h-full rounded-full bg-primary/20 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        >
          <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,transparent_0%,primary_50%,transparent_100%)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  )
}