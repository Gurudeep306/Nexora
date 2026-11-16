/*
  GATE analytics — where the marks are won and lost.

    range filter (7d · 30d · 90d · 1y · all) for time-based views
    KPIs · activity & accuracy trend · subject/topic sortable table
    marks gained vs lost · by question type · by year · time vs accuracy
    strongest / weakest topics · test score history

  Aggregates by subject/topic/type/year are all-time (labelled as such);
  the trend, KPIs over the range and the test history follow the filter.
*/
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Select, Skeleton } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { GATE_ROUTES, type GateSummary, type GateTest, type SubjectStat, type TopicStat } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { useGateSummary, useGateTests } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { MarksDiverging, ScoreHistory, TimeAccuracyScatter, TrendCharts, YearBars, type TrendPoint } from '@/gate/insights/LazyCharts'
import { EmptyHint, Kpi, LinkButton, MasteryLabel, Panel, PanelLink, Segmented } from '@/gate/insights/ui'
import { addDays, dayKey, fmtMarks, fmtPct, fmtTime, masteryOf, parseDay, pct } from '@/gate/insights/format'
import { shortSubject, useSubjects } from '@/gate/insights/subjects'
import { TestLine } from '@/gate/insights/TestLine'

type Range = '7' | '30' | '90' | '365' | 'all'
const RANGES: { id: Range; label: string }[] = [
  { id: '7', label: '7d' },
  { id: '30', label: '30d' },
  { id: '90', label: '90d' },
  { id: '365', label: '1y' },
  { id: 'all', label: 'All' },
]

function rangeStart(r: Range, activity: Record<string, number>): Date {
  const today = parseDay(dayKey())
  if (r !== 'all') return addDays(today, -(Number(r) - 1))
  const first = Object.keys(activity).filter((k) => activity[k]! > 0).sort()[0]
  return first ? parseDay(first) : addDays(today, -29)
}

/* Bucket activity (counts) and graded outcomes (recent attempts + test items) over the range. */
function buildTrend(s: GateSummary | null, tests: GateTest[], range: Range): TrendPoint[] {
  const activity = s?.activity ?? {}
  const start = rangeStart(range, activity)
  const today = parseDay(dayKey())
  const spanDays = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  const unit: 'day' | 'week' | 'month' = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month'
  const keyOf = (d: Date) =>
    unit === 'day' ? dayKey(d) : unit === 'week' ? dayKey(addDays(d, -((d.getDay() + 6) % 7))) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = (k: string) => {
    if (unit === 'month') return new Date(`${k}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    return parseDay(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }

  const buckets = new Map<string, { attempts: number; graded: number; correct: number }>()
  for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
    const k = keyOf(d)
    const b = buckets.get(k) ?? { attempts: 0, graded: 0, correct: 0 }
    b.attempts += activity[dayKey(d)] ?? 0
    buckets.set(k, b)
  }
  const grade = (at: number, outcome: string) => {
    const d = new Date(at)
    if (d < start) return
    const b = buckets.get(keyOf(d))
    if (!b || outcome === 'skipped' || outcome === 'revealed') return
    b.graded++
    if (outcome === 'correct') b.correct++
  }
  for (const r of s?.recent ?? []) grade(r.at, r.outcome)
  for (const t of tests) if (t.submittedAt && t.result) for (const it of t.result.items) grade(t.submittedAt, it.outcome)

  return [...buckets.entries()].map(([k, b]) => ({
    label: label(k),
    attempts: b.attempts,
    accuracy: b.graded ? Math.round((b.correct / b.graded) * 100) : null,
  }))
}

export default function GateAnalyticsPage() {
  const [exam] = useGateExam()
  const summary = useGateSummary()
  const testsQ = useGateTests()
  const [range, setRange] = useState<Range>('30')
  const s = summary.data
  const loading = summary.loading && !s
  const subjects = useSubjects(exam)

  const tests = useMemo(() => testsQ.data ?? [], [testsQ.data])
  const trend = useMemo(() => buildTrend(s, tests, range), [s, tests, range])
  const inRange = useMemo(() => {
    const start = rangeStart(range, s?.activity ?? {}).getTime()
    const attempts = trend.reduce((a, p) => a + p.attempts, 0)
    const activeDays = Object.entries(s?.activity ?? {}).filter(([k, n]) => n > 0 && parseDay(k).getTime() >= start).length
    const done = tests.filter((t) => t.submittedAt && t.submittedAt >= start && t.result)
    return { attempts, activeDays, tests: done }
  }, [trend, s, tests, range])

  const net = (s?.bySubject ?? []).reduce((a, x) => a + x.marksGained - Math.abs(x.marksLost), 0)
  const lost = (s?.bySubject ?? []).reduce((a, x) => a + Math.abs(x.marksLost), 0)
  const hasData = !!s && s.totals.attempted > 0

  return (
    <GateShell
      title="Analytics"
      subtitle="Accuracy, speed and marks — by subject, topic, type and year."
      actions={<Segmented label="Date range" value={range} onChange={setRange} options={RANGES} />}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Attempts" icon="target" loading={loading} value={inRange.attempts.toLocaleString()} sub={`${inRange.activeDays} active days in range`} />
          <Kpi
            label="Accuracy"
            icon="check-circle"
            tone="success"
            loading={loading}
            value={fmtPct(s?.totals.accuracy, s?.totals.attempted ?? 0)}
            sub={`${(s?.totals.correct ?? 0).toLocaleString()} correct · all-time`}
          />
          <Kpi label="Avg time" icon="clock" tone="info" loading={loading} value={fmtTime(s?.totals.avgTimeMs)} sub="Per question · GATE pace ≈ 2m 46s" />
          <Kpi
            label="Net marks"
            icon="coins"
            tone={net >= 0 ? 'gold' : 'danger'}
            loading={loading}
            value={hasData ? fmtMarks(net) : '—'}
            sub={hasData ? `${lost.toFixed(1)} lost to negatives` : 'GATE marking, all-time'}
          />
        </div>

        {!loading && !hasData && (
          <Card className="p-5">
            <EmptyHint
              icon="chart"
              title="Your analytics start with one question"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <LinkButton to={practiceLink({ exam })} variant="primary" icon="play">Practise PYQs</LinkButton>
                  <LinkButton to={testLink({ preset: 'random', count: 10, durationMin: 20 })} icon="timer">10-question test</LinkButton>
                </div>
              }
            >
              Every attempt is graded with GATE marking and broken down by subject, topic, type and year. Charts appear as soon as you start.
            </EmptyHint>
          </Card>
        )}

        <Panel title="Activity & accuracy" icon="trending-up" subtitle="Attempts per period, and accuracy on graded attempts">
          {loading ? <Skeleton className="h-[300px] w-full rounded-lg" /> : <TrendCharts data={trend} />}
        </Panel>

        <BreakdownTable summary={s} loading={loading} subjectName={subjects.subjectName} topicName={subjects.topicName} />

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Marks gained vs lost" icon="coins" subtitle="Per subject · negative marking shown in red">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : !s?.bySubject.length ? (
              <NoData />
            ) : (
              <MarksDiverging
                data={[...s.bySubject]
                  .sort((a, b) => b.marksGained - Math.abs(b.marksLost) - (a.marksGained - Math.abs(a.marksLost)))
                  .map((x) => ({ name: shortSubject(subjects.subjectName(x.subject)), gained: x.marksGained, lost: x.marksLost }))}
              />
            )}
          </Panel>
          <Panel title="Time vs accuracy" icon="clock" subtitle="Each dot is a topic · size = attempts · lines at 50% and your average">
            {loading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : !s?.byTopic.length ? (
              <NoData />
            ) : (
              <>
                <TimeAccuracyScatter
                  avgTime={Math.round((s.totals.avgTimeMs || 0) / 1000)}
                  data={s.byTopic.map((t) => ({
                    name: subjects.topicName(t.subject, t.topic),
                    subject: subjects.subjectName(t.subject),
                    time: Math.round(t.avgTimeMs / 1000),
                    accuracy: pct(t.accuracy),
                    attempted: t.attempted,
                  }))}
                />
                <p className="mt-2 text-[12px] text-text-muted">
                  Bottom-right = slow <em>and</em> inaccurate: concept gaps. Top-right = accurate but slow: drill for speed.
                </p>
              </>
            )}
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="By question type" icon="type" subtitle="All-time">
            {loading ? <Skeleton className="h-40 w-full rounded-lg" /> : !s?.byType.length ? <NoData /> : <TypeBreakdown rows={s.byType} />}
          </Panel>
          <Panel title="By GATE year" icon="calendar" subtitle="Accuracy on each year's paper · all-time">
            {loading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : !s?.byYear.length ? (
              <NoData />
            ) : (
              <YearBars data={[...s.byYear].sort((a, b) => a.year - b.year).map((y) => ({ ...y, accuracy: pct(y.accuracy) }))} />
            )}
          </Panel>
        </div>

        <StrongWeak summary={s} loading={loading} subjectName={subjects.subjectName} topicName={subjects.topicName} />

        <Panel
          title="Test history"
          icon="timer"
          subtitle={`${inRange.tests.length} submitted in range`}
          action={<PanelLink to={GATE_ROUTES.tests}>All tests</PanelLink>}
        >
          {testsQ.loading && !testsQ.data ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : !inRange.tests.length ? (
            <EmptyHint icon="timer" title="No tests in this range" action={<LinkButton to={GATE_ROUTES.tests} icon="add">Take a test</LinkButton>} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
              <ScoreHistory
                data={[...inRange.tests]
                  .sort((a, b) => a.submittedAt! - b.submittedAt!)
                  .map((t) => ({
                    label: new Date(t.submittedAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                    title: t.title,
                    score: t.result!.score,
                    max: t.result!.maxScore,
                    pct: t.result!.maxScore ? Math.round((t.result!.score / t.result!.maxScore) * 100) : 0,
                  }))}
              />
              <ul className="-my-1 max-h-64 divide-y divide-border overflow-y-auto pr-1">
                {[...inRange.tests]
                  .sort((a, b) => b.submittedAt! - a.submittedAt!)
                  .map((t) => (
                    <li key={t.id}>
                      <TestLine t={t} />
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </GateShell>
  )
}

function NoData() {
  return <p className="py-8 text-center text-[13px] text-text-muted">No attempts yet.</p>
}

/* ── Sortable subject / topic table ─────────────────────────────────────── */

type Row = (SubjectStat | TopicStat) & { name: string; parent?: string; net: number }
type SortKey = 'name' | 'attempted' | 'accuracy' | 'avgTimeMs' | 'net'

function BreakdownTable({
  summary,
  loading,
  subjectName,
  topicName,
}: {
  summary: GateSummary | null
  loading: boolean
  subjectName: (id: string) => string
  topicName: (s: string, t: string) => string
}) {
  const [exam] = useGateExam()
  const [level, setLevel] = useState<'subject' | 'topic'>('subject')
  const [subject, setSubject] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'attempted', dir: -1 })

  const rows: Row[] = useMemo(() => {
    const src: Row[] =
      level === 'subject'
        ? (summary?.bySubject ?? []).map((x) => ({ ...x, name: subjectName(x.subject), net: x.marksGained - Math.abs(x.marksLost) }))
        : (summary?.byTopic ?? [])
            .filter((t) => subject === 'all' || t.subject === subject)
            .map((x) => ({ ...x, name: topicName(x.subject, x.topic), parent: subjectName(x.subject), net: x.marksGained - Math.abs(x.marksLost) }))
    const val = (r: Row) => (sort.key === 'name' ? r.name : sort.key === 'accuracy' ? pct(r.accuracy) : r[sort.key])
    return src.sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * sort.dir
    })
  }, [summary, level, subject, sort, subjectName, topicName])

  const subjectsWithTopics = useMemo(() => [...new Set((summary?.byTopic ?? []).map((t) => t.subject))], [summary])

  const head = (key: SortKey, label: string, className?: string) => {
    const on = sort.key === key
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={cn('px-2 py-2 font-medium', className)}>
        <button
          type="button"
          onClick={() => setSort({ key, dir: on ? ((-sort.dir) as 1 | -1) : key === 'name' ? 1 : -1 })}
          className={cn('inline-flex cursor-pointer items-center gap-1 rounded hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary', on && 'text-text-primary')}
        >
          {label}
          <Icon name="sort" className={cn('size-3', on ? 'opacity-100' : 'opacity-40')} />
        </button>
      </th>
    )
  }

  return (
    <Panel
      title="Breakdown"
      icon="list"
      subtitle="All-time · click a column to sort · rows open filtered practice"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {level === 'topic' && (
            <Select value={subject} onValueChange={setSubject} aria-label="Filter topics by subject" className="h-8 w-40">
              <option value="all">All subjects</option>
              {subjectsWithTopics.map((id) => (
                <option key={id} value={id}>
                  {shortSubject(subjectName(id))}
                </option>
              ))}
            </Select>
          )}
          <Segmented
            label="Breakdown level"
            value={level}
            onChange={setLevel}
            options={[
              { id: 'subject', label: 'Subjects' },
              { id: 'topic', label: 'Topics' },
            ]}
          />
        </div>
      }
    >
      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : !rows.length ? (
        <NoData />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-border text-[11.5px] tracking-wide text-text-muted uppercase">
              <tr>
                {head('name', level === 'subject' ? 'Subject' : 'Topic', 'pl-4 sm:pl-5')}
                {head('attempted', 'Attempted', 'text-right')}
                {head('accuracy', 'Accuracy')}
                {head('avgTimeMs', 'Avg time', 'text-right')}
                {head('net', 'Net marks', 'text-right')}
                <th scope="col" className="px-2 py-2 pr-4 font-medium sm:pr-5">
                  Mastery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const a = pct(r.accuracy)
                const topic = 'topic' in r ? r.topic : undefined
                return (
                  <tr key={`${r.subject}/${topic ?? ''}`} className="transition-colors hover:bg-bg-surface-2">
                    <td className="max-w-[260px] py-2 pr-2 pl-4 sm:pl-5">
                      <Link
                        to={practiceLink({ exam, subject: r.subject, topic })}
                        className="block truncate font-medium text-text-primary hover:underline hover:underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                      >
                        {r.name}
                      </Link>
                      {r.parent && <span className="block truncate text-[11.5px] text-text-muted">{r.parent}</span>}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.attempted}
                      <span className="text-text-muted"> · {r.correct}✓</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-surface-3" aria-hidden="true">
                          <span
                            className={cn('block h-full rounded-full', a >= 70 ? 'bg-state-success' : a >= 45 ? 'bg-accent-brand' : 'bg-state-error/80')}
                            style={{ width: `${a}%` }}
                          />
                        </span>
                        <span className="w-9 text-right tabular-nums">{a}%</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-text-secondary tabular-nums">{fmtTime(r.avgTimeMs)}</td>
                    <td className={cn('px-2 py-2 text-right font-medium tabular-nums', r.net >= 0 ? 'text-state-success' : 'text-state-error')}>{fmtMarks(r.net)}</td>
                    <td className="px-2 py-2 pr-4 sm:pr-5">
                      <MasteryLabel level={masteryOf(r.attempted, r.accuracy)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/* ── By type ────────────────────────────────────────────────────────────── */

const TYPE_HINT: Record<string, string> = {
  MCQ: 'Single correct · −⅓ / −⅔ for wrong',
  MSQ: 'Multiple correct · no negative',
  NAT: 'Numerical answer · no negative',
}

function TypeBreakdown({ rows }: { rows: GateSummary['byType'] }) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-3">
      {rows.map((t) => {
        const a = pct(t.accuracy)
        return (
          <li key={t.type} className="rounded-xl border border-border p-3">
            <p className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-text-primary">{t.type}</span>
              <span className="text-[11.5px] text-text-muted tabular-nums">{t.attempted} Qs</span>
            </p>
            <p className="mt-1 font-display text-[24px] leading-none font-semibold text-text-primary tabular-nums">{t.attempted ? `${a}%` : '—'}</p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-bg-surface-3" aria-hidden="true">
              <span className="block h-full rounded-full bg-accent-brand" style={{ width: `${a}%` }} />
            </span>
            <p className="mt-2 text-[11.5px] text-text-muted">
              {fmtTime(t.avgTimeMs)} avg · {TYPE_HINT[t.type] ?? 'Question type'}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/* ── Strongest / weakest ────────────────────────────────────────────────── */

function StrongWeak({
  summary,
  loading,
  subjectName,
  topicName,
}: {
  summary: GateSummary | null
  loading: boolean
  subjectName: (id: string) => string
  topicName: (s: string, t: string) => string
}) {
  const [exam] = useGateExam()
  const eligible = (summary?.byTopic ?? []).filter((t) => t.attempted >= 3)
  const sorted = [...eligible].sort((a, b) => pct(b.accuracy) - pct(a.accuracy) || b.attempted - a.attempted)
  const strong = sorted.slice(0, 5)
  const weak = sorted.slice(-5).reverse().filter((t) => !strong.includes(t))

  const list = (rows: TopicStat[], good: boolean) =>
    !rows.length ? (
      <p className="text-[13px] text-text-muted">Needs topics with 3+ attempts.</p>
    ) : (
      <ol className="space-y-2">
        {rows.map((t, i) => (
          <li key={`${t.subject}/${t.topic}`}>
            <Link
              to={practiceLink({ exam, subject: t.subject, topic: t.topic })}
              className="group flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <span className="w-4 text-[12px] text-text-muted tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-text-primary group-hover:underline group-hover:underline-offset-2">{topicName(t.subject, t.topic)}</span>
                <span className="block truncate text-[11.5px] text-text-muted">{subjectName(t.subject)}</span>
              </span>
              <span className={cn('text-[13px] font-semibold tabular-nums', good ? 'text-state-success' : 'text-state-error')}>{pct(t.accuracy)}%</span>
            </Link>
          </li>
        ))}
      </ol>
    )

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Panel title="Strongest topics" icon="trophy" subtitle="Highest accuracy, 3+ attempts">
        {loading ? <Skeleton className="h-36 w-full rounded-lg" /> : list(strong, true)}
      </Panel>
      <Panel
        title="Weakest topics"
        icon="target"
        subtitle="Where the next marks are"
        action={weak.length ? <PanelLink to={testLink({ focus: 'weak', count: 15, durationMin: 30 })}>Drill weak topics</PanelLink> : undefined}
      >
        {loading ? <Skeleton className="h-36 w-full rounded-lg" /> : list(weak, false)}
      </Panel>
    </div>
  )
}
