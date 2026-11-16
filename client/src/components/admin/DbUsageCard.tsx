import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatCompact, formatNumber } from '@/lib/utils'
import { Failed } from './kit'
import type { DbStats } from './types'

/** One budget line: a hairline track, an ink fill, the words beside it. Over budget reads as a word, not a colour. */
function Meter({ label, used, quota, share, warnAt }: { label: string; used: number; quota: number; share: number; warnAt: number }) {
  const pct = Math.min(100, Math.round(share * 100))
  const state = share >= 0.8 ? 'over' : share >= warnAt ? 'near' : 'ok'
  return (
    <div className="desk-meter" data-state={state}>
      <div className="desk-meter-top">
        <span>{label}</span>
        <span className="desk-meter-n">
          {formatCompact(used)} <span>of {formatCompact(quota)} · {pct}%</span>
        </span>
      </div>
      <div className="desk-meter-track" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="desk-meter-fill" style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  )
}

const hours = (sec: number) => (sec < 3600 ? `${Math.max(1, Math.round(sec / 60))} min` : `${(sec / 3600).toFixed(1)} h`)

/**
 * The database budget for the weather box: projected rows read and written a
 * month on the free plan, the raw counts since boot, and the top queries.
 */
export function DbBudget() {
  const { data, loading, error, refetch } = useApi(() => api.get<DbStats>('/api/admin/db-stats?top=6'), [], { cacheKey: 'admin:db-stats' })
  if (loading && !data) return <div className="desk-budget" aria-busy="true" />
  if (error || !data) return <Failed message={error ?? 'Could not load database usage'} onRetry={refetch} />
  const { totals: t, projection: p } = data
  return (
    <div className="desk-budget">
      <p className="desk-budget-head">
        Database budget
        <span>{p.warning ? `over ${Math.round(p.warnAt * 100)}% of the free plan` : 'within the free plan'}</span>
      </p>
      <Meter label="Rows read a month" used={p.monthlyReads} quota={p.quota.reads} share={p.share.reads} warnAt={p.warnAt} />
      <Meter label="Rows written a month" used={p.monthlyWrites} quota={p.quota.writes} share={p.share.writes} warnAt={p.warnAt} />
      <p className="desk-budget-note">
        Projected from {hours(data.uptimeSec)} since the server started: {formatNumber(t.reads)} rows read{data.detailed ? ' (estimated)' : ' (lower bound)'}, {formatNumber(t.written)} written, {formatNumber(t.statements)} statements.
        {data.detailed ? '' : ' Set DB_STATS=1 for scan-aware estimates and the top queries.'}
      </p>
      <details className="desk-queries">
        <summary>Top queries by rows read</summary>
        {data.topReads.length === 0 ? (
          <p className="desk-budget-note">{data.detailed ? 'Nothing yet.' : 'Available with DB_STATS=1.'}</p>
        ) : (
          <ul>
            {data.topReads.map((q) => (
              <li key={q.sql}>
                <span className="desk-q-n">{formatCompact(q.reads)}</span>
                <code title={q.sql}>
                  {q.scans.length > 0 && <span className="desk-q-scan">scan</span>}
                  {q.sql}
                </code>
                <span className="desk-q-calls">×{q.calls}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  )
}

/** @deprecated The budget now lives in the overview's weather box (DbBudget). */
export const DbUsageCard = DbBudget
