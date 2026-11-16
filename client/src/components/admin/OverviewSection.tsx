import { Avatar } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { UserBadges } from '@/components/shared/UserBadges'
import { LoadingBlock } from '@/components/ui/EmptyState'
import { Delta, Failed, Kpi, RolePill, TrendChart } from './kit'
import { ago, delta } from './format'
import { siteWeather } from './desk'
import type { Overview } from './types'
import { DbBudget } from './DbUsageCard'

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

/* The front page of the editor's desk: lead figures, the site's weather, two
   charts and the wire (who just joined, who is here now). Every number is
   live from /api/admin/overview; nothing is invented. */

function ChartStory({ title, total, unit, series, days }: { title: string; total: number; unit: string; series: number[]; days: string[] }) {
  return (
    <section className="desk-story" aria-labelledby={`chart-${title}`}>
      <header className="desk-story-head">
        <h3 id={`chart-${title}`} className="ed-serif desk-story-title">
          {title}
        </h3>
        <Delta value={delta(series)} />
      </header>
      <p className="desk-story-figure">
        {formatNumber(total)} <span>{unit} · last 30 days</span>
      </p>
      <TrendChart series={series} days={days} unit={unit} />
    </section>
  )
}

export function OverviewSection({ onOpenUser }: { onOpenUser: (username: string) => void }) {
  const { data, loading, error, refetch } = useApi(() => api.get<Overview>('/api/admin/overview'), [], { cacheKey: 'admin:overview' })
  if (loading && !data) return <LoadingBlock rows={6} />
  if (error || !data) return <Failed message={error ?? 'Could not load the overview'} onRetry={refetch} />
  const { totals: t, series: s, days } = data
  const weather = siteWeather(t)

  return (
    <div className="desk-front">
      {/* ── lead figures ── */}
      <div className="desk-figures" role="group" aria-label="The last 30 days">
        <Kpi label="Users" value={t.users} series={s.signups} days={days} unit="sign-ups" />
        <Kpi label="Daily active" value={t.dau} series={s.dau} days={days} unit="active users" />
        <Kpi label="Submissions" value={t.submissions} series={s.submissions} days={days} unit="submissions" />
        <Kpi label="GATE attempts" value={t.gate_attempts} series={s.gate} days={days} unit="attempts" />
      </div>

      <div className="desk-band">
        {/* ── the weather box: errors, moderation and the database budget ── */}
        <section className="desk-weather ed-oat" aria-labelledby="desk-weather-title">
          <p className="ed-label">Site weather</p>
          <h3 id="desk-weather-title" className="ed-serif desk-weather-word" data-weather={weather.word.toLowerCase()}>
            {weather.word}
          </h3>
          <p className="desk-weather-line">{weather.line}</p>
          <dl className="desk-readings">
            <div>
              <dt>Server errors · 24h</dt>
              <dd>{formatNumber(t.errors24h)}</dd>
            </div>
            <div>
              <dt>Open reports</dt>
              <dd>{formatNumber(t.open_reports)}</dd>
            </div>
            <div>
              <dt>Banned or suspended</dt>
              <dd>{formatNumber(t.banned)}</dd>
            </div>
          </dl>
          <DbBudget />
        </section>

        {/* ── secondary figures ── */}
        <div className="desk-figures desk-figures-2" role="group" aria-label="More figures">
          <Kpi label="AI tutor tokens" value={t.ai_tokens} series={s.aiTokens} days={days} unit="tokens" />
          <Kpi label="Asked the AI tutor · 7 days" value={t.ai_users7} series={s.aiUsers} days={days} unit="people" />
          <Kpi label="Active this week" value={t.wau} hint="Signed in at least once in 7 days" />
          <Kpi label="New this week" value={t.signups7} hint={`${formatNumber(sum(s.signups))} in 30 days`} />
        </div>
      </div>

      <div className="desk-stories">
        <ChartStory title="Sign-ups" total={sum(s.signups)} unit="new accounts" series={s.signups} days={days} />
        <ChartStory title="Daily active" total={t.wau} unit="active this week" series={s.dau} days={days} />
      </div>

      {/* ── on the wire ── */}
      <section className="desk-wire" aria-labelledby="desk-wire-title">
        <h3 id="desk-wire-title" className="ed-label">
          On the wire
        </h3>
        <div className="desk-wire-cols">
          <div>
            <h4 className="ed-serif desk-wire-head">Recent sign-ups</h4>
            {data.recentSignups.length === 0 ? (
              <p className="desk-wire-empty">No one has joined yet. New accounts appear here.</p>
            ) : (
              <ul className="desk-rows">
                {data.recentSignups.map((u) => (
                  <li key={u.username}>
                    <button type="button" onClick={() => onOpenUser(u.username)} className="desk-row">
                      <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="desk-row-name">
                          <span className="truncate">{u.display_name || u.username}</span>
                          <UserBadges username={u.username} role={u.role} verified={u.verified} size={14} />
                        </span>
                        <span className="desk-row-handle">@{u.username}</span>
                      </span>
                      {u.role !== 'member' && <RolePill role={u.role} />}
                      <span className="desk-row-time">{ago(u.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="ed-serif desk-wire-head">
              Online now
              <span className="desk-wire-count">{data.online ? `${data.online.length} signed in` : 'Realtime unavailable'}</span>
            </h4>
            {!data.online?.length ? (
              <p className="desk-wire-empty">Nobody is online right now.</p>
            ) : (
              <ul className="desk-rows">
                {data.online.map((u) => (
                  <li key={u}>
                    <button type="button" onClick={() => onOpenUser(u)} className="desk-row">
                      <span className="desk-live" aria-hidden="true" />
                      <Avatar seed={u} name={u} size="xs" />
                      <span className="desk-row-handle desk-row-handle-ink">@{u}</span>
                      <UserBadges username={u} size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
