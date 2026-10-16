import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatCompact, formatNumber } from '@/lib/utils'
import { Failed, Panel, Skeleton } from './kit'
import type { DbStats } from './types'

function Meter({ label, used, quota, share, warnAt }: { label: string; used: number; quota: number; share: number; warnAt: number }) {
  const pct = Math.min(100, Math.round(share * 100))
  const tone = share >= 0.8 ? 'var(--color-state-error)' : share >= warnAt ? 'var(--color-state-warning)' : 'var(--color-state-success)'
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-text-secondary">{label}</span>
        <span className="nx-num text-text-primary">
          {formatCompact(used)} <span className="text-text-muted">/ {formatCompact(quota)} · {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-surface-2" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: tone }} />
      </div>
    </div>
  )
}

const hours = (sec: number) => (sec < 3600 ? `${Math.max(1, Math.round(sec / 60))} min` : `${(sec / 3600).toFixed(1)} h`)

/** DB reads/writes since boot, the top queries and the monthly projection. */
export function DbUsageCard() {
  const { data, loading, error, refetch } = useApi(() => api.get<DbStats>('/api/admin/db-stats?top=6'), [], { cacheKey: 'admin:db-stats' })
  if (loading && !data) return <Skeleton className="h-[260px]" />
  if (error || !data) return <Failed message={error ?? 'Could not load database usage'} onRetry={refetch} />
  const { totals: t, projection: p } = data
  return (
    <Panel
      title="Database usage"
      description={`Since boot (${hours(data.uptimeSec)}) · projected per month on the free plan`}
      actions={
        p.warning ? (
          <span className="nx-chip" data-tone="warning">
            Over {Math.round(p.warnAt * 100)}% of quota
          </span>
        ) : (
          <span className="nx-chip" data-tone="success">
            Within budget
          </span>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Meter label="Rows read / month" used={p.monthlyReads} quota={p.quota.reads} share={p.share.reads} warnAt={p.warnAt} />
          <Meter label="Rows written / month" used={p.monthlyWrites} quota={p.quota.writes} share={p.share.writes} warnAt={p.warnAt} />
          <p className="text-xs text-text-muted">
            {formatNumber(t.reads)} rows read{data.detailed ? ' (estimated)' : ' (lower bound)'} · {formatNumber(t.written)} written · {formatNumber(t.statements)} statements
            {data.detailed ? '' : ' — set DB_STATS=1 for scan-aware estimates and the top queries.'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[13px] text-text-secondary">Top queries by rows read</p>
          {data.topReads.length === 0 ? (
            <p className="text-xs text-text-muted">{data.detailed ? 'Nothing yet.' : 'Available with DB_STATS=1.'}</p>
          ) : (
            <ul className="space-y-1">
              {data.topReads.map((q) => (
                <li key={q.sql} className="flex items-baseline gap-2 text-xs">
                  <span className="nx-num w-14 shrink-0 text-right text-text-primary">{formatCompact(q.reads)}</span>
                  <code className="min-w-0 flex-1 truncate text-text-muted" title={q.sql}>
                    {q.scans.length > 0 && <span className="mr-1 text-state-warning">SCAN</span>}
                    {q.sql}
                  </code>
                  <span className="shrink-0 text-text-muted">×{q.calls}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  )
}
