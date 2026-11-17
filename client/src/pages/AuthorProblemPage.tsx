import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, CircleAlert, ImagePlus, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import '@/components/site/brand.css'
import '@/components/admin/ai.css'
import '@/components/admin/author.css'
import { BackButton, LoadingBlock, Tabs, useToast } from '@/components/ui'
import { Chip, Confirm, Failed, Panel } from '@/components/admin/kit'
import { ago } from '@/components/admin/format'
import { ProblemPanel } from '@/components/solve/ProblemPanel'
import type { SolveProblem, StatementResponse } from '@/components/solve/types'
import { Markdown } from '@/learn/md'
import { CHEATSHEETS } from '@/lib/cheatsheets'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const CodeEditor = lazy(() => import('@/components/solve/CodeEditor').then((m) => ({ default: m.CodeEditor })))

/*
  Staff: write one coding problem (src/authoring.js). Everything saves as you
  type. The statement is previewed exactly as students will see it (the
  server converts it the way publishing does). Outputs can be made by a
  reference solution, and extra hidden tests by a generator program.
  Publishing needs all five solutions to pass every test, checked again after
  any change to the tests, the checker, the solutions or the time limit.
*/

const LANGS = ['cpp', 'java', 'python', 'javascript', 'c'] as const
type L = (typeof LANGS)[number]
const LANG_NAME: Record<L, string> = { cpp: 'C++', java: 'Java', python: 'Python', javascript: 'JavaScript', c: 'C' }
type Mode = 'exact' | 'tokens' | 'float' | 'unordered' | 'nocase' | 'program'
const MODES: { id: Mode; label: string; help: string }[] = [
  { id: 'exact', label: 'Same lines', help: 'Each line must match. Spaces at the end of a line and blank lines at the end do not matter.' },
  { id: 'tokens', label: 'Same words and numbers', help: 'The same words and numbers in the same order, with any spacing or line breaks.' },
  { id: 'float', label: 'Numbers, close enough', help: 'Numbers may differ by a small amount (set it below). Words must match.' },
  { id: 'unordered', label: 'Lines in any order', help: 'The same lines, in any order.' },
  { id: 'nocase', label: 'Any letter case', help: 'Like "same words", but YES and yes count as the same.' },
  { id: 'program', label: 'A checker program', help: 'For problems with many right answers. Your program decides.' },
]

type Test = { input: string; output: string; sample: boolean }
type Draft = {
  title: string
  statement: string
  inputSpec: string
  outputSpec: string
  note: string
  timeLimit: string
  memoryLimit: string
  tags: string[]
  rating: number
  editorial: string
  tests: Test[]
  checker: { mode: Mode; eps: number; lang: 'python' | 'cpp'; code: string }
  solutions: Record<L, string>
  generator: { lang: L; code: string; count: number }
}
type LangResult = { ok: boolean; verdict: string; detail: string; maxMs?: number; failedTest?: number | null }
type Verify = { at: number; by: string; ok: boolean; current: boolean; langs: Record<L, LangResult> }
type Authored = { id: number; status: 'draft' | 'published'; problemRowid: number | null; data: Draft; verify: Verify | null; updatedBy: string; updatedAt: string }
type Job = { kind: 'verify' | 'generate'; running: boolean; done: number; total: number; errors?: string[]; error?: string; result?: Verify }
type Loaded = { problem: Authored; job: Job | null; missing: string[] }
type Preview = { problem: SolveProblem; statement: StatementResponse }
type Save = 'saved' | 'saving' | 'unsaved' | 'failed'

const TABS = [
  { id: 'statement', label: 'Statement' },
  { id: 'tests', label: 'Tests' },
  { id: 'checker', label: 'Limits & checker' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'publish', label: 'Check & publish' },
] as const
type TabId = (typeof TABS)[number]['id']

const TOTAL_TEST_BYTES = 8 * 1024 * 1024
const bytes = (s: string) => new Blob([s]).size
const size = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

export default function AuthorProblemPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'statement') as TabId
  const setTab = (t: string) => setParams((p) => (p.set('tab', t), p), { replace: true })

  const [loadError, setLoadError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [meta, setMeta] = useState<Omit<Authored, 'data'> | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [draft, setDraftState] = useState<Draft | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const [save, setSave] = useState<Save>('saved')
  const [saveError, setSaveError] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [previewRev, setPreviewRev] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)
  const chain = useRef<Promise<void>>(Promise.resolve())

  const take = useCallback((r: { problem: Authored; missing: string[] }, withData: boolean) => {
    const { data, ...rest } = r.problem
    setMeta(rest)
    setMissing(r.missing)
    if (withData) {
      draftRef.current = data
      setDraftState(data)
    }
  }, [])

  useEffect(() => {
    let live = true
    api
      .get<Loaded>(`/api/authoring/${id}`)
      .then((r) => {
        if (!live) return
        take(r, true)
        setJob(r.job)
        setLoadError(null)
      })
      .catch((e) => live && setLoadError(e instanceof ApiError ? e.message : 'Could not load the problem'))
    return () => {
      live = false
    }
  }, [id, reload, take])

  /** Send what is on screen now; saves run one after another. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirty.current || !draftRef.current) return chain.current
    dirty.current = false
    const body = draftRef.current
    setSave('saving')
    chain.current = chain.current.then(async () => {
      try {
        const r = await api.put<{ problem: Authored; missing: string[] }>(`/api/authoring/${id}`, { data: body }, { timeoutMs: 120000 })
        take(r, false)
        setSaveError('')
        setSave(dirty.current ? 'unsaved' : 'saved')
        setPreviewRev((n) => n + 1)
      } catch (e) {
        dirty.current = true
        setSave('failed')
        setSaveError(e instanceof ApiError ? e.message : 'Could not save')
      }
    })
    return chain.current
  }, [id, take])

  const busy = !!job?.running
  const update = useCallback(
    (patch: Partial<Draft> | ((d: Draft) => Draft)) => {
      const cur = draftRef.current
      if (!cur || busy) return
      const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
      draftRef.current = next
      setDraftState(next)
      dirty.current = true
      setSave('unsaved')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 900)
    },
    [busy, flush],
  )

  // Leaving with unsaved changes: save them, and let the browser warn on a reload.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      void flush()
    }
  }, [flush])

  // While a job runs, ask how it is going; when it ends, load what it changed.
  useEffect(() => {
    if (!job?.running) return
    const t = setInterval(async () => {
      try {
        const r = await api.get<{ job: Job | null }>(`/api/authoring/${id}/job`)
        if (r.job?.running) return setJob(r.job)
        const fresh = await api.get<Loaded>(`/api/authoring/${id}`)
        take(fresh, true)
        setJob(r.job)
        setPreviewRev((n) => n + 1)
        if (r.job?.error) toast.error('The job stopped', r.job.error)
        else if (r.job?.kind === 'generate') toast.success(r.job.errors?.length ? 'Done, with problems: see the list' : 'Outputs made')
        else if (r.job?.result?.ok) toast.success('Every solution passes every test')
        else if (r.job?.kind === 'verify') toast.error('Some solutions fail: see the table')
      } catch {
        /* the next tick tries again */
      }
    }, 1500)
    return () => clearInterval(t)
  }, [job?.running, id, take, toast])

  const startJob = async (path: 'verify' | 'generate', body?: unknown) => {
    await flush()
    if (dirty.current) return toast.error('Save the changes first', saveError)
    try {
      const r = await api.post<{ job: Job }>(`/api/authoring/${id}/${path}`, body)
      setJob(r.job)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start')
    }
  }

  if (loadError) return <Failed message={loadError} onRetry={() => (setLoadError(null), setReload((n) => n + 1))} />
  if (!draft || !meta) return <LoadingBlock rows={8} className="py-8" />

  const checked = !!meta.verify?.ok && meta.verify.current
  return (
    <div className="author pb-16">
      <BackButton />
      <header className="author-head">
        <div className="min-w-0">
          <h1 className="ed-title author-title">{draft.title || 'Untitled problem'}</h1>
          <p className="author-sub">
            {meta.status === 'published' ? <Chip tone="success">Published</Chip> : <Chip>Draft</Chip>}
            <span role="status" aria-live="polite" className={cn('author-save', save === 'failed' && 'text-state-error')}>
              {save === 'saving' ? 'Saving…' : save === 'unsaved' ? 'Changes not saved yet' : save === 'failed' ? `Not saved: ${saveError}` : `Saved · ${ago(meta.updatedAt)} by @${meta.updatedBy}`}
            </span>
            {save === 'failed' && (
              <button type="button" className="ai-btn" onClick={() => void flush()}>
                Try again
              </button>
            )}
          </p>
        </div>
      </header>

      <Tabs items={TABS.map((t) => ({ id: t.id, label: t.label, badge: t.id === 'publish' && checked ? '✓' : undefined }))} active={tab} onChange={setTab} className="mb-5" />

      {busy && (
        <p className="author-job" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {job?.kind === 'verify' ? `Checking the solutions: ${job.done} of ${job.total} languages done.` : `Making tests and outputs: ${job?.done ?? 0} of ${job?.total ?? 0}.`} Editing waits until it finishes.
        </p>
      )}

      <fieldset disabled={busy} className="author-body">
        {tab === 'statement' && <StatementTab id={id} draft={draft} update={update} previewRev={previewRev} saving={save !== 'saved'} />}
        {tab === 'tests' && <TestsTab draft={draft} update={update} startJob={startJob} job={job} />}
        {tab === 'checker' && <CheckerTab draft={draft} update={update} />}
        {tab === 'solutions' && <SolutionsTab draft={draft} update={update} verify={meta.verify} />}
        {tab === 'editorial' && <EditorialTab id={id} draft={draft} update={update} />}
        {tab === 'publish' && (
          <PublishTab
            id={id}
            meta={meta}
            draft={draft}
            missing={missing}
            job={job}
            startJob={startJob}
            flush={flush}
            onChanged={(p) => take({ problem: p, missing }, false)}
          />
        )}
      </fieldset>
    </div>
  )
}

/* ── shared bits ── */

type Upd = (patch: Partial<Draft> | ((d: Draft) => Draft)) => void

function Area({ label, hint, value, onChange, rows = 6, mono, id, children }: { label: string; hint?: ReactNode; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean; id: string; children?: ReactNode }) {
  return (
    <div className="ai-field">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        {children}
      </span>
      <textarea id={id} className={cn('author-area', mono && 'font-mono')} rows={rows} value={value} spellCheck={!mono} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && (
        <span id={`${id}-hint`} className="author-hint">
          {hint}
        </span>
      )}
    </div>
  )
}

function Editor({ value, language, onChange, height = '24rem' }: { value: string; language: string; onChange: (v: string) => void; height?: string }) {
  return (
    <div className="author-code" style={{ height }}>
      <Suspense fallback={<LoadingBlock rows={4} className="p-3" />}>
        <CodeEditor value={value} language={language} onChange={onChange} onRunShortcut={() => {}} onSubmitShortcut={() => {}} savedLabel="Saved with the problem" />
      </Suspense>
    </div>
  )
}

/** Upload a picture and give back the Markdown that shows it. */
function useImageUpload(id: string, insert: (md: string) => void) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file: File) => {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post<{ url: string }>(`/api/authoring/${id}/image`, fd, { timeoutMs: 60000 })
      insert(`![${file.name.replace(/\.[a-z]+$/i, '').replace(/[[\]]/g, '')}](${r.url})`)
      toast.success('Picture added')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not upload the picture')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const button = (
    <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.files?.[0] && void pick(e.target.files[0])} />
      <button type="button" className="ai-btn" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />} Add a picture
      </button>
    </>
  )
  return button
}

/* ── Statement ── */

function StatementTab({ id, draft, update, previewRev, saving }: { id: string; draft: Draft; update: Upd; previewRev: number; saving: boolean }) {
  const preview = useApi(() => api.get<Preview>(`/api/authoring/${id}/preview`), [id, previewRev])
  const picture = useImageUpload(id, (md) => update((d) => ({ ...d, statement: `${d.statement.trimEnd()}\n\n${md}\n` })))
  const mathHint = (
    <>
      Markdown: <code>**bold**</code>, <code>`code`</code>, lists. Maths between dollars: <code>$n \le 10^5$</code>.
    </>
  )
  return (
    <div className="author-split">
      <div className="space-y-4">
        <div className="ai-field">
          <label htmlFor="au-title">Title</label>
          <input id="au-title" className="ai-input" value={draft.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} placeholder="Pair sum" />
        </div>
        <Area id="au-statement" label="Statement" rows={10} value={draft.statement} onChange={(v) => update({ statement: v })} hint={mathHint}>
          {picture}
        </Area>
        <Area id="au-input" label="Input" rows={4} value={draft.inputSpec} onChange={(v) => update({ inputSpec: v })} />
        <Area id="au-output" label="Output" rows={3} value={draft.outputSpec} onChange={(v) => update({ outputSpec: v })} />
        <Area id="au-note" label="Note (optional)" rows={3} value={draft.note} onChange={(v) => update({ note: v })} hint="Explain a sample, or anything else worth saying." />
      </div>
      <section aria-label="Preview as a student" className="author-preview">
        <p className="author-preview-label">
          As students see it{saving && <span className="text-text-muted"> · updates after saving</span>}
        </p>
        <div className="author-preview-frame">
          <ProblemPanel
            problem={preview.data?.problem ?? null}
            statement={preview.data?.statement ?? null}
            statementLoading={preview.loading && !preview.data}
            statementError={preview.error}
            submissions={[]}
            onImportSample={() => {}}
            onImportAllSamples={() => {}}
            importedSampleCount={0}
          />
        </div>
      </section>
    </div>
  )
}

/* ── Tests ── */

/** Pair uploaded files: 1.in + 1.out, input1.txt + output1.txt, a.in + a.ans … */
async function pairFiles(files: File[]): Promise<Test[]> {
  const groups = new Map<string, { input?: string; output?: string }>()
  for (const f of files) {
    const name = f.name.toLowerCase()
    const isOut = /\.(out|ans|a|sol)$/.test(name) || /^output/.test(name) || /\.out\.txt$/.test(name)
    const key = name
      .replace(/\.(in|out|ans|a|sol|txt)$/g, '')
      .replace(/\.(in|out)$/, '')
      .replace(/^(input|output)[-_]?/, '')
    const g = groups.get(key) ?? {}
    g[isOut ? 'output' : 'input'] = await f.text()
    groups.set(key, g)
  }
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return keys.filter((k) => groups.get(k)!.input !== undefined).map((k) => ({ input: groups.get(k)!.input!, output: groups.get(k)!.output ?? '', sample: false }))
}

function TestsTab({ draft, update, startJob, job }: { draft: Draft; update: Upd; startJob: (p: 'verify' | 'generate', body?: unknown) => Promise<void>; job: Job | null }) {
  const toast = useToast()
  const files = useRef<HTMLInputElement>(null)
  const [refLang, setRefLang] = useState<L>(() => LANGS.find((l) => draft.solutions[l].trim()) ?? 'cpp')
  const total = useMemo(() => draft.tests.reduce((n, t) => n + bytes(t.input) + bytes(t.output), 0), [draft.tests])
  const noOutput = draft.tests.filter((t) => !t.output.trim()).length
  const samples = draft.tests.filter((t) => t.sample).length
  const setTest = (i: number, patch: Partial<Test>) => update((d) => ({ ...d, tests: d.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    const added = await pairFiles([...list])
    if (!added.length) return toast.error('No input files found', 'Name them like 1.in and 1.out, or input1.txt and output1.txt.')
    update((d) => ({ ...d, tests: [...d.tests, ...added].slice(0, 100) }))
    toast.success(`${added.length} ${added.length === 1 ? 'test' : 'tests'} added`, added.some((t) => !t.output) ? 'Some have no output yet: make them from a solution.' : undefined)
    if (files.current) files.current.value = ''
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Tests"
        description={`${draft.tests.length} ${draft.tests.length === 1 ? 'test' : 'tests'}: ${samples} shown to students as examples, ${draft.tests.length - samples} hidden. ${size(total)} of ${size(TOTAL_TEST_BYTES)}.`}
        actions={
          <>
            <input ref={files} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void upload(e.target.files)} />
            <button type="button" className="ai-btn" onClick={() => files.current?.click()}>
              <Upload className="size-3.5" /> Upload files
            </button>
            <button type="button" className="ai-btn" onClick={() => update((d) => ({ ...d, tests: [...d.tests, { input: '', output: '', sample: d.tests.length === 0 }] }))} disabled={draft.tests.length >= 100}>
              <Plus className="size-3.5" /> Add a test
            </button>
          </>
        }
      >
        {total > TOTAL_TEST_BYTES && (
          <p className="author-warn" role="alert">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" /> The tests are bigger than {size(TOTAL_TEST_BYTES)} in all, so they cannot be saved. Make some smaller or remove some.
          </p>
        )}
        {draft.tests.length === 0 ? (
          <p className="m-0 text-[13px] text-text-secondary">No tests yet. Add one, or upload files named like 1.in and 1.out.</p>
        ) : (
          <ol className="author-tests">
            {draft.tests.map((t, i) => (
              <li key={i} className="author-test">
                <div className="author-test-head">
                  <span className="font-medium text-text-primary">Test {i + 1}</span>
                  <label className="author-check">
                    <input type="checkbox" checked={t.sample} onChange={(e) => setTest(i, { sample: e.target.checked })} /> Shown as an example
                  </label>
                  {!t.output.trim() && <Chip tone="warning">No output yet</Chip>}
                  <button type="button" className="ai-icon ml-auto" aria-label={`Remove test ${i + 1}`} onClick={() => update((d) => ({ ...d, tests: d.tests.filter((_, j) => j !== i) }))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="author-test-io">
                  <label className="ai-field">
                    Input
                    <textarea className="author-area font-mono" rows={Math.min(8, Math.max(2, t.input.split('\n').length))} value={t.input} spellCheck={false} onChange={(e) => setTest(i, { input: e.target.value })} />
                  </label>
                  <label className="ai-field">
                    Output
                    <textarea className="author-area font-mono" rows={Math.min(8, Math.max(2, t.output.split('\n').length))} value={t.output} spellCheck={false} onChange={(e) => setTest(i, { output: e.target.value })} />
                  </label>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Make outputs from a solution" description="Runs your solution on every test that has no output yet and fills it in. Check them after: a wrong solution makes wrong outputs.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="ai-field">
            Solution
            <select className="ai-select" value={refLang} onChange={(e) => setRefLang(e.target.value as L)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAME[l]}
                  {draft.solutions[l].trim() ? '' : ' (not written yet)'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="ai-btn" onClick={() => void startJob('generate', { refLang, makeTests: false })} disabled={!noOutput || !draft.solutions[refLang].trim()}>
            Make {noOutput || 'no'} {noOutput === 1 ? 'output' : 'outputs'}
          </button>
        </div>
        <JobErrors job={job} kind="generate" />
      </Panel>

      <Panel title="Make tests with a program" description="A generator prints one test input. It runs once per test and reads the test number (1, 2, 3 …) on its input, so it can make each test different. The tests it makes are hidden; their outputs come from the solution chosen above.">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="ai-field">
            Language
            <select className="ai-select" value={draft.generator.lang} onChange={(e) => update((d) => ({ ...d, generator: { ...d.generator, lang: e.target.value as L } }))}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAME[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="ai-field">
            How many tests
            <input type="number" min={1} max={30} className="ai-input w-24" value={draft.generator.count} onChange={(e) => update((d) => ({ ...d, generator: { ...d.generator, count: Math.max(1, Math.min(30, Number(e.target.value) || 1)) } }))} />
          </label>
          <button
            type="button"
            className="ai-btn"
            onClick={() => void startJob('generate', { refLang, makeTests: true })}
            disabled={!draft.generator.code.trim() || !draft.solutions[refLang].trim() || draft.tests.length >= 100}
          >
            Make {Math.min(draft.generator.count, 100 - draft.tests.length)} tests
          </button>
        </div>
        <Editor value={draft.generator.code} language={draft.generator.lang} onChange={(code) => update((d) => ({ ...d, generator: { ...d.generator, code } }))} height="16rem" />
      </Panel>
    </div>
  )
}

function JobErrors({ job, kind }: { job: Job | null; kind: Job['kind'] }) {
  if (!job || job.kind !== kind || job.running || !(job.errors?.length || job.error)) return null
  return (
    <div className="author-warn mt-3" role="alert">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="m-0 font-medium">Some did not work:</p>
        <ul className="m-0 mt-1 list-disc pl-4">
          {job.error && <li>{job.error}</li>}
          {job.errors?.slice(0, 10).map((e, i) => (
            <li key={i} className="font-mono text-[12px]">
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ── Limits & checker ── */

function CheckerTab({ draft, update }: { draft: Draft; update: Upd }) {
  const [tags, setTags] = useState(draft.tags.join(', '))
  const c = draft.checker
  const setChecker = (patch: Partial<Draft['checker']>) => update((d) => ({ ...d, checker: { ...d.checker, ...patch } }))
  return (
    <div className="space-y-5">
      <Panel title="Limits and details">
        <div className="author-grid">
          <label className="ai-field">
            Time limit
            <input className="ai-input" value={draft.timeLimit} onChange={(e) => update({ timeLimit: e.target.value })} placeholder="2 s" />
          </label>
          <label className="ai-field">
            Memory limit
            <input className="ai-input" value={draft.memoryLimit} onChange={(e) => update({ memoryLimit: e.target.value })} placeholder="256 MB" />
          </label>
          <label className="ai-field">
            Difficulty (800 to 3500)
            <input type="number" min={0} max={4000} step={100} className="ai-input" value={draft.rating || ''} onChange={(e) => update({ rating: Number(e.target.value) || 0 })} placeholder="1200" />
          </label>
          <label className="ai-field">
            Topics, separated by commas
            <input
              className="ai-input"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value)
                update({ tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12) })
              }}
              placeholder="math, greedy"
            />
          </label>
        </div>
      </Panel>

      <Panel title="How answers are checked">
        <div role="radiogroup" aria-label="How answers are checked" className="author-modes">
          {MODES.map((m) => (
            <label key={m.id} className={cn('author-mode', c.mode === m.id && 'is-on')}>
              <input type="radio" name="checker" value={m.id} checked={c.mode === m.id} onChange={() => setChecker({ mode: m.id })} />
              <span>
                <span className="block font-medium text-text-primary">{m.label}</span>
                <span className="block text-[12.5px] text-text-secondary">{m.help}</span>
              </span>
            </label>
          ))}
        </div>
        {c.mode === 'float' && (
          <label className="ai-field mt-4 max-w-xs">
            Allowed difference
            <input type="number" min={0} max={1} step="any" className="ai-input" value={c.eps} onChange={(e) => setChecker({ eps: Number(e.target.value) || 1e-6 })} />
          </label>
        )}
        {c.mode === 'program' && (
          <div className="mt-4 space-y-3">
            <p className="author-hint m-0">
              Your program reads one line of JSON on its input: <code>{'{"input": …, "expected": …, "output": …}'}</code> (the test, your answer and the student&rsquo;s). It prints <code>OK</code> to accept; anything else is a wrong answer.
            </p>
            <label className="ai-field max-w-xs">
              Language
              <select className="ai-select" value={c.lang} onChange={(e) => setChecker({ lang: e.target.value as 'python' | 'cpp' })}>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
              </select>
            </label>
            <Editor value={c.code} language={c.lang} onChange={(code) => setChecker({ code })} height="18rem" />
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ── Solutions ── */

function SolutionsTab({ draft, update, verify }: { draft: Draft; update: Upd; verify: Verify | null }) {
  const [lang, setLang] = useState<L>('cpp')
  const code = draft.solutions[lang]
  const last = verify?.langs?.[lang]
  return (
    <div className="space-y-3">
      <p className="author-hint m-0">Write the same solution in all five languages. Each one must pass every test before the problem can go live; students see them after they choose to read the solution.</p>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Solution language">
        {LANGS.map((l) => {
          const r = verify?.current ? verify.langs?.[l] : undefined
          return (
            <button key={l} type="button" role="tab" aria-selected={l === lang} className={cn('author-lang', l === lang && 'is-on')} onClick={() => setLang(l)}>
              {LANG_NAME[l]}
              {r?.ok ? <Check className="size-3.5 text-state-success" aria-label="passes" /> : r ? <X className="size-3.5 text-state-error" aria-label="fails" /> : !draft.solutions[l].trim() ? <span className="text-text-muted">· empty</span> : null}
            </button>
          )
        })}
      </div>
      {last && (
        <p className={cn('m-0 text-[13px]', last.ok ? 'text-state-success' : 'text-state-error')}>
          Last check{verify?.current ? '' : ' (before your latest changes)'}: {last.ok ? 'passes' : 'fails'} · {last.detail}
        </p>
      )}
      {!code.trim() && CHEATSHEETS[lang] && (
        <button type="button" className="ai-btn" onClick={() => update((d) => ({ ...d, solutions: { ...d.solutions, [lang]: CHEATSHEETS[lang].template } }))}>
          Start from a template
        </button>
      )}
      <Editor value={code} language={lang} onChange={(v) => update((d) => ({ ...d, solutions: { ...d.solutions, [lang]: v } }))} height="60vh" />
    </div>
  )
}

/* ── Editorial ── */

const EDITORIAL_START = '## Intuition\n\n\n## Approach\n\n\n## Complexity\n\nTime $O(n)$, memory $O(1)$.\n'

function EditorialTab({ id, draft, update }: { id: string; draft: Draft; update: Upd }) {
  const picture = useImageUpload(id, (md) => update((d) => ({ ...d, editorial: `${d.editorial.trimEnd()}\n\n${md}\n` })))
  return (
    <div className="author-split">
      <div className="space-y-3">
        <Area id="au-editorial" label="Editorial" rows={22} value={draft.editorial} onChange={(v) => update({ editorial: v })} hint="Use the headings Intuition, Approach and Complexity. Why it works and Pitfalls are welcome too. Markdown and $maths$.">
          <span className="flex flex-wrap gap-2">
            {!draft.editorial.trim() && (
              <button type="button" className="ai-btn" onClick={() => update({ editorial: EDITORIAL_START })}>
                Start with the headings
              </button>
            )}
            {picture}
          </span>
        </Area>
      </div>
      <section aria-label="Editorial preview" className="author-preview">
        <p className="author-preview-label">As students see it, after &ldquo;Show the solution&rdquo;</p>
        <div className="author-preview-frame learn-prose p-4">{draft.editorial.trim() ? <Markdown md={draft.editorial} /> : <p className="text-text-muted">Nothing written yet.</p>}</div>
      </section>
    </div>
  )
}

/* ── Check & publish ── */

function PublishTab({
  id,
  meta,
  draft,
  missing,
  job,
  startJob,
  flush,
  onChanged,
}: {
  id: string
  meta: Omit<Authored, 'data'>
  draft: Draft
  missing: string[]
  job: Job | null
  startJob: (p: 'verify' | 'generate', body?: unknown) => Promise<void>
  flush: () => Promise<void>
  onChanged: (p: Authored) => void
}) {
  const toast = useToast()
  const navigate = useNavigate()
  const [working, setWorking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const v = meta.verify
  const checked = !!v?.ok && v.current
  const noOutput = draft.tests.filter((t) => !t.output.trim()).length
  const items: { ok: boolean; label: string }[] = [
    { ok: !!draft.title.trim(), label: 'A title' },
    { ok: !missing.includes('a statement'), label: 'A statement' },
    { ok: !missing.includes('at least one sample test'), label: 'At least one test shown as an example' },
    { ok: !missing.includes('at least two tests'), label: 'At least two tests' },
    { ok: draft.tests.length > 0 && noOutput === 0, label: noOutput ? `Every test has an output (${noOutput} missing)` : 'Every test has an output' },
    { ok: checked, label: v && !v.current ? 'All five solutions pass every test (changed since the last check)' : 'All five solutions pass every test' },
  ]
  const ready = items.every((i) => i.ok)

  const act = async (path: 'publish' | 'unpublish') => {
    await flush()
    setWorking(true)
    try {
      const r = await api.post<{ problem: Authored }>(`/api/authoring/${id}/${path}`)
      onChanged(r.problem)
      toast.success(path === 'publish' ? 'Published: students can solve it now' : 'Unpublished: hidden from students')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not do that')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Check all five solutions"
        description="Runs every solution on every test with your checker and time limit."
        actions={
          <button type="button" className="ai-btn" onClick={() => void startJob('verify')} disabled={!draft.tests.length || noOutput > 0}>
            {checked ? 'Check again' : 'Check now'}
          </button>
        }
      >
        {v ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Check results">
            <table className="w-full min-w-[30rem] text-left text-[13px]">
              <caption className="pb-2 text-left text-[12.5px] text-text-muted">
                Checked {ago(v.at)} by @{v.by}
                {!v.current && ' · the tests, checker, solutions or time limit changed since'}
              </caption>
              <thead>
                <tr className="text-[11.5px] text-text-muted">
                  <th scope="col" className="py-1.5 pr-3 font-medium">Language</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Result</th>
                  <th scope="col" className="py-1.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {LANGS.map((l) => {
                  const r = v.langs[l]
                  return (
                    <tr key={l} className="border-t border-[color:var(--nx-hair)]">
                      <th scope="row" className="py-1.5 pr-3 font-medium text-text-primary">{LANG_NAME[l]}</th>
                      <td className="py-1.5 pr-3">{r?.ok ? <Chip tone="success">Passes</Chip> : <Chip tone="warning">{r?.verdict === 'MISSING' ? 'Not written' : 'Fails'}</Chip>}</td>
                      <td className="py-1.5 font-mono text-[12px] text-text-secondary">{r?.detail}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 text-[13px] text-text-secondary">{job?.running ? 'Checking…' : 'Not checked yet.'}</p>
        )}
      </Panel>

      <Panel title={meta.status === 'published' ? 'Live' : 'Publish'} description={meta.status === 'published' ? 'Students can solve it. Changes you make here go live when you publish again.' : 'Publishing adds it to Problems for every student, judged on all your tests. Hidden tests stay hidden.'}>
        <ul className="author-checklist">
          {items.map((i) => (
            <li key={i.label} className={i.ok ? 'is-ok' : undefined}>
              {i.ok ? <Check className="size-4 text-state-success" aria-hidden="true" /> : <X className="size-4 text-text-muted" aria-hidden="true" />}
              <span>
                <span className="sr-only">{i.ok ? 'Done: ' : 'Still needed: '}</span>
                {i.label}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="ai-btn ai-btn--main" onClick={() => void act('publish')} disabled={!ready || working || !!job?.running}>
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {meta.status === 'published' ? 'Publish changes' : 'Publish'}
          </button>
          {meta.status === 'published' && (
            <>
              {meta.problemRowid && (
                <Link to={`/solve/${meta.problemRowid}`} className="ai-btn">
                  Open as students see it
                </Link>
              )}
              <button type="button" className="ai-btn" onClick={() => void act('unpublish')} disabled={working}>
                Unpublish
              </button>
            </>
          )}
          {meta.status === 'draft' && (
            <button type="button" className="ai-btn ml-auto" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Delete draft
            </button>
          )}
        </div>
      </Panel>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this draft?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await api.delete(`/api/authoring/${id}`)
            toast.success('Draft deleted')
            navigate('/admin?section=authored')
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Could not delete')
          }
        }}
      >
        The statement, tests and solutions are deleted for good.
      </Confirm>
    </div>
  )
}
