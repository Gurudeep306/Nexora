import { Avatar } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { UserBadges } from '@/components/shared/UserBadges'
import { Delta, Empty, Failed, Kpi, Panel, RolePill, Skeleton, TrendChart } from './kit'
import { ago, delta } from './format'
import type { Overview } from './types'
import { DbUsageCard } from './DbUsageCard'

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

function ChartPanel({ title, total, unit, series, days, color }: { title: string; total: number; unit: string; series: number[]; days: string[]; color: string }) {
  return (
    <Panel title={title} description="Last 30 days" actions={<Delta value={delta(series)} />}>
      <p className="nx-display nx-num -mt-1 mb-3 text-[26px] leading-none font-semibold text-text-primary">
        {formatNumber(total)} <span className="font-sans text-[13px] font-normal tracking-normal text-text-secondary">{unit}</span>
      </p>
      <TrendChart series={series} days={days} color={color} unit={unit} />
    </Panel>
  )
}

export function OverviewSection({ onOpenUser }: { onOpenUser: (username: string) => void }) {
  const { data, loading, error, refetch } = useApi(() => api.get<Overview>('/api/admin/overview'), [], { cacheKey: 'admin:overview' })
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[150px]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    )
  }
  if (error || !data) return <Failed message={error ?? 'Could not load the overview'} onRetry={refetch} />
  const { totals: t, series: s, days } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Users" value={t.users} icon="users" series={s.signups} days={days} tone="brand" unit="sign-ups" />
        <Kpi label="Daily active" value={t.dau} icon="activity" series={s.dau} days={days} tone="teal" unit="active users" />
        <Kpi label="Submissions" value={t.submissions} icon="code" series={s.submissions} days={days} tone="violet" unit="submissions" />
        <Kpi label="GATE attempts" value={t.gate_attempts} icon="target" series={s.gate} days={days} tone="warning" unit="attempts" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="AI tutor tokens" value={t.ai_tokens} icon="bot" series={s.aiTokens} days={days} tone="violet" unit="tokens" />
        <Kpi label="Online now" value={t.online} icon="live" tone="success" hint={t.online == null ? 'Realtime unavailable' : `${formatNumber(t.wau)} active this week`} />
        <Kpi label="Open reports" value={t.open_reports} icon="flag" tone={t.open_reports ? 'warning' : 'brand'} hint={`${formatNumber(t.banned)} banned or suspended`} />
        <Kpi label="Server errors · 24h" value={t.errors24h} icon="warning" tone={t.errors24h ? 'danger' : 'success'} hint={t.errors24h ? '5xx responses — check the logs' : 'All quiet'} />
      </div>

      <DbUsageCard />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Sign-ups" total={sum(s.signups)} unit="new accounts" series={s.signups} days={days} color="var(--nx-b1)" />
        <ChartPanel title="Daily active users" total={t.wau} unit="active this week" series={s.dau} days={days} color="var(--nx-b3)" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Recent sign-ups" bodyClassName="p-1.5">
          {data.recentSignups.length === 0 ? (
            <Empty icon="users" title="No one yet">New accounts will show up here.</Empty>
          ) : (
            <ul>
              {data.recentSignups.map((u) => (
                <li key={u.username}>
                  <button
                    type="button"
                    onClick={() => onOpenUser(u.username)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-bg-surface-2"
                  >
                    <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-text-primary">
                        <span className="truncate">{u.display_name || u.username}</span>
                        <UserBadges username={u.username} role={u.role} verified={u.verified} size={14} />
                      </span>
                      <span className="block truncate text-xs text-text-muted">@{u.username}</span>
                    </span>
                    {u.role !== 'member' && <RolePill role={u.role} />}
                    <span className="w-16 shrink-0 text-right text-xs text-text-muted">{ago(u.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-state-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-state-success" />
              </span>
              Online now
            </span>
          }
          description={data.online ? `${data.online.length} signed in` : 'Realtime unavailable'}
        >
          {!data.online?.length ? (
            <p className="py-6 text-center text-[13px] text-text-muted">Nobody is online right now.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.online.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onOpenUser(u)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs text-text-primary shadow-[inset_0_0_0_1px_var(--nx-hair)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--nx-hair-strong)]"
                >
                  <Avatar seed={u} name={u} size="xs" />@{u}
                  <UserBadges username={u} size={12} />
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
