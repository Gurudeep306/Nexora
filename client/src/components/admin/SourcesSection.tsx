import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'
import { SourceGaps } from './SourceGaps'
import { SourceTopics } from './SourceTopics'

type TestReport = {
  at: string
  ok: boolean
  list: { ok: boolean; count?: number; rated?: number; tagged?: number; ms: number; error?: string; example?: { problem_id: string; title: string; rating: number; url: string } | null } | null
  statement: {
    ok: boolean
    problem: { problem_id: string; title: string; url?: string }
    chars?: number
    preview?: string
    timeLimit?: string
    memLimit?: string
    samples?: { input: string; output: string }[]
    sampleCount?: number
    interactive?: boolean
    kind?: string
    ms: number
    error?: string
  } | null
}

export type ProblemSource = {
  id: string
  name: string
  label: string
  description: string
  origin: string
  kind: 'stdin' | 'function' | 'answer'
  enabled: boolean
  note: string
  autoSync: boolean
  problems: number
  statements: number
  lastSync: string | null
  lastCount: number | null
  lastAdded: number | null
  lastUpdated: number | null
  lastError: string | null
  lastTest: TestReport | null
  running: { startedAt: number; phase: string } | null
  updatedBy: string | null
  updatedAt: string | null
}

const KIND_LABEL: Record<ProblemSource['kind'], string> = {
  stdin: 'Judged with samples',
  function: 'Function problems',
  answer: 'Answer-only',
}

const fmt = (n: number) => n.toLocaleString()

export function SourcesSection() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<{ sources: ProblemSource[] }>('/api/problem-sources'), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const sources = data?.sources ?? []
  const anyRunning = sources.some((s) => s.running)

  // While a sync runs, refresh the list so its phase and result appear.
  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(() => void refetch(), 3000)
    return () => clearInterval(t)
  }, [anyRunning, refetch])

  const save = async (id: string, patch: Partial<Pick<ProblemSource, 'enabled' | 'label' | 'note' | 'autoSync'>>, done: string) => {
    setBusy(`${id}:save`)
    try {
      const r = await api.put<{ sources: ProblemSource[] }>(`/api/problem-sources/${id}`, patch)
      setData({ sources: r.sources })
      toast.success(done)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }
  const sync = async (s: ProblemSource) => {
    setBusy(`${s.id}:sync`)
    try {
      await api.post(`/api/problem-sources/${s.id}/sync`, {})
      toast.success(`Syncing ${s.label}`, 'Large sources take a minute or two.')
      await refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start the sync')
    } finally {
      setBusy(null)
    }
  }
  const runTest = async (s: ProblemSource) => {
    setBusy(`${s.id}:test`)
    setOpen(s.id)
    try {
      const r = await api.post<{ report: TestReport }>(`/api/problem-sources/${s.id}/test`, {}, { timeoutMs: 180000 })
      setData({ sources: sources.map((x) => (x.id === s.id ? { ...x, lastTest: r.report } : x)) })
      if (r.report.ok) toast.success(`${s.label} works`, 'The list and a statement were fetched and parsed.')
      else toast.error(`${s.label} has a problem`, r.report.list?.error || r.report.statement?.error || 'See the test result')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The test failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !data) return <Failed message={error ?? 'Could not load the sources'} onRetry={refetch} />

  const on = sources.filter((s) => s.enabled)
  const total = on.reduce((n, s) => n + s.problems, 0)
  const cached = on.reduce((n, s) => n + s.statements, 0)

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 divide-x divide-[color:var(--nx-hair)] rounded-[14px] py-3 shadow-[inset_0_0_0_1px_var(--nx-hair)]">
        {[
          ['Sources on', `${on.length} of ${sources.length}`],
          ['Problems shown', fmt(total)],
          ['Statements saved', fmt(cached)],
        ].map(([k, v]) => (
          <div key={k} className="px-4">
            <dt className="text-[11.5px] text-text-muted">{k}</dt>
            <dd className="nx-num mt-0.5 text-[18px] font-semibold text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>

      <Panel
        icon="database"
        title="Problem sources"
        description="Switch judges on or off, rename them, sync their lists and test them live. Switched-off sources disappear from the problem list."
        bodyClassName="!p-0"
      >
        <ul className="divide-y divide-[color:var(--nx-hair)]">
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              s={s}
              busy={busy}
              open={open === s.id}
              onToggleOpen={() => setOpen(open === s.id ? null : s.id)}
              onSave={save}
              onSync={() => void sync(s)}
              onTest={() => void runTest(s)}
            />
          ))}
        </ul>
      </Panel>

      <SourceGaps />

      <SourceTopics />
    </div>
  )
}

function SourceRow({
  s,
  busy,
  open,
  onToggleOpen,
  onSave,
  onSync,
  onTest,
}: {
  s: ProblemSource
  busy: string | null
  open: boolean
  onToggleOpen: () => void
  onSave: (id: string, patch: Partial<Pick<ProblemSource, 'enabled' | 'label' | 'note' | 'autoSync'>>, done: string) => Promise<void>
  onSync: () => void
  onTest: () => void
}) {
  const [label, setLabel] = useState(s.label)
  const [note, setNote] = useState(s.note)
  useEffect(() => {
    setLabel(s.label)
    setNote(s.note)
  }, [s.label, s.note])
  const dirty = label.trim() !== s.label || note.trim() !== s.note
  const testing = busy === `${s.id}:test`
  const status = s.running
    ? { tone: 'info', text: s.running.phase }
    : s.lastError
      ? { tone: 'danger', text: 'Last sync failed' }
      : s.lastSync
        ? { tone: 'success', text: `Synced ${ago(s.lastSync)}` }
        : { tone: undefined, text: 'Never synced' }

  return (
    <li className={cn('px-4 py-4 sm:px-5', !s.enabled && 'bg-[color-mix(in_oklab,var(--color-bg-surface-2)_45%,transparent)]')}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onToggleOpen} aria-expanded={open} className="flex cursor-pointer items-center gap-1.5 text-left text-[14.5px] font-semibold text-text-primary hover:underline">
              <ChevronRight aria-hidden="true" className={cn('size-3.5 text-text-muted transition-transform', open && 'rotate-90')} />
              {s.label}
            </button>
            {s.label !== s.name && <span className="text-[12px] text-text-muted">{s.name}</span>}
            <Chip tone={status.tone}>
              {s.running && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
              {status.text}
            </Chip>
            {s.kind !== 'stdin' && <Chip>{KIND_LABEL[s.kind]}</Chip>}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">{s.description}</p>
          <p className="nx-num mt-1.5 text-[12px] text-text-muted">
            {fmt(s.problems)} problems · {fmt(s.statements)} statements saved
            {s.lastSync && !s.running && s.lastAdded != null && (
              <>
                {' '}
                · last sync {fmt(s.lastAdded)} new, {fmt(s.lastUpdated ?? 0)} updated
              </>
            )}
          </p>
          {s.lastError && !s.running && <p className="mt-1.5 text-[12px] text-state-error">{s.lastError}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" className="nx-btn" data-size="sm" onClick={onTest} disabled={!!busy || !!s.running}>
            <Icon name={testing ? 'refresh' : 'crosshair'} className={cn(testing && 'animate-spin')} /> {testing ? 'Testing…' : 'Test'}
          </button>
          <button type="button" className="nx-btn" data-size="sm" onClick={onSync} disabled={!!busy || !!s.running}>
            <Icon name="refresh" className={cn(s.running && 'animate-spin')} /> {s.running ? 'Syncing…' : 'Sync now'}
          </button>
          <Toggle checked={s.enabled} label={`Show ${s.label} problems`} disabled={busy === `${s.id}:save`} onChange={(v) => void onSave(s.id, { enabled: v }, v ? `${s.label} is on` : `${s.label} is off`)} />
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12px] font-medium text-text-secondary">Name shown on the site</span>
              <input className="nx-input mt-1 w-full" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-text-secondary">Admin note</span>
              <textarea className="nx-input mt-1 min-h-16 w-full resize-y py-2" value={note} maxLength={500} placeholder="Why it's on or off, quirks to know…" onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Toggle checked={s.autoSync} label="Sync automatically once a day" onChange={(v) => void onSave(s.id, { autoSync: v }, v ? 'Daily sync on' : 'Daily sync off')} />
              <button type="button" className="nx-btn" data-variant="primary" data-size="sm" disabled={!dirty || busy === `${s.id}:save`} onClick={() => void onSave(s.id, { label: label.trim() || s.name, note: note.trim() }, 'Saved')}>
                Save
              </button>
            </div>
            <a href={s.origin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary">
              {s.origin.replace(/^https?:\/\//, '')} <Icon name="external" className="size-3" />
            </a>
            {s.updatedBy && <p className="text-[11.5px] text-text-muted">Last changed by @{s.updatedBy}{s.updatedAt ? ` ${ago(s.updatedAt)}` : ''}</p>}
          </div>
          <TestResult report={s.lastTest} testing={testing} />
        </div>
      )}
    </li>
  )
}

function TestResult({ report, testing }: { report: TestReport | null; testing: boolean }) {
  if (testing) {
    return (
      <div className="space-y-2 rounded-[12px] p-4 shadow-[inset_0_0_0_1px_var(--nx-hair)]">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20" />
      </div>
    )
  }
  if (!report) {
    return (
      <div className="flex items-center rounded-[12px] p-4 text-[12.5px] text-text-secondary shadow-[inset_0_0_0_1px_var(--nx-hair)]">
        Not tested yet. A test fetches the whole list and one statement live, and shows exactly what was read, without saving anything.
      </div>
    )
  }
  const l = report.list
  const st = report.statement
  return (
    <div className="space-y-3 rounded-[12px] p-4 shadow-[inset_0_0_0_1px_var(--nx-hair)]">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-text-primary">
        <Icon name={report.ok ? 'check-circle' : 'x-circle'} className={cn('size-4', report.ok ? 'text-state-success' : 'text-state-error')} />
        {report.ok ? 'Importing works' : 'Something failed'}
        <span className="ml-auto font-normal text-text-muted">{ago(report.at)}</span>
      </p>
      {l && (
        <div className="text-[12.5px]">
          <p className="text-text-secondary">
            <span className="font-medium text-text-primary">List</span> ·{' '}
            {l.ok ? (
              <span className="nx-num">
                {fmt(l.count ?? 0)} problems, {fmt(l.rated ?? 0)} rated, {fmt(l.tagged ?? 0)} tagged, {(l.ms / 1000).toFixed(1)} s
              </span>
            ) : (
              <span className="text-state-error">{l.error}</span>
            )}
          </p>
          {l.example && (
            <p className="mt-0.5 truncate text-text-muted">
              e.g. {l.example.problem_id} · {l.example.title} · {l.example.rating || 'unrated'}
            </p>
          )}
        </div>
      )}
      {st && (
        <div className="space-y-2 text-[12.5px]">
          <p className="text-text-secondary">
            <span className="font-medium text-text-primary">Statement</span> · {st.problem.problem_id} {st.problem.title}
          </p>
          {st.ok ? (
            <>
              <p className="flex flex-wrap gap-1.5">
                <Chip>{st.timeLimit || 'no time limit given'}</Chip>
                <Chip>{st.memLimit || 'no memory limit given'}</Chip>
                <Chip>{st.sampleCount} sample{st.sampleCount === 1 ? '' : 's'}</Chip>
                {st.interactive && <Chip tone="warning">Interactive</Chip>}
              </p>
              <p className="line-clamp-3 text-text-secondary">{st.preview}</p>
              {st.samples?.[0] && (
                <div className="grid grid-cols-2 gap-2">
                  {(['input', 'output'] as const).map((k) => (
                    <div key={k}>
                      <p className="mb-1 text-[11px] text-text-muted capitalize">{k}</p>
                      <pre className="max-h-28 overflow-auto rounded-[8px] bg-bg-surface-2 p-2 font-mono text-[11.5px] leading-snug text-text-primary">{st.samples![0][k] || ' '}</pre>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-state-error">{st.error || 'The statement came back empty'}</p>
          )}
        </div>
      )}
    </div>
  )
}
