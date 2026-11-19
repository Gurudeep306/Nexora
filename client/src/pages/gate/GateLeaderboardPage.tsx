/*
  GATE leaderboard — week / month / all-time. Top three on a podium, the rest
  in a dense table, and the signed-in student always visible (pinned at the
  bottom when outside the shown rows).
*/
import { useState } from 'react'
import { Avatar, Card, Skeleton } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { gateApi, type LeaderboardRow } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { practiceLink } from '@/gate/shell/links'
import { EmptyHint, LinkButton, Segmented } from '@/gate/insights/ui'
import { pct } from '@/gate/insights/format'

type Period = 'week' | 'month' | 'all'
const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]

export default function GateLeaderboardPage() {
  const [exam] = useGateExam()
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('week')
  const q = useApi(() => gateApi.leaderboard(period), [period], { cacheKey: `gate:lb:${period}` })
  const rows = q.data?.rows ?? []
  const me = q.data?.me
  const meInRows = !!me && rows.some((r) => r.username === me.username)
  const isMe = (r: LeaderboardRow) => r.username === (me?.username ?? user?.username)

  return (
    <GateShell
      title="Leaderboard"
      subtitle="Score = GATE marks earned in the period. Accuracy and volume both count."
      actions={<Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />}
    >
      {q.loading && !q.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : !rows.length ? (
        <Card className="p-6">
          <EmptyHint
            icon="trophy"
            title={q.error ? 'Leaderboard unavailable' : 'No one on the board yet'}
            action={<LinkButton to={practiceLink({ exam })} variant="primary" icon="play">Solve a question</LinkButton>}
          >
            {q.error ? 'Rankings will appear here shortly.' : `Be the first on the ${PERIODS.find((p) => p.id === period)!.label.toLowerCase()} board — every correct PYQ earns GATE marks.`}
          </EmptyHint>
        </Card>
      ) : (
        <div className="space-y-5">
          <Podium rows={rows.slice(0, 3)} isMe={isMe} />
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <caption className="sr-only">GATE leaderboard, {PERIODS.find((p) => p.id === period)!.label}</caption>
                <thead className="border-b border-border text-[11.5px] tracking-wide text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="w-14 py-2.5 pl-4 font-medium sm:pl-5">#</th>
                    <th scope="col" className="py-2.5 font-medium">Student</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Solved</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Accuracy</th>
                    <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(3).map((r) => (
                    <Row key={r.username} r={r} me={isMe(r)} />
                  ))}
                </tbody>
                {me && !meInRows && (
                  <tfoot className="sticky bottom-0 border-t-2 border-accent-brand/40 bg-bg-surface-1">
                    <Row r={me} me />
                  </tfoot>
                )}
              </table>
            </div>
            {rows.length <= 3 && !(me && !meInRows) && <p className="px-5 py-4 text-center text-[13px] text-text-muted">That&rsquo;s everyone so far.</p>}
          </Card>
          {!me && user && (
            <p className="text-center text-[12.5px] text-text-muted">Solve a question this {period === 'all' ? 'season' : period} to appear on the board.</p>
          )}
        </div>
      )}
    </GateShell>
  )
}

function Row({ r, me }: { r: LeaderboardRow; me: boolean }) {
  return (
    <tr className={cn('transition-colors', me ? 'bg-bg-surface-3' : 'hover:bg-bg-surface-2')} aria-current={me ? 'true' : undefined}>
      <td className={cn('py-2.5 pl-4 font-mono font-semibold tabular-nums sm:pl-5', me ? 'text-text-secondary' : 'text-text-muted')}>{r.rank}</td>
      <td className="py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm" seed={r.username} avatar={r.avatar} name={r.displayName ?? r.username} ring={false} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-text-primary">
              {r.displayName ?? r.username}
              {me && <span className="ml-1.5 rounded px-1.5 py-px font-mono text-[10.5px] font-semibold text-text-primary shadow-[inset_0_0_0_1px_var(--color-text-primary)]">You</span>}
            </span>
            {r.displayName && <span className={cn('block truncate text-[11.5px]', me ? 'text-text-secondary' : 'text-text-muted')}>@{r.username}</span>}
          </span>
        </span>
      </td>
      <td className="py-2.5 text-right text-text-secondary tabular-nums">
        {r.correct}
        {/* The highlighted row is a shade darker: its quiet text steps up a tone to stay readable. */}
        <span className={me ? 'text-text-secondary' : 'text-text-muted'}>/{r.attempted}</span>
      </td>
      <td className="py-2.5 text-right text-text-secondary tabular-nums">{pct(r.accuracy)}%</td>
      <td className="py-2.5 pr-4 text-right font-mono text-[14px] font-semibold text-text-primary tabular-nums sm:pr-5">{Math.round(r.score * 100) / 100}</td>
    </tr>
  )
}

const PODIUM = [
  { h: 'sm:pt-2', label: '1st' },
  { h: 'sm:mt-6', label: '2nd' },
  { h: 'sm:mt-10', label: '3rd' },
]

function Podium({ rows, isMe }: { rows: LeaderboardRow[]; isMe: (r: LeaderboardRow) => boolean }) {
  // Visual order 2 · 1 · 3 on wide screens; ranked order on phones.
  const order = [1, 0, 2]
  return (
    <ol className="grid grid-cols-3 items-start gap-2 sm:gap-3">
      {order.map((i) => {
        const r = rows[i]
        if (!r) return <li key={i} aria-hidden="true" />
        const p = PODIUM[i]!
        return (
          <li key={r.username} className={cn('min-w-0', p.h)}>
            <Card className={cn('relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-4 text-center sm:px-3', isMe(r) && 'ring-2 ring-text-primary')}>
              {/* The place as a serif numeral; first place is underlined in clay. */}
              <span className={cn('ed-serif text-[2.5rem] leading-none text-text-primary', i === 0 && 'underline decoration-[var(--ed-clay)] decoration-2 underline-offset-[6px]')} aria-hidden="true">
                {i + 1}
              </span>
              <Avatar size={i === 0 ? 'lg' : 'md'} seed={r.username} avatar={r.avatar} name={r.displayName ?? r.username} />
              <p className="w-full truncate text-[13px] font-semibold text-text-primary">{r.displayName ?? r.username}</p>
              <p className="font-mono text-[16px] leading-none font-semibold text-text-primary tabular-nums">{Math.round(r.score * 100) / 100}</p>
              <p className="text-[11px] text-text-muted tabular-nums">
                <span className="sr-only">{p.label} place · </span>
                {pct(r.accuracy)}% · {r.correct} solved
              </p>
              {isMe(r) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                  <Icon name="star" className="size-3" /> You
                </span>
              )}
            </Card>
          </li>
        )
      })}
    </ol>
  )
}
