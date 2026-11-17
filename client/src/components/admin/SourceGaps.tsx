import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton } from './kit'
import { ago } from './format'

/*
  Admin → Problem sources → What is missing. Per source: how many problems,
  how many statements are fetched, and what is missing (statement, samples,
  limits, tags, rating, images not yet stored by us). A field the judge does
  not publish shows "n/a", never as a gap. Click a number to see those
  problems, then re-import them (25 at a time, a few seconds apart) or store
  their images. A judge that blocks servers with a bot check stays blocked;
  the re-import says so instead of working around it.
*/

type Field = 'statement' | 'samples' | 'limits' | 'tags' | 'rating' | 'images'
type SourceAudit = {
  id: string
  name: string
  kind: string
  problems: number
  statements: number
  published: { rating: boolean; tags: boolean; samples: boolean; limits: boolean }
  missing: Record<Field, number>
  images: { total: number; inStatements: number }
}
type Reimport = {
  total: number
  done: number
  ok: number
  failed: number
  running: boolean
  startedAt: number
  finishedAt: number | null
  errors: { id: number; problem: string; error: string }[]
} | null
type GapProblem = { id: number; problem_id: string; title: string; url: string; rating: number | null; missingImages?: number }

const FIELDS: { key: Field; label: string; help: string }[] = [
  { key: 'statement', label: 'Statement', help: 'Not fetched yet (fetched when someone opens the problem)' },
  { key: 'samples', label: 'Samples', help: 'Fetched statements with no sample tests' },
  { key: 'limits', label: 'Limits', help: 'Fetched statements with no time or memory limit' },
  { key: 'tags', label: 'Tags', help: 'Problems with no tags' },
  { key: 'rating', label: 'Rating', help: 'Problems with no difficulty rating' },
  { key: 'images', label: 'Images', help: 'Statement images not stored by us yet' },
]
const fmt = (n: number) => n.toLocaleString()
const notPublished = (s: SourceAudit, f: Field) => (f === 'rating' || f === 'tags' || f === 'samples' || f === 'limits') && !s.published[f]

export function SourceGaps() {
  const toast = useToast()
  const { data, loading, error, refetch } = useApi(
    () => api.get<{ sources: SourceAudit[]; reimport: Reimport; batch: number }>('/api/problem-sources/audit', { timeoutMs: 120000 }),
    [],
  )
  const [pick, setPick] = useState<{ source: string; field: Field } | null>(null)
  const [list, setList] = useState<{ total: number; problems: GapProblem[] } | null>(null)
  const [listLoading, setListLoading] = useState(false)
  // The re-import status: what this page last heard (polled or started), else the audit's.
  const [heard, setJob] = useState<Reimport | undefined>(undefined)
  const job = heard === undefined ? (data?.reimport ?? null) : heard
  const [busy, setBusy] = useState(false)

  // While a re-import runs, ask how it is going.
  useEffect(() => {
    if (!job?.running) return
    const t = setInterval(async () => {
      try {
        const r = await api.get<{ reimport: Reimport }>('/api/problem-sources/reimport')
        setJob(r.reimport)
        if (r.reimport && !r.reimport.running) void refetch()
      } catch {
        /* the next tick tries again */
      }
    }, 3000)
    return () => clearInterval(t)
  }, [job?.running, refetch])

  /** Show (or hide) the problems of one source with one gap. */
  const choose = (source: string, field: Field) => {
    if (pick?.source === source && pick.field === field) {
      setPick(null)
      return
    }
    setPick({ source, field })
    setList(null)
    setListLoading(true)
    api
      .get<{ total: number; problems: GapProblem[] }>(`/api/problem-sources/${source}/gaps?field=${field}&limit=${data?.batch ?? 25}`, { timeoutMs: 60000 })
      .then((r) => setList(r))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Could not load the problems'))
      .finally(() => setListLoading(false))
  }

  if (loading && !data) return <Skeleton className="h-64" />
  if (error || !data) return <Failed message={error ?? 'Could not check the sources'} onRetry={refetch} />

  const name = (id: string) => data.sources.find((s) => s.id === id)?.name ?? id
  const fieldLabel = (f: Field) => FIELDS.find((x) => x.key === f)?.label.toLowerCase() ?? f

  const reimport = async () => {
    if (!list?.problems.length) return
    setBusy(true)
    try {
      const r = await api.post<{ reimport: Reimport }>('/api/problem-sources/reimport', { ids: list.problems.map((p) => p.id) })
      setJob(r.reimport)
      toast.success(`Re-importing ${list.problems.length} problems`, 'A few seconds apart, to be polite to the judge.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start the re-import')
    } finally {
      setBusy(false)
    }
  }
  const keepImages = async () => {
    if (!list?.problems.length) return
    setBusy(true)
    try {
      const r = await api.post<{ started: number }>('/api/problem-sources/keep-images', { ids: list.problems.map((p) => p.id) })
      toast.success(`Storing the images of ${r.started} statements`, 'Check again in a minute.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not store the images')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      icon="search"
      title="What is missing"
      description='What each source’s problems lack. "n/a": that judge does not publish it. Click a number to see the problems and re-import them.'
      actions={
        <button type="button" className="ai-btn" onClick={() => void refetch()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Check again
        </button>
      }
    >
      {job && (
        <p className="m-0 mb-3 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary" role="status">
          <Chip tone={job.running ? 'info' : job.failed ? 'warning' : 'success'}>{job.running ? 'Re-importing' : 'Last re-import'}</Chip>
          {job.done} of {job.total} done · {job.ok} saved · {job.failed} failed
          {!job.running && job.finishedAt && <span className="text-text-muted">· {ago(job.finishedAt)}</span>}
        </p>
      )}
      {job && job.errors.length > 0 && (
        <details className="mb-3 text-[12.5px] text-text-secondary">
          <summary className="cursor-pointer text-text-primary">Why some failed</summary>
          <ul className="m-0 mt-1 space-y-0.5 pl-4">
            {job.errors.map((e) => (
              <li key={e.id}>
                <span className="font-mono">{e.problem}</span>: {e.error}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="What each source is missing">
        <table className="w-full min-w-[42rem] text-left text-[13px]">
          <thead>
            <tr className="text-[11.5px] text-text-muted">
              <th scope="col" className="py-1.5 pr-3 font-medium">Source</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Problems</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Fetched</th>
              {FIELDS.map((f) => (
                <th key={f.key} scope="col" className="py-1.5 pr-3 text-right font-medium" title={f.help}>
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.id} className="border-t border-[color:var(--nx-hair)]">
                <th scope="row" className="py-1.5 pr-3 font-medium text-text-primary">{s.name}</th>
                <td className="nx-num py-1.5 pr-3 text-right">{fmt(s.problems)}</td>
                <td className="nx-num py-1.5 pr-3 text-right">{fmt(s.statements)}</td>
                {FIELDS.map((f) => {
                  if (notPublished(s, f.key)) {
                    return (
                      <td key={f.key} className="py-1.5 pr-3 text-right text-text-muted" title={`${s.name} does not publish ${f.label.toLowerCase()}`}>
                        n/a
                      </td>
                    )
                  }
                  const n = s.missing[f.key]
                  const chosen = pick?.source === s.id && pick.field === f.key
                  return (
                    <td key={f.key} className="py-1.5 pr-3 text-right">
                      {n > 0 ? (
                        <button
                          type="button"
                          onClick={() => choose(s.id, f.key)}
                          aria-pressed={chosen}
                          aria-label={`${fmt(n)}: ${s.name} problems missing ${f.label.toLowerCase()}`}
                          className={cn('nx-num cursor-pointer rounded px-1 underline underline-offset-2 hover:text-text-primary', chosen ? 'font-semibold text-text-primary' : 'text-text-secondary')}
                        >
                          {fmt(n)}
                        </button>
                      ) : (
                        <span className="nx-num text-text-muted">0</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pick && (
        <section className="mt-4 border-t border-[color:var(--nx-hair)] pt-3" aria-label="Problems with this gap">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="m-0 text-[13.5px] font-semibold text-text-primary">
              {name(pick.source)}: {list ? fmt(list.total) : '…'} missing {fieldLabel(pick.field)}
              {list && list.total > list.problems.length ? ` (the first ${list.problems.length} below)` : ''}
            </p>
            <span className="ml-auto flex flex-wrap gap-2">
              {pick.field === 'images' ? (
                <button type="button" className="ai-btn" disabled={busy || !list?.problems.length} onClick={() => void keepImages()}>
                  Store these images
                </button>
              ) : pick.field === 'tags' || pick.field === 'rating' ? null : (
                <button type="button" className="ai-btn" disabled={busy || job?.running || !list?.problems.length} onClick={() => void reimport()}>
                  {job?.running ? 'A re-import is running' : `Re-import these ${list?.problems.length ?? ''}`}
                </button>
              )}
            </span>
          </div>
          {(pick.field === 'tags' || pick.field === 'rating') && (
            <p className="m-0 mb-2 text-[12.5px] text-text-muted">Tags and ratings come with the source’s list: sync the source again to refresh them.</p>
          )}
          {listLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <ul className="m-0 list-none space-y-1 p-0">
              {(list?.problems ?? []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 text-[13px]">
                  <span className="font-mono text-[12px] text-text-muted">{p.problem_id}</span>
                  <a href={`/solve/${p.id}`} className="text-text-primary hover:underline">
                    {p.title}
                  </a>
                  {p.missingImages ? <span className="text-[12px] text-text-muted">{p.missingImages} images</span> : null}
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary" aria-label={`Original: ${p.title} on ${name(pick.source)} (opens in a new tab)`}>
                    Original <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Panel>
  )
}
