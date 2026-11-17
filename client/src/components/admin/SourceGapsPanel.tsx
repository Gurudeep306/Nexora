import { useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Select, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton } from './kit'
import { ago } from './format'

/*
  Admin → Problem sources → What is missing. For every source: how many
  problems lack a statement, samples, limits, tags, a rating, or have images
  not yet stored with us — only for what that judge publishes at all. A
  re-import fetches the list again, then the statements of the problems with
  gaps (in the background, with progress and a stop button); each problem can
  also be re-imported on its own. A judge that blocks servers stays missing:
  that is shown, never worked around.
*/

type Gap = 'statement' | 'samples' | 'time' | 'memory' | 'tags' | 'rating' | 'images'
const GAPS: Gap[] = ['statement', 'samples', 'time', 'memory', 'tags', 'rating', 'images']
type Job = {
  startedAt: number
  total: number
  done: number
  ok: number
  failed: number
  current: string | null
  finishedAt: number | null
  error: string | null
  cancelled: boolean
  failures: { problemId: string; error: string }[]
}
type SourceGaps = {
  platform: string
  name: string
  problems: number
  statements: number
  complete: number
  gaps: Record<Gap, number>
  notPublished: Gap[]
  at: number
  job: Job | null
}
type GapRow = { id: number; problemId: string; title: string; url: string; gaps: Gap[]; imagesMissing: number }
type GapPage = { at: number; total: number; page: number; size: number; rows: GapRow[]; job: Job | null }

const fmt = (n: number) => n.toLocaleString()
const SHORT: Record<Gap, string> = { statement: 'Statement', samples: 'Samples', time: 'Time limit', memory: 'Memory limit', tags: 'Tags', rating: 'Rating', images: 'Images' }

const running = (j: Job | null) => !!j && !j.finishedAt

export function SourceGapsPanel() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<{ labels: Record<Gap, string>; sources: SourceGaps[] }>('/api/problem-sources/gaps'), [])
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const list = data?.sources ?? []
  const anyRunning = list.some((s) => running(s.job))

  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(() => void refetch(), 3000)
    return () => clearInterval(t)
  }, [anyRunning, refetch])

  const checkAgain = async () => {
    setBusy('refresh')
    try {
      setData(await api.get<{ labels: Record<Gap, string>; sources: SourceGaps[] }>('/api/problem-sources/gaps?refresh=1', { timeoutMs: 120000 }))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not check')
    } finally {
      setBusy(null)
    }
  }
  const reimport = async (s: SourceGaps) => {
    setBusy(`${s.platform}:re`)
    try {
      await api.post(`/api/problem-sources/${s.platform}/reimport`, { limit: 100 })
      toast.success(`Re-importing ${s.name}`, 'Its list first, then up to 100 problems with gaps, one at a time.')
      await refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start')
    } finally {
      setBusy(null)
    }
  }
  const stop = async (s: SourceGaps) => {
    setBusy(`${s.platform}:stop`)
    try {
      await api.post(`/api/problem-sources/${s.platform}/reimport/stop`, {})
      toast.success('Stopping after the current problem')
      await refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not stop')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel
      icon="search"
      title="What is missing"
      description="Per source: problems without a statement, samples, limits, tags or a rating, or with images not yet stored with us. Only what the judge publishes counts — a dash means it never does."
      actions={
        <button type="button" className="nx-btn" data-size="sm" onClick={() => void checkAgain()} disabled={busy === 'refresh'}>
          <Icon name="refresh" className={cn(busy === 'refresh' && 'animate-spin')} /> Check again
        </button>
      }
      bodyClassName="!p-0"
    >
      {loading && !data ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : error || !data ? (
        <div className="p-4">
          <Failed message={error ?? 'Could not read what is missing'} onRetry={refetch} />
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--nx-hair)]">
          {list.map((s) => (
            <li key={s.platform} className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-[260px]">
                  <button
                    type="button"
                    onClick={() => setOpen(open === s.platform ? null : s.platform)}
                    aria-expanded={open === s.platform}
                    className="flex cursor-pointer items-center gap-1.5 text-left text-[14.5px] font-semibold text-text-primary hover:underline"
                  >
                    <ChevronRight aria-hidden="true" className={cn('size-3.5 text-text-muted transition-transform', open === s.platform && 'rotate-90')} />
                    {s.name}
                  </button>
                  <p className="nx-num mt-1 text-[12px] text-text-muted">
                    {fmt(s.problems)} problems · {fmt(s.statements)} statements · {fmt(s.complete)} complete
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {s.problems === 0 ? (
                      <Chip>Not synced yet — nothing to check</Chip>
                    ) : GAPS.map((g) =>
                      s.notPublished.includes(g) ? (
                        <Chip key={g}>
                          <span title="This judge does not publish it">{SHORT[g]} —</span>
                        </Chip>
                      ) : (
                        <Chip key={g} tone={s.gaps[g] ? 'warning' : 'success'}>
                          {SHORT[g]} {s.gaps[g] ? `${fmt(s.gaps[g])} missing` : 'all'}
                        </Chip>
                      ),
                    )}
                  </p>
                  <JobLine job={s.job} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {running(s.job) ? (
                    <button type="button" className="nx-btn" data-size="sm" onClick={() => void stop(s)} disabled={busy === `${s.platform}:stop` || !!s.job?.cancelled}>
                      <Icon name="pause" /> {s.job?.cancelled ? 'Stopping…' : 'Stop'}
                    </button>
                  ) : (
                    <button type="button" className="nx-btn" data-size="sm" onClick={() => void reimport(s)} disabled={!!busy || s.problems === 0 || s.problems === s.complete}>
                      <Icon name="download" /> Re-import gaps
                    </button>
                  )}
                </div>
              </div>
              {open === s.platform && <GapList source={s} onChanged={() => void refetch()} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function JobLine({ job }: { job: Job | null }) {
  if (!job) return null
  if (running(job)) {
    return (
      <p className="nx-num mt-2 flex items-center gap-1.5 text-[12px] text-text-secondary" aria-live="polite">
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
        {job.total ? `Re-importing ${fmt(job.done)} of ${fmt(job.total)}` : 'Reading the problem list'}
        {job.current ? ` · ${job.current}` : ''}
        {job.failed ? ` · ${fmt(job.failed)} still missing` : ''}
      </p>
    )
  }
  return (
    <div className="mt-2 text-[12px] text-text-secondary">
      <p className="nx-num">
        Last re-import {job.finishedAt ? ago(new Date(job.finishedAt).toISOString()) : ''}: {fmt(job.ok)} imported, {fmt(job.failed)} still missing
        {job.cancelled ? ' (stopped)' : ''}
      </p>
      {job.error && <p className="text-state-error">{job.error}</p>}
      {job.failures.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-text-muted">Why some are still missing</summary>
          <ul className="mt-1 space-y-0.5">
            {job.failures.map((f, i) => (
              <li key={i}>
                <span className="font-mono">{f.problemId}</span> — {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function GapList({ source, onChanged }: { source: SourceGaps; onChanged: () => void }) {
  const toast = useToast()
  const [gap, setGap] = useState<Gap | ''>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<GapPage | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (gap) params.set('gap', gap)
      if (q.trim()) params.set('q', q.trim())
      setData(await api.get<GapPage>(`/api/problem-sources/${source.platform}/gaps?${params}`))
      setErr(null)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load the problems')
    }
  }, [source.platform, gap, q, page])

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const reimportOne = async (r: GapRow) => {
    setBusy(r.id)
    try {
      const res = await api.post<{ result: { ok: boolean; error?: string; samples?: number; images?: { stored: number; found: number } | null } }>(
        `/api/problem-sources/${source.platform}/problems/${r.id}/reimport`,
        {},
        { timeoutMs: 120000 },
      )
      if (res.result.ok) {
        const imgs = res.result.images && res.result.images.found ? `, ${res.result.images.stored} of ${res.result.images.found} images stored` : ''
        toast.success(`${r.problemId} imported`, `${res.result.samples ?? 0} samples${imgs}.`)
      } else toast.error(`${r.problemId} is still missing`, res.result.error)
      await load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not re-import')
    } finally {
      setBusy(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1
  const offered = GAPS.filter((g) => !source.notPublished.includes(g))

  return (
    <div className="mt-4 space-y-3 rounded-[12px] p-3 shadow-[inset_0_0_0_1px_var(--nx-hair)] sm:p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 flex-1 basis-48">
          <span className="text-[12px] font-medium text-text-secondary">Find a problem</span>
          <input
            className="nx-input mt-1 w-full"
            value={q}
            placeholder="Title or id"
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="block basis-44">
          <span className="text-[12px] font-medium text-text-secondary">Missing</span>
          <Select
            className="nx-input mt-1 w-full"
            value={gap}
            onChange={(e) => {
              setGap(e.target.value as Gap | '')
              setPage(1)
            }}
          >
            <option value="">Anything</option>
            {offered.map((g) => (
              <option key={g} value={g}>
                {SHORT[g]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {err ? (
        <Failed message={err} onRetry={() => void load()} />
      ) : !data ? (
        <Skeleton className="h-24" />
      ) : data.total === 0 ? (
        <p className="py-3 text-[13px] text-text-secondary">{gap || q ? 'No problem matches.' : 'Nothing is missing here.'}</p>
      ) : (
        <>
          <ul className="divide-y divide-[color:var(--nx-hair)]">
            {data.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex min-w-0 items-center gap-2 text-[13px]">
                    <span className="shrink-0 font-mono text-[12px] text-text-muted">{r.problemId}</span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate text-text-primary hover:underline">
                        {r.title}
                      </a>
                    ) : (
                      <span className="truncate text-text-primary">{r.title}</span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {r.gaps.map((g) => (
                      <Chip key={g} tone="warning">
                        {g === 'images' && r.imagesMissing ? `${r.imagesMissing} image${r.imagesMissing === 1 ? '' : 's'}` : SHORT[g]}
                      </Chip>
                    ))}
                  </p>
                </div>
                <button type="button" className="nx-btn" data-size="sm" onClick={() => void reimportOne(r)} disabled={busy !== null} aria-label={`Re-import ${r.problemId}`}>
                  <Icon name="refresh" className={cn(busy === r.id && 'animate-spin')} /> {busy === r.id ? 'Importing…' : 'Re-import'}
                </button>
              </li>
            ))}
          </ul>
          <div className="nx-num flex flex-wrap items-center justify-between gap-2 text-[12px] text-text-muted">
            <span>
              {fmt(data.total)} problem{data.total === 1 ? '' : 's'} · checked {ago(new Date(data.at).toISOString())}
            </span>
            <span className="flex items-center gap-2">
              <button type="button" className="nx-btn" data-size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                {page} / {pages}
              </span>
              <button type="button" className="nx-btn" data-size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
