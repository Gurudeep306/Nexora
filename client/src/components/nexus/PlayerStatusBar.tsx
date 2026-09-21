import { CalendarClock, Flame, Layers, Target, Zap } from 'lucide-react'
import { Card, CardContent, StatCard, XpBar } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import type { LevelRoadmapResponse, NexusResponse, NexusStatsResponse } from './types'

/** Weekly seeded roadmap refresh countdown (weekSeed = floor(now / 7d)). */
export function weekRefreshLabel(weekSeed: number | undefined): string {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const seed = weekSeed || Math.floor(Date.now() / msPerWeek)
  const msLeft = (seed + 1) * msPerWeek - Date.now()
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
  const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000))
  if (daysLeft <= 0) return 'Refreshes today'
  if (daysLeft === 1) return `Refreshes in ${hoursLeft}h`
  return `Refreshes in ${daysLeft} days`
}

export function PlayerStatusBar({
  nexus,
  roadmap,
  stats,
}: {
  nexus: NexusResponse
  roadmap: LevelRoadmapResponse | null
  stats: NexusStatsResponse | null
}) {
  const p = nexus.player
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={<Layers />}
          label="Rift Level"
          value={`${p.level}`}
          sub={
            <>
              {p.name} · zone {p.level}/{nexus.zones.length}
            </>
          }
          accent="primary"
        />
        <StatCard
          icon={<Zap />}
          label="Total XP"
          value={formatNumber(p.xp)}
          sub={
            <>
              <span className="font-mono tabular-nums">{formatNumber(p.xpInLevel)}</span> /{' '}
              <span className="font-mono tabular-nums">{formatNumber(p.xpForNext)}</span> this level
            </>
          }
          accent="cyan"
        />
        <StatCard
          icon={<Target />}
          label="Solves gate"
          value={`${p.probsInLevel}`}
          sub={
            <>
              of <span className="font-mono tabular-nums">{formatNumber(p.probsForNext)}</span> needed ·{' '}
              {p.probGated ? 'gated' : 'met'}
            </>
          }
          accent="success"
        />
        <StatCard
          icon={<Flame />}
          label="Streak"
          value={`${stats?.streak.current ?? 0}d`}
          sub={
            <>
              Best: <span className="font-mono tabular-nums">{stats?.streak.best ?? 0}d</span>
            </>
          }
          accent="warning"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <XpBar xp={p.xpInLevel} nextLevelXp={p.xpForNext} level={p.level} levelName={p.name} />
          </div>
          {roadmap && (
            <p className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-foreground-dim">
              <CalendarClock className="size-3.5 text-cyan" aria-hidden="true" />
              {weekRefreshLabel(roadmap.weekSeed)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
