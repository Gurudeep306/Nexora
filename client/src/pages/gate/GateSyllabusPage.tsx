/*
  GATE syllabus — the map of the exam.

    coverage KPIs · mastery legend · search + filter
    subjects (weightage, PYQ count, mastery bar) → topics (PYQs, accuracy, mastery, practise)
    weightage over the years (per subject) · most-asked topics
*/
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, SearchInput, Select, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { useGateSummary } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { WeightLine } from '@/gate/insights/LazyCharts'
import { EmptyHint, Kpi, LinkButton, MasteryBar, MasteryLabel, MasteryLegend, Panel, Segmented } from '@/gate/insights/ui'
import { masteryOf, pct, type MasteryLevel } from '@/gate/insights/format'
import { avgMarks, usePlanInputs } from '@/gate/insights/planInputs'
import { shortSubject } from '@/gate/insights/subjects'

type Filter = 'all' | 'todo' | 'weak' | 'mastered'

export default function GateSyllabusPage() {
  const [exam] = useGateExam()
  const summary = useGateSummary()
  const inputs = usePlanInputs(exam)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const tStat = useMemo(() => new Map((summary.data?.byTopic ?? []).map((t) => [`${t.subject}/${t.topic}`, t])), [summary.data])
  const sStat = useMemo(() => new Map((summary.data?.bySubject ?? []).map((t) => [t.subject, t])), [summary.data])
  const marks = useMemo(() => inputs.trends.data?.marksBySubjectYear ?? {}, [inputs.trends.data])

  const subjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inputs.subjects
      .map((s) => {
        const topics = s.topics.map((t) => {
          const st = tStat.get(`${s.id}/${t.id}`)
          return {
            ...t,
            pyqs: inputs.topicCount[`${s.id}/${t.id}`] ?? 0,
            attempted: st?.attempted ?? 0,
            accuracy: st?.accuracy,
            level: masteryOf(st?.attempted ?? 0, st?.accuracy),
          }
        })
        const counts = [0, 0, 0, 0, 0]
        for (const t of topics) counts[t.level]!++
        const nameHit = !q || s.name.toLowerCase().includes(q)
        const shown = topics
          .filter((t) => nameHit || t.name.toLowerCase().includes(q))
          .filter((t) =>
            filter === 'all'
              ? true
              : filter === 'todo'
                ? t.level === 0
                : filter === 'mastered'
                  ? t.level >= 3
                  : t.attempted >= 3 && pct(t.accuracy) < 50,
          )
          .sort((a, b) => b.pyqs - a.pyqs)
        return {
          ...s,
          topics,
          shown,
          counts,
          pyqs: inputs.counts.data?.subject?.[s.id] ?? topics.reduce((a, t) => a + t.pyqs, 0),
          avg: avgMarks(marks[s.id]),
          stat: sStat.get(s.id),
        }
      })
      .filter((s) => s.shown.length > 0 || (!q && filter === 'all'))
      .sort((a, b) => b.avg - a.avg || b.pyqs - a.pyqs)
  }, [inputs, tStat, sStat, marks, query, filter])

  const allTopics = inputs.subjects.flatMap((s) => s.topics.map((t) => ({ s, t, st: tStat.get(`${s.id}/${t.id}`) })))
  const covered = allTopics.filter((x) => (x.st?.attempted ?? 0) > 0).length
  const mastered = allTopics.filter((x) => masteryOf(x.st?.attempted ?? 0, x.st?.accuracy) >= 3).length
  const totalPyqs = inputs.counts.data?.total ?? 0
  const searching = query.trim().length > 0 || filter !== 'all'

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <GateShell
      title="Syllabus"
      subtitle="Every subject and topic, how often GATE asks it, and how well you know it."
      actions={<LinkButton to={testLink({ focus: 'unseen', exam, count: 20, durationMin: 45 })} icon="eye">Unseen PYQ test</LinkButton>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Subjects" icon="layers" loading={inputs.loading} value={inputs.subjects.length} sub={`${allTopics.length} topics`} />
          <Kpi label="PYQs in bank" icon="database" tone="info" loading={inputs.counts.loading && !inputs.counts.data} value={totalPyqs.toLocaleString()} sub={`GATE ${exam}`} />
          <Kpi
            label="Coverage"
            icon="map"
            tone="success"
            loading={inputs.loading}
            value={allTopics.length ? `${Math.round((covered / allTopics.length) * 100)}%` : '—'}
            sub={`${covered} of ${allTopics.length} topics started`}
          />
          <Kpi label="Proficient+" icon="award" tone="gold" loading={inputs.loading} value={mastered} sub="Topics at ≥ 70% over 5+ attempts" />
        </div>

        <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              placeholder="Search subjects or topics"
              aria-label="Search syllabus"
              containerClassName="sm:w-64"
            />
            <Segmented
              label="Filter topics"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All' },
                { id: 'todo', label: 'Not started' },
                { id: 'weak', label: 'Weak' },
                { id: 'mastered', label: 'Strong' },
              ]}
              className="self-start"
            />
          </div>
          <MasteryLegend />
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section aria-label="Subjects" className="min-w-0 space-y-2.5">
            {inputs.loading ? (
              Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl" />)
            ) : !subjects.length ? (
              <Card className="p-5">
                <EmptyHint icon="search" title={inputs.subjects.length ? 'No topics match' : 'Syllabus unavailable'}>
                  {inputs.subjects.length ? 'Try another search or filter.' : 'The subject list could not be loaded. Try again shortly.'}
                </EmptyHint>
              </Card>
            ) : (
              subjects.map((s) => {
                const isOpen = searching || open.has(s.id)
                const att = s.stat?.attempted ?? 0
                return (
                  <Card key={s.id} className="overflow-hidden p-0">
                    <h2>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`syl-${s.id}`}
                        onClick={() => toggle(s.id)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-inset sm:px-5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[14.5px] font-semibold text-text-primary">{s.name}</span>
                            <span className="text-[12px] text-text-muted tabular-nums">
                              {s.topics.length} topics · {s.pyqs} PYQs
                              {s.avg > 0 && <> · ~{s.avg.toFixed(1)} marks/paper</>}
                            </span>
                          </span>
                          <MasteryBar counts={s.counts} className="mt-2 max-w-md" />
                        </span>
                        <span className="hidden shrink-0 text-right sm:block">
                          <span className="block text-[13px] font-semibold text-text-primary tabular-nums">{att ? `${pct(s.stat?.accuracy)}%` : '—'}</span>
                          <span className="block text-[11.5px] text-text-muted tabular-nums">{att} attempted</span>
                        </span>
                        <span aria-hidden="true" className={cn('inline-block text-[18px] leading-none text-text-muted transition-transform', isOpen && 'rotate-90')}>
                          ›
                        </span>
                      </button>
                    </h2>
                    {isOpen && (
                      <div id={`syl-${s.id}`} className="border-t border-border">
                        <ul className="divide-y divide-border">
                          {s.shown.map((t) => (
                            <li key={t.id}>
                              <Link
                                to={practiceLink({ exam, subject: s.id, topic: t.id })}
                                className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-inset sm:grid-cols-[1fr_70px_90px_120px_auto] sm:px-5"
                              >
                                <span className="min-w-0 truncate text-[13.5px] text-text-primary group-hover:underline group-hover:underline-offset-2">{t.name}</span>
                                <span className="text-right text-[12px] text-text-muted tabular-nums sm:text-left">
                                  {t.pyqs} <span className="sm:hidden">PYQs</span>
                                  <span className="hidden sm:inline">PYQs</span>
                                </span>
                                <span className="text-[12px] text-text-secondary tabular-nums">
                                  {t.attempted ? `${pct(t.accuracy)}% · ${t.attempted}` : <span className="text-text-muted">—</span>}
                                </span>
                                <span className="col-span-1">
                                  <MasteryLabel level={t.level as MasteryLevel} />
                                </span>
                                <span className="hidden text-[12px] font-medium text-text-primary underline underline-offset-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline">
                                  Practise →
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">
                          <LinkButton to={practiceLink({ exam, subject: s.id })} icon="play" variant="primary">
                            Practise {shortSubject(s.name)}
                          </LinkButton>
                          <LinkButton to={testLink({ preset: 'sectional', exam, subject: s.id, count: 15, durationMin: 40 })} icon="timer">
                            Sectional test
                          </LinkButton>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </section>

          <aside className="min-w-0 space-y-5">
            <WeightageTrends inputs={inputs} />
            <MostAsked inputs={inputs} />
          </aside>
        </div>
      </div>
    </GateShell>
  )
}

/* ── Weightage over the years ───────────────────────────────────────────── */

function WeightageTrends({ inputs }: { inputs: ReturnType<typeof usePlanInputs> }) {
  const data = inputs.trends.data
  const ranked = useMemo(
    () =>
      inputs.subjects
        .map((s) => ({ id: s.id, name: s.name, avg: avgMarks(data?.marksBySubjectYear?.[s.id]) }))
        .filter((x) => x.avg > 0)
        .sort((a, b) => b.avg - a.avg),
    [inputs.subjects, data],
  )
  const [pick, setPick] = useState<string>('')
  const sel = pick || ranked[0]?.id || ''
  const series = Object.entries(data?.marksBySubjectYear?.[sel] ?? {})
    .map(([y, m]) => ({ year: Number(y), marks: m }))
    .sort((a, b) => a.year - b.year)
  const max = ranked[0]?.avg ?? 1

  return (
    <Panel title="Weightage" icon="trending-up" subtitle="Average marks per paper (last 5 years)">
      {inputs.trends.loading && !data ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : !ranked.length ? (
        <EmptyHint icon="chart" title="Trends unavailable">Year-wise weightage appears once the trends service is live.</EmptyHint>
      ) : (
        <>
          <ul className="space-y-1.5">
            {ranked.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setPick(r.id)}
                  aria-pressed={r.id === sel}
                  className={cn(
                    'grid w-full cursor-pointer grid-cols-[110px_1fr_36px] items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12px] transition-colors hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                    r.id === sel && 'bg-bg-surface-2',
                  )}
                >
                  <span className={cn('truncate', r.id === sel ? 'font-semibold text-text-primary' : 'text-text-secondary')}>{shortSubject(r.name)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-bg-surface-3">
                    <span className={cn('block h-full rounded-full', r.id === sel ? 'bg-accent-brand' : 'bg-accent-brand/45')} style={{ width: `${(r.avg / max) * 100}%` }} />
                  </span>
                  <span className="text-right text-text-muted tabular-nums">{r.avg.toFixed(1)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-text-primary">Marks by year</p>
              <Select value={sel} onValueChange={setPick} aria-label="Subject for year-wise marks" className="h-8 w-44">
                {ranked.map((r) => (
                  <option key={r.id} value={r.id}>
                    {shortSubject(r.name)}
                  </option>
                ))}
              </Select>
            </div>
            <WeightLine data={series} name={shortSubject(ranked.find((r) => r.id === sel)?.name ?? '')} />
          </div>
        </>
      )}
    </Panel>
  )
}

/* ── Most-asked topics ──────────────────────────────────────────────────── */

function MostAsked({ inputs }: { inputs: ReturnType<typeof usePlanInputs> }) {
  const [exam] = useGateExam()
  const [scope, setScope] = useState<'top' | 'all'>('top')
  const rows = useMemo(() => {
    const out: { sid: string; tid: string; n: number }[] = []
    for (const s of inputs.subjects) for (const t of s.topics) out.push({ sid: s.id, tid: t.id, n: inputs.topicCount[`${s.id}/${t.id}`] ?? 0 })
    return out.filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
  }, [inputs])
  const shown = scope === 'top' ? rows.slice(0, 12) : rows
  const max = rows[0]?.n ?? 1

  return (
    <Panel
      title="Most-asked topics"
      icon="flame"
      subtitle="By number of PYQs across all years"
      action={<Segmented label="Topics shown" value={scope} onChange={setScope} options={[{ id: 'top', label: 'Top 12' }, { id: 'all', label: 'All' }]} />}
    >
      {inputs.counts.loading && !rows.length ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : !rows.length ? (
        <p className="text-[13px] text-text-muted">Topic counts are unavailable right now.</p>
      ) : (
        <ol className={cn('space-y-1.5', scope === 'all' && 'max-h-[420px] overflow-y-auto pr-1')}>
          {shown.map((r, i) => (
            <li key={`${r.sid}/${r.tid}`}>
              <Link
                to={practiceLink({ exam, subject: r.sid, topic: r.tid })}
                className="group grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
              >
                <span className="text-[11.5px] text-text-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] text-text-primary group-hover:underline group-hover:underline-offset-2">{inputs.topicName(r.sid, r.tid)}</span>
                  <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-bg-surface-3">
                    <span className="block h-full rounded-full bg-gold/70" style={{ width: `${(r.n / max) * 100}%` }} />
                  </span>
                </span>
                <span className="text-[12px] font-medium text-text-secondary tabular-nums">{r.n}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
