import { useEffect, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { Chip, Failed, Panel, Skeleton } from './kit'

/*
  Admin → Problem sources → Fetching ahead. Every problem's statement, sample
  tests and figures are fetched before anyone opens it (src/sources/backfill.js),
  by the server while it is awake and by the "Fill problem statements"
  GitHub Actions job while it sleeps. Per judge: how many are stored, how
  many came with samples, and how many the judge refused (they are tried
  again later, after a growing wait).
*/

type Judge = { left: number | null; saved: number; failed: number; resting: boolean; done: boolean; lastError: string | null }
type Status = {
  coverage: { platform: string; total: number; stored: number; withSamples: number; failing: number }[]
  paused: boolean
  available: boolean
  run: { running: boolean; startedAt: number; finishedAt?: number; judges: Record<string, Judge> } | null
}

const NAMES: Record<string, string> = { codeforces: 'Codeforces', codechef: 'CodeChef', atcoder: 'AtCoder', leetcode: 'LeetCode', cses: 'CSES', euler: 'Project Euler', timus: 'Timus', uva: 'UVa', kattis: 'Kattis', spoj: 'SPOJ', dmoj: 'DMOJ', nexora: 'NexoraGuru' }
const fmt = (n: number) => n.toLocaleString()
const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 100) : 100)

export function SourceBackfill() {
  const toast = useToast()
  const { data, loading, error, refetch } = useApi(() => api.get<Status>('/api/problem-sources/backfill', { timeoutMs: 60000 }), [])
  const [busy, setBusy] = useState(false)
  const running = !!data?.run?.running
  // While it runs, look again every 20 s.
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => void refetch(), 20000)
    return () => clearInterval(t)
  }, [running, refetch])

  const act = async (action: 'start' | 'pause') => {
    setBusy(true)
    try {
      await api.post('/api/problem-sources/backfill', { action })
      toast.success(action === 'start' ? 'Fetching statements ahead' : 'Paused', action === 'pause' ? 'It stays paused until you resume it here.' : undefined)
      await refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not change it')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <Skeleton className="h-48" />
  if (error || !data) return <Failed message={error ?? 'Could not load the progress'} onRetry={refetch} />

  const rows = data.coverage.filter((r) => r.total > 0)
  const total = rows.reduce((n, r) => n + r.total, 0)
  const stored = rows.reduce((n, r) => n + r.stored, 0)
  const state = data.paused ? 'Paused' : running ? 'Fetching now' : stored >= total ? 'All stored' : 'Waiting for the next run'

  return (
    <Panel
      icon="download"
      title="Fetching ahead"
      description="Every statement, its sample tests and its figures are fetched before anyone opens the problem, a few seconds apart per judge. The server does it while awake; the scheduled GitHub job does it while the server sleeps."
      actions={
        data.available &&
        (data.paused || !running ? (
          <button type="button" className="ai-btn" disabled={busy} onClick={() => void act('start')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} {data.paused ? 'Resume' : 'Start now'}
          </button>
        ) : (
          <button type="button" className="ai-btn" disabled={busy} onClick={() => void act('pause')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />} Pause
          </button>
        ))
      }
    >
      <p className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
        <Chip tone={data.paused ? 'warning' : stored >= total && !running ? 'success' : undefined}>{state}</Chip>
        <span className="nx-num">
          {fmt(stored)} of {fmt(total)} statements stored ({pct(stored, total)}%)
        </span>
      </p>
      <ul className="space-y-3" aria-label="Statements stored per judge">
        {rows.map((r) => {
          const j = data.run?.judges[r.platform]
          const p = pct(r.stored, r.total)
          return (
            <li key={r.platform}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                <span className="font-medium text-text-primary">{NAMES[r.platform] ?? r.platform}</span>
                <span className="nx-num text-text-secondary">
                  {fmt(r.stored)} / {fmt(r.total)} · {fmt(r.withSamples)} with samples
                  {r.failing ? ` · ${fmt(r.failing)} to retry` : ''}
                  {j && j.saved ? ` · +${fmt(j.saved)} this run` : ''}
                  {j?.resting ? ' · resting (the judge is refusing)' : ''}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--nx-hair)]" role="progressbar" aria-label={`${NAMES[r.platform] ?? r.platform}: statements stored`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
                <div className="h-full rounded-full bg-text-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${p}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
