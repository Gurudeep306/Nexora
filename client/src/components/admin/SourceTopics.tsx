import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { SearchInput, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { topicLabel } from '@/lib/topics'
import { TopicChooser } from '@/components/topics/TopicChips'
import { Chip, Failed, Panel, Skeleton } from './kit'
import { ago } from './format'

/*
  Admin → Problem sources → Topics (src/topics.js). How many problems have
  topics and how many are unsure; run the pipeline for new problems or all of
  them (optionally asking the site's AI model about unsure ones that have a
  statement); and correct one problem's topics. A correction is kept for good:
  the pipeline never changes it, until "Back to automatic".
*/

type Summary = { total: number; classified: number; sure: number; unsure: number; locked: number; withText: number }
type Job = {
  running: boolean
  done: number
  total: number
  sure: number
  unsure: number
  startedAt: number
  finishedAt: number
  error: string | null
  ai: { asked: number; helped: number; error: string | null }
}
type Detail = { id: string; conf: number; from: 'tags' | 'text' | 'ai' | 'staff' }
type ProblemTopics = { topics: Detail[]; locked: boolean; sure: boolean; classified: boolean; updatedBy: string | null; updatedAt: number | null }
type Found = { id: number; title: string; platform: string; problem_id: string }

const fmt = (n: number) => n.toLocaleString()
const FROM: Record<Detail['from'], string> = { tags: 'from its tags', text: 'from its words', ai: 'from the AI', staff: 'set by staff' }

export function SourceTopics() {
  const toast = useToast()
  const { data, loading, error, refetch } = useApi(() => api.get<{ summary: Summary; job: Job }>('/api/problem-sources/topics'), [])
  const [heard, setJob] = useState<Job | undefined>(undefined)
  const job = heard ?? data?.job ?? null
  const [ai, setAi] = useState(false)
  const [busy, setBusy] = useState(false)

  // While a run is going, ask how it is going.
  useEffect(() => {
    if (!job?.running) return
    const t = setInterval(async () => {
      try {
        const r = await api.get<{ summary: Summary; job: Job }>('/api/problem-sources/topics')
        setJob(r.job)
        if (!r.job.running) void refetch()
      } catch {
        /* the next tick tries again */
      }
    }, 2500)
    return () => clearInterval(t)
  }, [job?.running, refetch])

  const start = async (all: boolean) => {
    setBusy(true)
    try {
      const r = await api.post<{ job: Job }>('/api/problem-sources/topics/backfill', { all, ai })
      setJob(r.job)
      toast.success(all ? 'Finding topics for every problem' : 'Finding topics for new problems', 'Corrections made by staff are kept.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start')
    } finally {
      setBusy(false)
    }
  }
  const stop = async () => {
    try {
      const r = await api.post<{ job: Job }>('/api/problem-sources/topics/stop', {})
      setJob(r.job)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not stop')
    }
  }

  if (loading && !data) return <Skeleton className="h-48" />
  if (error || !data) return <Failed message={error ?? 'Could not load topics'} onRetry={refetch} />
  const s = data.summary

  return (
    <Panel
      icon="tag"
      title="Topics"
      description="Each problem's topics come from its tags, then its title and statement. Staff corrections are kept for good."
      actions={
        <button type="button" className="ai-btn" onClick={() => void refetch()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Check again
        </button>
      }
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['With topics', `${fmt(s.classified)} of ${fmt(s.total)}`],
          ['Sure', fmt(s.sure)],
          ['Unsure', fmt(s.unsure)],
          ['Set by staff', fmt(s.locked)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11.5px] text-text-muted">{k}</dt>
            <dd className="nx-num mt-0.5 text-[16px] font-semibold text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>

      {job && (job.running || job.finishedAt > 0) && (
        <p className="m-0 mt-3 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary" role="status">
          <Chip tone={job.running ? 'info' : job.error ? 'warning' : 'success'}>{job.running ? 'Running' : 'Last run'}</Chip>
          {fmt(job.done)} of {fmt(job.total)} · {fmt(job.sure)} sure · {fmt(job.unsure)} unsure
          {job.ai.asked > 0 && ` · AI asked about ${job.ai.asked}, helped ${job.ai.helped}`}
          {!job.running && job.finishedAt > 0 && <span className="text-text-muted">· {ago(job.finishedAt)}</span>}
        </p>
      )}
      {job?.error && <p className="m-0 mt-1 text-[12.5px] text-state-error">{job.error}</p>}
      {job?.ai.error && <p className="m-0 mt-1 text-[12.5px] text-state-warning">AI: {job.ai.error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job?.running ? (
          <button type="button" className="ai-btn" onClick={() => void stop()}>
            Stop
          </button>
        ) : (
          <>
            <button type="button" className="ai-btn" disabled={busy} onClick={() => void start(false)}>
              Find topics for new problems
            </button>
            <button type="button" className="ai-btn" disabled={busy} onClick={() => void start(true)}>
              Run again for all
            </button>
          </>
        )}
        <label className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
          <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} disabled={job?.running} />
          Also ask the AI about up to 30 unsure problems (uses your AI allowance)
        </label>
      </div>
      <p className="m-0 mt-2 text-[12px] text-text-muted">
        New problems get topics by themselves: when a source syncs, when a statement is fetched and when staff save a problem. {fmt(s.withText)} have a statement to read.
      </p>

      <Correct />
    </Panel>
  )
}

/** Find a problem by name and set its topics by hand. */
function Correct() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Found[]>([])
  const [pick, setPick] = useState<Found | null>(null)
  const [current, setCurrent] = useState<ProblemTopics | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!q.trim()) return
    let live = true
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ problems: Found[] }>('/api/problems', { query: { search: q.trim(), limit: 8 } })
        if (live) setFound(r.problems)
      } catch {
        if (live) setFound([])
      }
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])

  const open = async (p: Found) => {
    setPick(p)
    setCurrent(null)
    try {
      setCurrent(await api.get<ProblemTopics>(`/api/problems/${p.id}/topics`))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load its topics')
    }
  }
  const save = async (ids: string[]) => {
    if (!pick) return
    setBusy(true)
    try {
      await api.put(`/api/problem-sources/topics/${pick.id}`, { topics: ids })
      setCurrent(await api.get<ProblemTopics>(`/api/problems/${pick.id}/topics`))
      toast.success('Topics saved', 'Kept for good: the pipeline will not change them.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  const automatic = async () => {
    if (!pick) return
    setBusy(true)
    try {
      await api.delete(`/api/problem-sources/topics/${pick.id}/lock`)
      setCurrent(await api.get<ProblemTopics>(`/api/problems/${pick.id}/topics`))
      toast.success('Back to automatic')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not change it')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4 border-t border-[color:var(--nx-hair)] pt-3" aria-label="Correct a problem's topics">
      <p className="m-0 mb-2 text-[13.5px] font-semibold text-text-primary">Correct a problem’s topics</p>
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Find a problem by name" aria-label="Find a problem by name" />
      {q.trim() && found.length > 0 && !pick && (
        <ul className="m-0 mt-2 list-none space-y-1 p-0">
          {found.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full min-w-0 cursor-pointer items-baseline gap-2 rounded px-1 py-0.5 text-left text-[13px] hover:bg-bg-surface-2" onClick={() => void open(p)}>
                <span className="truncate text-text-primary">{p.title}</span>
                <span className="shrink-0 text-[12px] text-text-muted">
                  {p.platform} {p.problem_id}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pick && (
        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <a href={`/solve/${pick.id}`} className="text-[13.5px] font-medium text-text-primary hover:underline">
              {pick.title}
            </a>
            <span className="text-[12px] text-text-muted">
              {pick.platform} {pick.problem_id}
            </span>
            <button type="button" className="ml-auto cursor-pointer text-[12.5px] text-text-secondary hover:text-text-primary" onClick={() => setPick(null)}>
              Pick another
            </button>
          </div>
          {!current ? (
            <Skeleton className="mt-2 h-10" />
          ) : (
            <>
              {current.topics.length ? (
                <ul className="m-0 mt-2 list-none space-y-0.5 p-0 text-[13px]">
                  {current.topics.map((t) => (
                    <li key={t.id} className="flex flex-wrap gap-x-2">
                      <span className="text-text-primary">{topicLabel(t.id)}</span>
                      <span className="text-text-muted">
                        {FROM[t.from] ?? t.from}
                        {t.from !== 'staff' && ` · ${Math.round(t.conf * 100)}% sure`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-2 text-[13px] text-text-muted">{current.classified ? 'No topic found.' : 'Not looked at yet.'}</p>
              )}
              {current.locked && current.updatedAt && (
                <p className="m-0 mt-1 text-[12px] text-text-muted">
                  Set by {current.updatedBy || 'staff'} · {ago(current.updatedAt)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ai-btn"
                  disabled={busy}
                  onClick={() => {
                    setDraft(current.topics.map((t) => t.id))
                    setChoosing(true)
                  }}
                >
                  Change topics
                </button>
                {current.locked && (
                  <button type="button" className="ai-btn" disabled={busy} onClick={() => void automatic()}>
                    Back to automatic
                  </button>
                )}
              </div>
            </>
          )}
          <TopicChooser
            open={choosing}
            value={draft}
            onChange={setDraft}
            onClose={() => setChoosing(false)}
            onDone={() => {
              setChoosing(false)
              void save(draft)
            }}
          />
        </div>
      )}
    </section>
  )
}
