import { Avatar, ErrorState, LoadingBlock } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { UserBadges } from '@/components/shared/UserBadges'
import { Kpi, Panel, RolePill, Trend } from './kit'
import { ago } from './format'
import type { Overview } from './types'

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

export function OverviewSection({ onOpenUser }: { onOpenUser: (username: string) => void }) {
  const { data, loading, error, refetch } = useApi(() => api.get<Overview>('/api/admin/overview'), [], { cacheKey: 'admin:overview' })
  if (loading && !data) return <LoadingBlock rows={6} />
  if (error || !data) return <ErrorState message={error ?? 'Could not load the overview'} onRetry={refetch} />
  const { totals: t, series: s, days } = data

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Users" value={t.users} icon="users" hint={<>+{formatNumber(t.signups7)} this week</>} series={s.signups} days={days} unit="sign-ups" />
        <Kpi label="Daily active" value={t.dau} icon="activity" hint={<>{formatNumber(t.wau)} weekly active</>} series={s.dau} days={days} tone="success" unit="active users" />
        <Kpi label="Submissions" value={t.submissions} icon="code" hint={<>{formatNumber(sum(s.submissions))} in 30 days</>} series={s.submissions} days={days} tone="info" unit="submissions" />
        <Kpi label="GATE attempts" value={t.gate_attempts} icon="target" hint={<>{formatNumber(sum(s.gate))} in 30 days</>} series={s.gate} days={days} tone="warning" unit="attempts" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="AI tutor tokens" value={t.ai_tokens} icon="bot" hint={<>{formatNumber(t.ai_users7)} users this week</>} series={s.aiTokens} days={days} unit="tokens" />
        <Kpi label="Online now" value={t.online} icon="live" hint={t.online == null ? 'Realtime unavailable' : 'Connected sockets'} tone="success" />
        <Kpi label="Open reports" value={t.open_reports} icon="flag" hint={`${formatNumber(t.banned)} banned or suspended`} tone={t.open_reports ? 'warning' : 'accent'} />
        <Kpi label="Server errors" value={t.errors24h} icon="warning" hint="5xx responses, last 24 h" tone={t.errors24h ? 'danger' : 'success'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Sign-ups per day" description="Last 30 days">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-text-primary tabular-nums">{formatNumber(sum(s.signups))}</span>
            <span className="text-xs text-text-secondary">new accounts</span>
          </div>
          <Trend series={s.signups} days={days} color="var(--color-accent-brand)" unit="sign-ups" height={160} />
          <div className="mt-1 flex justify-between text-[11px] text-text-muted tabular-nums">
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </Panel>
        <Panel title="Recent sign-ups" bodyClassName="p-1.5">
          <ul>
            {data.recentSignups.map((u) => (
              <li key={u.username}>
                <button
                  type="button"
                  onClick={() => onOpenUser(u.username)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-bg-surface-2"
                >
                  <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text-primary">
                      {u.display_name || u.username}
                      <UserBadges username={u.username} role={u.role} verified={u.verified} />
                    </span>
                    <span className="block truncate text-xs text-text-secondary">@{u.username}</span>
                  </span>
                  {u.role !== 'member' && <RolePill role={u.role} />}
                  <span className="shrink-0 text-xs text-text-muted">{ago(u.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {data.online && data.online.length > 0 && (
        <Panel title="Online now" description={`${data.online.length} signed-in ${data.online.length === 1 ? 'user' : 'users'}`}>
          <div className="flex flex-wrap gap-2">
            {data.online.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onOpenUser(u)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-bg-surface-2 py-1 pr-2.5 pl-1 text-xs text-text-primary transition-colors hover:border-border-strong"
              >
                <Avatar seed={u} name={u} size="xs" online />@{u}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
