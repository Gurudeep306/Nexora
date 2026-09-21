import { motion } from 'motion/react'
import { ExternalLink, Clock, Radio } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { CountdownTimer } from './CountdownTimer'
import type { PlatformContest } from './types'

const LIVE_PHASES = new Set(['RUNNING', 'CODING'])
const UPCOMING_PHASES = new Set(['BEFORE', 'PENDING'])

export function contestBucket(c: PlatformContest): 'live' | 'upcoming' | 'past' {
  if (LIVE_PHASES.has(String(c.phase).toUpperCase())) return 'live'
  if (UPCOMING_PHASES.has(String(c.phase).toUpperCase())) return 'upcoming'
  return 'past'
}

function fmtDuration(secs?: number | null): string {
  if (!secs || secs <= 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

export function PlatformContestCard({ contest, index = 0 }: { contest: PlatformContest; index?: number }) {
  const bucket = contestBucket(contest)
  const isLive = bucket === 'live'
  const startMs = contest.startTime ?? null
  const endMs = startMs != null && contest.durationSeconds ? startMs + contest.durationSeconds * 1000 : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.32) }}
    >
      <Card
        interactive={!!contest.url}
        glow={isLive}
        className={cn('flex h-full flex-col p-4', isLive && 'border-accent/60 glow-box-accent')}
      >
        <div className="flex items-start justify-between gap-2">
          <PlatformBadge platform={contest.platform} />
          {isLive ? (
            <Badge variant="accent" className="animate-pulse-glow">
              <Radio /> Live
            </Badge>
          ) : bucket === 'upcoming' ? (
            <Badge variant="cyan">Upcoming</Badge>
          ) : (
            <Badge variant="default">Finished</Badge>
          )}
        </div>

        <p className={cn('mt-3 line-clamp-2 font-display text-sm leading-snug tracking-wide', isLive ? 'text-foreground glow-accent-text' : 'text-foreground')}>
          {contest.name}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-dim">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-foreground-faint" />
            {fmtDuration(contest.durationSeconds)}
          </span>
          {startMs != null && bucket !== 'past' && (
            <span className="inline-flex items-center gap-1.5">
              {bucket === 'upcoming' ? (
                <>
                  <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Starts in</span>
                  <CountdownTimer target={startMs} />
                </>
              ) : endMs != null ? (
                <>
                  <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Ends in</span>
                  <CountdownTimer target={endMs} countUpAfter={false} />
                </>
              ) : null}
            </span>
          )}
          {bucket === 'past' && startMs != null && (
            <span className="font-mono tabular-nums">
              {new Date(startMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {contest.url && (
          <div className="mt-auto pt-4">
            <Button
              variant={isLive ? 'accent' : 'outline'}
              size="sm"
              className="w-full"
              onClick={() => window.open(contest.url, '_blank', 'noopener,noreferrer')}
            >
              {isLive ? 'Join the fight' : 'View on platform'} <ExternalLink />
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
