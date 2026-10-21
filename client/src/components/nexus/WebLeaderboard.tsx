import { useState } from 'react'
import { Card, CardContent, EmptyState, ErrorState, LoadingBlock, RankGlyph, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn, formatNumber } from '@/lib/utils'
import type { WebBoardResponse } from './types'

/*
 * Web rank leaderboards: overall, this week and friends (web XP across every
 * subject), or — with `subject` — the top learners of one subject by mastery.
 */
export function WebLeaderboard({ subject, subjectName }: { subject?: string; subjectName?: string }) {
  const { user } = useAuth()
  const [scope, setScope] = useState<'all' | 'week' | 'friends'>('all')
  const effective = subject ? 'subject' : scope
  const { data, loading, error, refetch } = useApi<WebBoardResponse>(
    () => api.get<WebBoardResponse>('/api/nexus/leaderboard', { query: { scope: effective, subject } }),
    [effective, subject],
    { cacheKey: `nexus:board:${effective}:${subject ?? ''}` },
  )
  const unit = subject ? '% mastery' : scope === 'week' ? 'XP this week' : 'web XP'
  return (
    <Card className="nx-board">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mb-0 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            {subject ? `${subjectName ?? subject} · subject rank` : 'Web rank · every subject together'}
          </p>
          {!subject && (
            <Tabs
              variant="pills"
              items={[
                { id: 'all', label: 'Overall' },
                { id: 'week', label: 'This week' },
                { id: 'friends', label: 'Friends' },
              ]}
              active={scope}
              onChange={(id) => setScope(id as 'all' | 'week' | 'friends')}
            />
          )}
        </div>
        {loading && !data ? (
          <LoadingBlock rows={5} />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !data?.rows.length ? (
          <EmptyState
            icon="trophy"
            title="No one ranked yet"
            description={subject ? 'Master a concept in this subject to appear here.' : 'Open the Nexus to put your web rank on the board.'}
            className="py-6"
          />
        ) : (
          <ol className="space-y-1">
            {data.rows.map((r) => (
              <li
                key={r.username}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2',
                  r.username === user?.username ? 'border-primary/60 bg-primary/10' : 'border-border bg-surface',
                )}
              >
                <span className="w-6 text-right font-mono text-xs text-foreground-faint tabular-nums">{r.rank}</span>
                <RankGlyph level={r.level} size={22} animated={false} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.displayName}</span>
                <span className="font-mono text-xs text-foreground-dim tabular-nums">
                  {formatNumber(r.score)} <span className="text-foreground-faint">{unit}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {data?.me && !data.rows.some((r) => r.username === data.me!.username) && (
          <p className="mb-0 text-xs text-foreground-dim">
            You: #{data.me.rank} · {formatNumber(data.me.score)} {unit}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
