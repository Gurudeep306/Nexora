import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { Card, EmptyState } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon/Icon'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES, type GateTest, type TestConfig } from '@/gate/api'
import { GateCustomSelect } from '@/gate/GateCustomSelect'
import { PRESETS, createTest, listTests } from '@/gate/tests/testsData'
import { fmtDuration } from '@/gate/useQuestionTimer'
import { paperLabel, type GateMeta } from '@/gate/types'

/*
 * Tests: presets (Testbook-style) and a builder for any slice of the bank —
 * exam, subjects/topics, years or papers, types, difficulty, focus, length,
 * time and marking — plus your history.
 */

type Focus = NonNullable<TestConfig['focus']>
const FOCUS: Array<{ id: Focus; label: string; hint: string }> = [
  { id: 'any', label: 'Any', hint: 'Everything that matches' },
  { id: 'unseen', label: 'Unseen', hint: 'Prefer questions you haven’t tried' },
  { id: 'mistakes', label: 'Mistakes', hint: 'Only ones you got wrong' },
  { id: 'weak', label: 'Weak topics', hint: 'Your lowest-accuracy topics' },
]
const DIFF: Array<{ id: string; label: string; range?: [number, number] }> = [
  { id: 'any', label: 'Any' },
  { id: 'easy', label: 'Easy', range: [1, 2] },
  { id: 'medium', label: 'Medium', range: [3, 3] },
  { id: 'hard', label: 'Hard', range: [4, 5] },
]
const TYPES = ['MCQ', 'MSQ', 'NAT']
const ERAS: Array<[string, number, number]> = [
  ['2021–26', 2021, 2026],
  ['2014–20', 2014, 2020],
  ['2005–13', 2005, 2013],
  ['Before 2005', 1991, 2004],
]

const split = (v: string | null) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const paceFor = (count: number) => Math.max(5, Math.round((count * 180) / 65 / 5) * 5)

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ id: T; label: string; hint?: string }>; label: string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-bg-surface p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn('h-8 flex-1 rounded-[10px] px-2.5 text-[12.5px] whitespace-nowrap transition-colors', value === o.id ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] transition-colors',
        on ? 'border-text-primary bg-bg-surface-3 font-semibold text-text-primary' : 'border-border bg-bg-surface text-text-secondary hover:border-border-hover hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-baseline justify-between text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">
        <span>{label}</span>
        {hint && <span className="font-normal tracking-normal normal-case">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

export default function GateTestsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })
  const history = useApi(listTests, [], { cacheKey: 'gate:tests:history' })
  const builderRef = useRef<HTMLDivElement>(null)

  /* ── Builder state (prefilled from the URL) ── */
  const [exam, setExam] = useState<'CSE' | 'DA'>(params.get('exam') === 'DA' ? 'DA' : 'CSE')
  const [subjects, setSubjects] = useState<string[]>(split(params.get('subject')))
  const [topics, setTopics] = useState<string[]>(split(params.get('topic')).map((t) => (t.includes('/') ? t : `${split(params.get('subject'))[0] ?? ''}/${t}`)))
  const [years, setYears] = useState<number[]>(split(params.get('year')).map(Number).filter(Boolean))
  const [paper, setPaper] = useState(params.get('paper') ?? '')
  const [types, setTypes] = useState<string[]>(split(params.get('type')))
  const [diff, setDiff] = useState(params.get('difficulty') ?? 'any')
  const [focus, setFocus] = useState<Focus>((FOCUS.find((f) => f.id === params.get('focus'))?.id ?? 'any') as Focus)
  const initialCount = Number(params.get('count')) || (focus === 'mistakes' ? 20 : 20)
  const [count, setCount] = useState(Math.min(65, Math.max(5, initialCount)))
  const [duration, setDuration] = useState(Number(params.get('duration')) || paceFor(initialCount))
  const [autoTime, setAutoTime] = useState(!params.get('duration'))
  const [negative, setNegative] = useState(params.get('negative') !== '0')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('focus') || params.get('subject')) builderRef.current?.scrollIntoView({ block: 'start' })
  }, [params])

  const subjectOptions = useMemo(() => {
    const s = meta.data?.subjects?.[exam] ?? {}
    return Object.entries(s)
      .filter(([id]) => id !== 'legacy')
      .map(([id, v]) => ({ id, name: v.name, topics: v.topics }))
  }, [meta.data, exam])
  const topicOptions = useMemo(
    () => subjectOptions.filter((s) => subjects.includes(s.id)).flatMap((s) => Object.entries(s.topics).map(([k, label]) => ({ key: `${s.id}/${k}`, label, subject: s.name }))),
    [subjectOptions, subjects],
  )
  const allYears = useMemo(() => [...new Set((meta.data?.papers ?? []).filter((p) => p.exam === exam).map((p) => p.year))].sort((a, b) => b - a), [meta.data, exam])
  const paperOptions = useMemo(
    () => [{ value: '', label: 'Any paper' }, ...(meta.data?.papers ?? []).filter((p) => p.exam === exam).sort((a, b) => b.year - a.year || (a.set ?? 0) - (b.set ?? 0)).map((p) => ({ value: p.id, label: paperLabel(p).replace('GATE ', ''), group: String(p.year) }))],
    [meta.data, exam],
  )

  const setCountAndTime = (n: number) => {
    setCount(n)
    if (autoTime) setDuration(paceFor(n))
  }

  const config = (): TestConfig => ({
    title: title.trim() || (focus === 'mistakes' ? 'Mistakes retry' : subjects.length === 1 ? `${subjectOptions.find((s) => s.id === subjects[0])?.name ?? subjects[0]} test` : 'Custom test'),
    exam,
    subjects: subjects.length ? subjects : undefined,
    topics: topics.length ? topics : undefined,
    years: years.length ? years : undefined,
    papers: paper ? [paper] : undefined,
    types: types.length ? types : undefined,
    difficulty: DIFF.find((d) => d.id === diff)?.range,
    focus,
    count,
    durationMin: duration,
    negativeMarking: negative,
  })

  const start = async (c: TestConfig, key: string) => {
    setBusy(key)
    setError(null)
    try {
      const t = await createTest(c)
      navigate(GATE_ROUTES.test(t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the test.')
      setBusy(null)
    }
  }

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const tests = history.data ?? []
  const pending = tests.filter((t) => !t.result)
  const done = tests.filter((t) => t.result)

  return (
    <GateShell
      title="Tests"
      subtitle="Timed tests from past papers, in the real exam console — with a full analysis after."
      actions={
        <Link to={GATE_ROUTES.cbt} aria-label="Official papers" className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 !text-[13px]">
          <Icon name="trophy" className="size-4" /> <span className="hidden sm:inline">Official papers</span>
        </Link>
      }
    >
      <div className="space-y-8 pb-24">
        {/* ── Presets ── */}
        <section aria-labelledby="presets-h" className="space-y-3">
          <h2 id="presets-h" className="text-[13px] font-semibold tracking-wide text-text-muted uppercase">
            Start in one click
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRESETS.map((p) => (
              <Card
                key={p.id}
                interactive
                role="button"
                tabIndex={0}
                aria-busy={busy === p.id}
                onClick={() => {
                  if (busy) return
                  if (p.id === 'sectional') {
                    setCountAndTime(20)
                    setDuration(45)
                    setAutoTime(false)
                    setFocus('any')
                    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    return
                  }
                  void start(p.config, p.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    ;(e.currentTarget as HTMLElement).click()
                  }
                }}
                className="flex min-h-[104px] flex-col gap-2 !p-3.5 sm:!p-4"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-xl shadow-[inset_0_0_0_1px_var(--color-border-strong)] text-text-secondary">
                    <Icon name={p.icon as IconName} className="size-[18px]" />
                  </span>
                  {busy === p.id ? <span className="size-4 animate-spin rounded-full border-2 border-accent-brand border-t-transparent" /> : <ChevronRight className="size-4 text-text-muted" />}
                </span>
                <span className="text-[14px] font-semibold text-text-primary">{p.title}</span>
                <span className="text-[12px] leading-snug text-text-muted">{p.id === 'sectional' ? 'Pick a subject below · 20 Q · 45 min' : p.blurb}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Builder ── */}
        <section ref={builderRef} aria-labelledby="builder-h" className="scroll-mt-24">
          <Card className="space-y-6 !p-4 sm:!p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="builder-h" className="font-display text-lg font-semibold text-text-primary">
                Build your own
              </h2>
              <Seg
                label="Exam"
                value={exam}
                onChange={(v) => {
                  setExam(v)
                  setSubjects([])
                  setTopics([])
                  setPaper('')
                }}
                options={[
                  { id: 'CSE', label: 'GATE CSE' },
                  { id: 'DA', label: 'GATE DA' },
                ]}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <Field label="Subjects" hint={subjects.length ? `${subjects.length} selected` : 'All'}>
                  <div className="flex flex-wrap gap-1.5">
                    {!meta.data
                      ? [0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="h-8 w-24 animate-pulse rounded-lg bg-bg-surface-2" />)
                      : subjectOptions.map((s) => (
                          <Chip
                            key={s.id}
                            on={subjects.includes(s.id)}
                            onClick={() => {
                              const next = toggleIn(subjects, s.id)
                              setSubjects(next)
                              setTopics((t) => t.filter((k) => next.includes(k.split('/')[0])))
                            }}
                          >
                            {s.name}
                          </Chip>
                        ))}
                  </div>
                </Field>
                {topicOptions.length > 0 && (
                  <Field label="Topics" hint={topics.length ? `${topics.length} selected` : 'All in these subjects'}>
                    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                      {topicOptions.map((t) => (
                        <Chip key={t.key} on={topics.includes(t.key)} onClick={() => setTopics(toggleIn(topics, t.key))} title={t.subject}>
                          {t.label}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                )}
                <Field label="Years" hint={years.length ? `${years.length} selected` : 'All'}>
                  <div className="flex flex-wrap gap-1.5">
                    {ERAS.map(([label, a, b]) => {
                      const ys = allYears.filter((y) => y >= a && y <= b)
                      const on = ys.length > 0 && ys.every((y) => years.includes(y)) && years.length === ys.length
                      return (
                        <Chip key={label} on={on} onClick={() => setYears(on ? [] : ys)}>
                          {label}
                        </Chip>
                      )
                    })}
                  </div>
                  <GateCustomSelect className="w-full sm:max-w-xs" value={paper} onChange={setPaper} options={paperOptions} placeholder="Any paper" searchable />
                </Field>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Question types" hint={types.length ? undefined : 'All'}>
                    <div className="flex gap-1.5">
                      {TYPES.map((t) => (
                        <Chip key={t} on={types.includes(t)} onClick={() => setTypes(toggleIn(types, t))}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Difficulty">
                    <Seg label="Difficulty" value={diff} onChange={setDiff} options={DIFF} />
                  </Field>
                </div>
                <Field label="Focus">
                  <Seg label="Focus" value={focus} onChange={setFocus} options={FOCUS} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Questions" hint={<span className="font-mono text-[13px] font-semibold text-text-primary tabular-nums">{count}</span>}>
                    <input type="range" min={5} max={65} step={5} value={count} onChange={(e) => setCountAndTime(Number(e.target.value))} className="w-full accent-[var(--color-accent-brand)]" aria-label="Number of questions" />
                  </Field>
                  <Field label="Time" hint={<span className="font-mono text-[13px] font-semibold text-text-primary tabular-nums">{duration} min</span>}>
                    <input
                      type="range"
                      min={5}
                      max={180}
                      step={5}
                      value={duration}
                      onChange={(e) => {
                        setAutoTime(false)
                        setDuration(Number(e.target.value))
                      }}
                      className="w-full accent-[var(--color-accent-brand)]"
                      aria-label="Duration in minutes"
                    />
                  </Field>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-surface-2/50 px-3 py-2.5 text-[13px]">
                  <span>
                    <span className="font-medium text-text-primary">Negative marking</span>
                    <span className="block text-[12px] text-text-muted">−1/3 of the marks on a wrong MCQ, as in GATE</span>
                  </span>
                  <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} className="size-4 accent-[var(--color-accent-brand)]" />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Test name</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                  placeholder="Name (optional)"
                  className="h-10 w-full rounded-xl border border-border-input bg-bg-field px-3 text-[14px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent-brand"
                />
              </label>
              <span className="text-[12.5px] text-text-muted sm:text-right">
                {count} questions · {duration} min{negative ? ' · −⅓ on wrong MCQs' : ''}
              </span>
              <button type="button" onClick={() => void start(config(), 'builder')} disabled={!!busy} className="btn-primary inline-flex items-center justify-center gap-2 !px-5 !py-2.5 disabled:opacity-60">
                {busy === 'builder' ? <span className="size-4 animate-spin rounded-full border-2 border-on-accent-brand border-t-transparent" /> : <Icon name="play" className="size-4" />}
                Start test
              </button>
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-state-error px-3 py-2 text-[13px] text-text-primary">
                {error}
              </p>
            )}
          </Card>
        </section>

        {/* ── History ── */}
        <section aria-labelledby="history-h" className="space-y-3">
          <h2 id="history-h" className="text-[13px] font-semibold tracking-wide text-text-muted uppercase">
            Your tests
          </h2>
          {history.loading && !history.data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-surface-2" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <Card>
              <EmptyState icon="timer" title="No tests yet" description="Start a preset or build one above. Every test gets a full report: score, accuracy, time per question and a subject breakdown." />
            </Card>
          ) : (
            <Card className="divide-y divide-border !p-0">
              {[...pending, ...done].map((t) => (
                <HistoryRow key={t.id} t={t} />
              ))}
            </Card>
          )}
        </section>
      </div>
    </GateShell>
  )
}

function HistoryRow({ t }: { t: GateTest }) {
  const r = t.result
  const acc = r && r.correct + r.wrong ? r.correct / (r.correct + r.wrong) : null
  const pct = r && r.maxScore ? Math.max(0, r.score / r.maxScore) : 0
  return (
    <Link to={GATE_ROUTES.test(t.id)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-surface-2/60">
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-[12px] font-semibold tabular-nums', r ? 'shadow-[inset_0_0_0_1px_var(--color-border-strong)] text-text-primary' : 'shadow-[inset_0_0_0_1px_currentColor] text-state-warning')}
        aria-hidden="true"
      >
        {r ? `${Math.round(pct * 100)}%` : <Icon name="play" className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-text-primary">{t.title}</span>
        <span className="block truncate text-[12px] text-text-muted">
          {new Date(t.submittedAt ?? t.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {t.questionIds.length} Q · {t.config.durationMin} min
          {r ? ` · ${fmtDuration(r.timeMs)} used` : ' · not submitted'}
        </span>
      </span>
      {r ? (
        <span className="text-right">
          <span className="block font-mono text-[14px] font-semibold text-text-primary tabular-nums">
            {r.score}/{r.maxScore}
          </span>
          <span className="block text-[11.5px] text-text-muted">{acc == null ? '—' : `${Math.round(acc * 100)}% accuracy`}</span>
        </span>
      ) : (
        <span className="text-[12.5px] font-semibold text-text-primary underline underline-offset-2">Resume</span>
      )}
      <ChevronRight className="size-4 shrink-0 text-text-muted" />
    </Link>
  )
}
