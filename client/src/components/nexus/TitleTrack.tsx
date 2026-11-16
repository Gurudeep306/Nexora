import { Check, Lock } from 'lucide-react'
import { EmptyState, RankGlyph, RIFT_TIERS } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import type { NexusStatsResponse } from './types'
import './title-track.css'

/**
 * The rank ladder: where you stand (a large badge, its name and motto, and
 * two hairlines to the next rank), then all eleven ranks from Bit to
 * ∞ Overflow, each with its badge and what it takes.
 * Consumes the snake_case `allTitles` from GET /api/stats.
 */
export function TitleTrack({ stats }: { stats: NexusStatsResponse | null }) {
  if (!stats) return <EmptyState icon="crown" title="No rank data" description="Sign in to see your rank progression." />

  const currentTitle = stats.title.current.title
  const reachedIdx = Math.max(0, stats.allTitles.findIndex((t) => t.title === currentTitle))
  const level = reachedIdx + 1
  const tier = RIFT_TIERS[Math.min(reachedIdx, RIFT_TIERS.length - 1)]
  const next = stats.title.next
  const xpPct = next ? Math.round((Math.max(0, next.min_xp - stats.title.xpToNext) / Math.max(1, next.min_xp)) * 100) : 100
  const solvePct = next && next.min_problems ? Math.round((Math.max(0, next.min_problems - stats.title.probsToNext) / Math.max(1, next.min_problems)) * 100) : 100

  return (
    <div className="tt">
      {/* Where you stand */}
      <section className="tt-now" aria-labelledby="tt-now-h" style={{ ['--tier' as string]: tier.color }}>
        <RankGlyph level={level} size={112} animated={false} className="tt-now-glyph" />
        <div className="min-w-0 flex-1">
          <p className="ed-label ed-muted m-0">
            Rank {level} of {stats.allTitles.length}
          </p>
          <h2 id="tt-now-h" className="tt-now-name">
            {currentTitle}
          </h2>
          <p className="tt-now-motto m-0">{tier.motto}</p>
          {next ? (
            <div className="tt-meters">
              <Meter label="XP" pct={xpPct} line={`${formatNumber(stats.title.xpToNext)} XP to ${next.title}`} />
              {next.min_problems != null && <Meter label="Solves" pct={solvePct} line={`${formatNumber(stats.title.probsToNext)} solves to ${next.title}`} />}
            </div>
          ) : (
            <p className="tt-now-top m-0">The top rank. Nothing above it.</p>
          )}
        </div>
      </section>

      {/* The ladder */}
      <ol className="tt-ladder" aria-label="All ranks">
        {stats.allTitles.map((t, i) => {
          const reached = i <= reachedIdx
          const isCurrent = i === reachedIdx
          const rt = RIFT_TIERS[Math.min(i, RIFT_TIERS.length - 1)]
          return (
            <li key={t.title} className={cn('tt-step', isCurrent && 'is-current', !reached && 'is-ahead')} style={{ ['--tier' as string]: rt.color }}>
              <span className="tt-step-no ed-mono">{String(i + 1).padStart(2, '0')}</span>
              <RankGlyph level={i + 1} size={44} animated={false} className="tt-step-glyph" />
              <span className="min-w-0 flex-1">
                <span className="tt-step-name block">
                  {t.title}
                  {isCurrent && <span className="tt-you">You</span>}
                </span>
                <span className="tt-step-motto block">{rt.motto}</span>
              </span>
              <span className="tt-step-need ed-mono">
                {i === 0 ? 'Start' : `${formatNumber(t.min_xp)} XP${t.min_problems != null ? ` · ${formatNumber(t.min_problems)} solves` : ''}`}
              </span>
              <span className="tt-step-state" aria-label={isCurrent ? 'Your rank' : reached ? 'Reached' : 'Ahead'}>
                {reached ? <Check className="size-4" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Meter({ label, pct, line }: { label: string; pct: number; line: string }) {
  return (
    <div className="tt-meter">
      <div className="flex items-baseline justify-between gap-3">
        <span className="ed-label ed-muted">{label}</span>
        <span className="ed-mono text-[12px] text-text-secondary">{pct}%</span>
      </div>
      <span className="tt-meter-line" role="progressbar" aria-label={`${label} towards the next rank`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <p className="ed-caption ed-muted m-0 mt-1.5">{line}</p>
    </div>
  )
}
