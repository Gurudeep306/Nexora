import { useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Crown, Medal, Flame, Trophy } from 'lucide-react'
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Tabs,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn, formatNumber } from '@/lib/utils'
import type { LeaderboardRow, LeaderboardType } from './types'
import { avatarSrc } from './types'

const TYPE_META: Record<LeaderboardType, { label: string; value: (r: LeaderboardRow) => number; unit: string }> = {
  xp: { label: 'XP', value: (r) => r.total_xp, unit: 'XP' },
  solved: { label: 'Solved', value: (r) => r.total_solved, unit: 'solves' },
  streak: { label: 'Streak', value: (r) => r.best_streak ?? 0, unit: 'streak' },
}

const PODIUM = [
  {
    place: 1,
    cls: 'border-gold/60 text-gold',
    glow: '0 0 18px rgba(250,204,21,0.35), 0 0 48px rgba(250,204,21,0.15)',
    icon: <Crown className="size-5" />,
  },
  {
    place: 2,
    cls: 'border-foreground-dim/50 text-foreground',
    glow: '0 0 14px rgba(226,232,240,0.25), 0 0 40px rgba(226,232,240,0.1)',
    icon: <Medal className="size-5" />,
  },
  {
    place: 3,
    cls: 'border-streak/60 text-streak',
    glow: '0 0 14px rgba(251,146,60,0.3), 0 0 40px rgba(251,146,60,0.12)',
    icon: <Medal className="size-5" />,
  },
]

export function LeaderboardTab({ me }: { me: string }) {
  const [type, setType] = useState<LeaderboardType>('xp')
  const lb = useApi<{ leaderboard: LeaderboardRow[]; type: string }>(
    () => api.get('/api/leaderboard', { query: { type, limit: 25 } }),
    [type],
  )

  const rows = lb.data?.leaderboard ?? []
  const meta = TYPE_META[type]
  const top3 = rows.slice(0, 3)
  const myIndex = rows.findIndex((r) => r.username === me)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="pills"
          items={[
            { id: 'xp', label: 'XP', icon: <Trophy className="size-3.5" /> },
            { id: 'solved', label: 'Solved', icon: <Flame className="size-3.5" /> },
            { id: 'streak', label: 'Streak', icon: <Flame className="size-3.5" /> },
          ]}
          active={type}
          onChange={(id) => setType(id as LeaderboardType)}
        />
        <p className="text-[11px] text-foreground-faint">
          Ranked by platform override stats · top 25
        </p>
      </div>

      {lb.loading ? (
        <LoadingBlock rows={6} />
      ) : lb.error ? (
        <ErrorState message={lb.error} onRetry={lb.refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Trophy />} title="No ranked players yet" />
        </Card>
      ) : (
        <>
          {/* ── Podium: 1st centered on desktop, gold first on mobile ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            {top3.map((row, i) => {
              const p = PODIUM[i]
              const isMe = row.username === me
              const orderCls = i === 0 ? 'order-1 sm:order-2' : i === 1 ? 'order-2 sm:order-1' : 'order-3 sm:order-3'
              return (
                <motion.div
                  key={row.username}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                  className={cn(orderCls, i === 0 && 'sm:-translate-y-3')}
                >
                  <Card
                    glow
                    className={cn(
                      'flex flex-col items-center gap-2 border px-4 py-6 text-center',
                      p.cls,
                      isMe && 'ring-2 ring-primary',
                    )}
                    style={{ boxShadow: p.glow }}
                  >
                    <span className={cn('flex items-center gap-1.5 font-display text-xs tracking-widest uppercase', p.cls)}>
                      {p.icon} #{p.place}
                    </span>
                    <Avatar src={avatarSrc(row)} name={row.display_name || row.username} size="xl" />
                    <div className="min-w-0">
                      <Link
                        to={`/profile/${encodeURIComponent(row.username)}`}
                        className="block cursor-pointer truncate font-display text-sm tracking-wide text-foreground transition-colors hover:text-primary-bright"
                      >
                        {row.display_name || row.username}
                      </Link>
                      <p className="truncate text-xs text-foreground-faint">@{row.username}</p>
                    </div>
                    <p className={cn('font-display text-xl tabular-nums', p.cls)}>
                      {formatNumber(meta.value(row))}
                      <span className="ml-1 text-[10px] tracking-wider uppercase opacity-70">
                        {meta.unit}
                      </span>
                    </p>
                    <div className="flex gap-1.5">
                      {row.role === 'admin' && <Badge variant="gold">Admin</Badge>}
                      {isMe && <Badge variant="primary">You</Badge>}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* ── Full table ── */}
          <Card>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Rank</TH>
                  <TH>Player</TH>
                  <TH className="text-right">XP</TH>
                  <TH className="text-right">Solved</TH>
                  {type === 'streak' && <TH className="text-right">Streak</TH>}
                </TR>
              </THead>
              <TBody>
                {rows.map((r, i) => {
                  const isMe = r.username === me
                  return (
                    <TR
                      key={r.username}
                      className={cn(
                        isMe && 'bg-primary/10 hover:bg-primary/15 border-l-2 border-l-primary',
                      )}
                    >
                      <TD className={cn('font-display tabular-nums', i < 3 && 'text-gold')}>
                        {i + 1}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar src={avatarSrc(r)} name={r.display_name || r.username} size="sm" />
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${encodeURIComponent(r.username)}`}
                              className="block cursor-pointer truncate text-sm font-semibold text-foreground transition-colors hover:text-primary-bright"
                            >
                              {r.display_name || r.username}
                              {isMe && <span className="ml-1.5 text-xs text-primary-bright">(you)</span>}
                            </Link>
                            <p className="truncate text-xs text-foreground-faint">@{r.username}</p>
                          </div>
                          {r.role === 'admin' && <Badge variant="gold">Admin</Badge>}
                        </div>
                      </TD>
                      <TD className="text-right font-mono text-foreground tabular-nums">
                        {formatNumber(r.total_xp)}
                      </TD>
                      <TD className="text-right font-mono text-foreground tabular-nums">
                        {formatNumber(r.total_solved)}
                      </TD>
                      {type === 'streak' && (
                        <TD className="text-right font-mono text-streak tabular-nums">
                          {formatNumber(r.best_streak ?? 0)}
                        </TD>
                      )}
                    </TR>
                  )
                })}
              </TBody>
            </Table>
            {myIndex === -1 && (
              <div className="border-t border-border px-4 py-3 text-xs text-foreground-faint">
                You are outside the top 25 on this board — keep grinding, @{me}.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
