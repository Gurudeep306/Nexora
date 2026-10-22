/*
  GATE home — the command centre. Everything a student needs to decide what
  to do next, at a glance:

    hero      greeting · countdown · streak · today's goal · primary actions
    kpis      attempted · accuracy · review due · papers
    left      today's plan · 365-day activity · subject mastery rings
    right     continue · weak topics · quick start · recent tests

  Works with zero data: every panel has a calm empty state with a next step.
*/
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, Skeleton } from '@/components/ui'
import { Icon, IconBadge, type IconName, type IconTone } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { GATE_ROUTES, type GateSummary } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { useGateDaily, useGateSummary, useGateTests, useQuestionsByIds, useReviewDue } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { ActivityHeatmap } from '@/gate/insights/ActivityHeatmap'
import { EmptyHint, Kpi, LinkButton, MasteryLabel, Panel, PanelLink, Ring } from '@/gate/insights/ui'
import { dayKey, daysUntil, fmtPct, fmtTime, greeting, masteryOf, masteryScore, pct, timeAgo } from '@/gate/insights/format'
import { generatePlan, type PlanTask } from '@/gate/insights/planner'
import { usePlanInputs, useStudyPlan } from '@/gate/insights/planInputs'
import { shortSubject, useSubjects } from '@/gate/insights/subjects'
import { QuestionRow } from '@/gate/insights/QuestionRow'
import { OutcomeDot, TestLine } from '@/gate/insights/TestLine'
import { GateSubjectsPanel } from '@/components/nexus/SubjectsHub'

const QUESTIONS_PER_HOUR = 6

export default function GateHomePage() {
  const [exam] = useGateExam()
  const summary = useGateSummary()
  const s = summary.data
  const loading = summary.loading && !s

  return (
    <GateShell
      title="Command centre"
      subtitle="Your plan, progress and next best step — in one place."
      actions={
        <>
          <LinkButton to={GATE_ROUTES.analytics} icon="chart" variant="ghost">
            Analytics
          </LinkButton>
          <LinkButton to={GATE_ROUTES.planner} icon="calendar">
            Planner
          </LinkButton>
        </>
      }
    >
      <div className="space-y-5">
        <Hero summary={s} loading={loading} />
        <KpiRow summary={s} loading={loading} />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <TodayPlan summary={s} />
            <Panel title="Activity" icon="activity" subtitle="Questions attempted per day over the last year">
              {loading ? <Skeleton className="h-28 w-full rounded-lg" /> : <ActivityHeatmap activity={s?.activity ?? {}} />}
            </Panel>
            <SubjectRings summary={s} loading={loading} />
            <Panel title="Subjects" icon="map" subtitle={`Every GATE ${exam} subject as a skill tree: lessons, notes and PYQs in one place`} action={<PanelLink to="/learn">All subjects</PanelLink>}>
              <GateSubjectsPanel exam={exam} />
            </Panel>
          </div>
          <div className="min-w-0 space-y-5">
            <ContinuePanel summary={s} loading={loading} />
            <WeakTopics summary={s} loading={loading} />
            <QuickStart />
            <RecentTests />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {summary.error ? `Personal progress is unavailable right now. Showing ${exam} defaults.` : ''}
        </p>
      </div>
    </GateShell>
  )
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const { user } = useAuth()
  const { plan } = useStudyPlan()
  const review = useReviewDue()
  const daily = useGateDaily()
  const days = daysUntil(plan?.examDate ?? null)
  const goal = Math.max(5, Math.round((plan?.hoursPerDay ?? 2) * QUESTIONS_PER_HOUR))
  const today = summary?.activity?.[dayKey()] ?? 0
  const goalPct = Math.min(1, today / goal)
  const streak = summary?.streak
  const dueN = review.data ?? summary?.totals.reviewDue ?? 0
  const name = user?.username ?? 'there'

  return (
    <Card className="relative overflow-hidden p-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-brand/10 blur-3xl"
      />
      <div className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-[13px] text-text-muted">{greeting()},</p>
          <h2 className="mt-0.5 truncate font-display text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            {name}
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-text-secondary">
            {days != null && days >= 0 ? (
              <>
                <span className="font-semibold text-text-primary">{days} days</span> until GATE.{' '}
                {today >= goal ? "Today's goal is done — bank a few more or review." : `Solve ${goal - today} more to hit today's goal.`}
              </>
            ) : (
              <>
                Set your exam date in the{' '}
                <Link to={GATE_ROUTES.planner} className="font-medium text-accent-brand hover:underline">
                  planner
                </Link>{' '}
                for a countdown and a week-by-week plan.
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton to={dueN > 0 ? GATE_ROUTES.review : practiceLink()} variant="primary" icon={dueN > 0 ? 'brain' : 'play'}>
              {dueN > 0 ? `Review ${dueN} due` : 'Start practising'}
            </LinkButton>
            <LinkButton to={daily.data?.questionId ? GATE_ROUTES.daily : GATE_ROUTES.daily} icon="sunrise">
              {daily.data?.solvedToday ? 'Daily solved ✓' : 'Daily challenge'}
            </LinkButton>
            <LinkButton to={testLink({ preset: 'random', count: 10, durationMin: 20 })} icon="timer" variant="ghost">
              10-question sprint
            </LinkButton>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Ring value={goalPct} size={92} stroke={8} label={`Today's goal: ${today} of ${goal} questions`}>
            <div className="text-center leading-none">
              {loading ? (
                <Skeleton className="mx-auto h-5 w-8" />
              ) : (
                <p className="font-display text-[20px] font-semibold text-text-primary tabular-nums">{today}</p>
              )}
              <p className="mt-1 text-[10.5px] text-text-muted">of {goal} today</p>
            </div>
          </Ring>
          <div className="space-y-3">
            <Stat icon="flame" tone="streak" label="Streak" value={loading ? '…' : `${streak?.current ?? 0}d`} hint={`Best ${streak?.best ?? 0}d`} />
            <Stat
              icon="timer"
              tone="accent"
              label="Countdown"
              value={days != null && days >= 0 ? `${days}d` : '—'}
              hint={plan?.examDate ? new Date(`${plan.examDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

function Stat({ icon, tone, label, value, hint }: { icon: IconName; tone: IconTone; label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <IconBadge name={icon} tone={tone} box="sm" />
      <div className="leading-tight">
        <p className="text-[11px] tracking-wide text-text-muted uppercase">{label}</p>
        <p className="font-display text-[17px] font-semibold text-text-primary tabular-nums">
          {value} <span className="text-[11.5px] font-normal text-text-muted">{hint}</span>
        </p>
      </div>
    </div>
  )
}

/* ── KPIs ───────────────────────────────────────────────────────────────── */

function KpiRow({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const t = summary?.totals
  const review = useReviewDue()
  const coverage = t && t.questionsInBank ? Math.round((t.attempted / t.questionsInBank) * 100) : 0
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        label="Attempted"
        icon="target"
        loading={loading}
        value={(t?.attempted ?? 0).toLocaleString()}
        sub={t?.questionsInBank ? `${coverage}% of ${t.questionsInBank.toLocaleString()} PYQs` : 'Across the PYQ bank'}
      />
      <Kpi
        label="Accuracy"
        icon="check-circle"
        tone="success"
        loading={loading}
        value={fmtPct(t?.accuracy, t?.attempted ?? 0)}
        sub={t?.avgTimeMs ? `${fmtTime(t.avgTimeMs)} per question` : 'First-attempt correctness'}
      />
      <Kpi
        label="Review due"
        icon="brain"
        tone="info"
        loading={loading && review.loading}
        value={review.data ?? t?.reviewDue ?? 0}
        sub={<Link to={GATE_ROUTES.review} className="hover:text-accent-brand">Spaced repetition →</Link>}
      />
      <Kpi
        label="Papers done"
        icon="award"
        tone="gold"
        loading={loading}
        value={t?.papersCompleted ?? 0}
        sub={`${t?.bookmarks ?? 0} bookmarks · ${t?.notes ?? 0} notes`}
      />
    </div>
  )
}

/* ── Today's plan ───────────────────────────────────────────────────────── */

function taskLabel(t: PlanTask) {
  if (t.kind === 'mock') return 'Full-length mock test'
  if (t.kind === 'revise') return t.topicName ? `Revise ${t.topicName}` : 'Revise mistakes & bookmarks'
  return t.topicName ?? t.subjectName ?? 'Practice'
}

function taskLink(t: PlanTask) {
  if (t.kind === 'mock') return GATE_ROUTES.cbt
  if (t.kind === 'revise' && !t.topic) return testLink({ focus: 'mistakes', count: 15, durationMin: 30 })
  return practiceLink({ subject: t.subject, topic: t.topic })
}

function TodayPlan({ summary }: { summary: GateSummary | null }) {
  const [exam] = useGateExam()
  const { plan } = useStudyPlan()
  const inputs = usePlanInputs(exam)

  const today = useMemo(() => {
    if (!plan || !inputs.subjects.length) return null
    const g = generatePlan({
      plan,
      subjects: inputs.subjects,
      weight: inputs.weight,
      topicCount: inputs.topicCount,
      bySubject: summary?.bySubject ?? [],
      byTopic: summary?.byTopic ?? [],
    })
    const key = dayKey()
    return g.days.find((d) => d.date >= key) ?? null
  }, [plan, inputs, summary])

  return (
    <Panel
      title="Today's plan"
      icon="list"
      subtitle={today && today.date !== dayKey() ? `Next study day: ${new Date(`${today.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}` : 'Generated from your study plan'}
      action={<PanelLink to={GATE_ROUTES.planner}>Full plan</PanelLink>}
    >
      {!plan ? (
        <EmptyHint
          icon="calendar"
          title="No study plan yet"
          action={<LinkButton to={GATE_ROUTES.planner} variant="primary" icon="sparkles">Build my plan</LinkButton>}
        >
          Tell us your exam date and hours — we&rsquo;ll split the syllabus by weightage and your weak spots.
        </EmptyHint>
      ) : !today ? (
        <p className="text-[13px] text-text-muted">Nothing scheduled — enjoy the break or add study days in the planner.</p>
      ) : (
        <ol className="divide-y divide-border">
          {today.tasks.map((t, i) => (
            <li key={i}>
              <Link
                to={taskLink(t)}
                className="group flex items-center gap-3 rounded-md py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    t.kind === 'mock' ? 'bg-gold/15 text-gold' : t.kind === 'revise' ? 'bg-info/15 text-info' : 'bg-accent-brand/12 text-accent-brand',
                  )}
                >
                  <Icon name={t.kind === 'mock' ? 'monitor' : t.kind === 'revise' ? 'refresh' : 'book'} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-text-primary group-hover:text-accent-brand">{taskLabel(t)}</span>
                  <span className="block truncate text-[12px] text-text-muted">
                    {t.kind === 'learn' ? t.subjectName : t.kind === 'mock' ? '65 questions · 3 hours' : t.subjectName ?? 'Spaced review'}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[12px] text-text-muted tabular-nums">
                  <span className="block font-semibold text-text-primary">{t.hours}h</span>
                  {t.kind !== 'mock' && <span>{t.questions} Qs</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

/* ── Subject mastery rings ──────────────────────────────────────────────── */

function SubjectRings({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const stats = new Map((summary?.bySubject ?? []).map((x) => [x.subject, x]))
  const list = subjects.list.filter((x) => !x.legacy)

  return (
    <Panel
      title="Subject mastery"
      icon="layers"
      subtitle="Accuracy weighted by how much you've practised"
      action={<PanelLink to={GATE_ROUTES.syllabus}>Syllabus</PanelLink>}
    >
      {loading || (subjects.meta.loading && !list.length) ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyHint icon="layers" title="Syllabus unavailable">The subject list couldn&rsquo;t be loaded. Try again shortly.</EmptyHint>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((sub) => {
            const st = stats.get(sub.id)
            const att = st?.attempted ?? 0
            const level = masteryOf(att, st?.accuracy)
            return (
              <li key={sub.id}>
                <Link
                  to={practiceLink({ exam, subject: sub.id })}
                  className="flex h-full items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:border-accent-brand/40 hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
                >
                  <Ring value={masteryScore(att, st?.accuracy)} size={46} stroke={5} label={`${sub.name}: ${att ? `${pct(st?.accuracy)}% over ${att}` : 'not started'}`}>
                    <span className="text-[11px] font-semibold text-text-primary tabular-nums">{att ? pct(st?.accuracy) : '–'}</span>
                  </Ring>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-text-primary" title={sub.name}>
                      {shortSubject(sub.name)}
                    </span>
                    <span className="mt-0.5 block">
                      <MasteryLabel level={level} />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ── Continue where you left off ────────────────────────────────────────── */

function ContinuePanel({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const recent = useMemo(() => {
    const seen = new Set<string>()
    return (summary?.recent ?? []).filter((r) => (seen.has(r.questionId) ? false : (seen.add(r.questionId), true))).slice(0, 4)
  }, [summary])
  const ids = useMemo(() => recent.map((r) => r.questionId), [recent])
  const qs = useQuestionsByIds(ids)
  const last = recent[0]

  return (
    <Panel title="Continue" icon="play" subtitle="Pick up where you left off">
      {loading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : !last ? (
        <EmptyHint icon="rocket" title="Your first question awaits" action={<LinkButton to={practiceLink({ exam })} variant="primary" icon="play">Open the PYQ bank</LinkButton>}>
          Every attempt feeds your analytics, mastery and review queue.
        </EmptyHint>
      ) : (
        <>
          <ul className="-my-1 divide-y divide-border">
            {recent.map((r) => (
              <QuestionRow
                key={r.questionId}
                id={r.questionId}
                q={qs.data?.[r.questionId]}
                loading={qs.loading}
                subjectName={subjects.subjectName}
                meta={
                  <span className="flex items-center gap-1.5">
                    <OutcomeDot outcome={r.outcome} />
                    {r.outcome} · {timeAgo(r.at)}
                  </span>
                }
              />
            ))}
          </ul>
          {qs.data?.[last.questionId] && (
            <LinkButton
              className="mt-2 w-full"
              to={practiceLink({ exam, subject: qs.data[last.questionId]!.subject, topic: qs.data[last.questionId]!.topic })}
              icon="play"
            >
              More from this topic
            </LinkButton>
          )}
        </>
      )}
    </Panel>
  )
}

/* ── Weak topics ────────────────────────────────────────────────────────── */

function WeakTopics({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const weak = (summary?.weakTopics ?? []).slice(0, 5)
  return (
    <Panel
      title="Weak topics"
      icon="target"
      subtitle="Lowest accuracy (3+ attempts)"
      action={weak.length ? <PanelLink to={testLink({ focus: 'weak', count: 15, durationMin: 30 })}>Weak-topic test</PanelLink> : undefined}
    >
      {loading ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : !weak.length ? (
        <p className="text-[13px] text-text-muted">Attempt a few questions per topic and your weakest areas will surface here — with one-tap drills.</p>
      ) : (
        <ul className="space-y-2.5">
          {weak.map((t) => {
            const a = pct(t.accuracy)
            return (
              <li key={`${t.subject}/${t.topic}`}>
                <Link
                  to={practiceLink({ exam, subject: t.subject, topic: t.topic })}
                  className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
                >
                  <span className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-text-primary group-hover:text-accent-brand">{subjects.topicName(t.subject, t.topic)}</span>
                    <span className="shrink-0 text-[12px] text-text-muted tabular-nums">
                      {t.correct}/{t.attempted} · <span className="font-semibold text-state-error">{a}%</span>
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
                    <span className="block h-full rounded-full bg-state-error/70" style={{ width: `${Math.max(4, a)}%` }} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-text-muted">{subjects.subjectName(t.subject)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ── Quick start ────────────────────────────────────────────────────────── */

function QuickStart() {
  const [exam] = useGateExam()
  const tiles: { to: string; icon: IconName; tone: IconTone; title: string; hint: string }[] = [
    { to: testLink({ preset: 'random', exam, count: 10, durationMin: 20 }), icon: 'random', tone: 'accent', title: 'Random 10', hint: '20 min sprint' },
    { to: testLink({ preset: 'sectional', exam }), icon: 'layers', tone: 'info', title: 'Sectional', hint: 'One subject' },
    { to: GATE_ROUTES.cbt, icon: 'monitor', tone: 'gold', title: 'Full mock', hint: 'Real CBT, 3h' },
    { to: testLink({ focus: 'unseen', exam, count: 20, durationMin: 45 }), icon: 'eye', tone: 'success', title: 'Unseen only', hint: 'Fresh PYQs' },
    { to: testLink({ focus: 'mistakes', exam, count: 15, durationMin: 30 }), icon: 'refresh', tone: 'danger', title: 'Mistakes', hint: 'Fix the misses' },
    { to: GATE_ROUTES.leaderboard, icon: 'trophy', tone: 'streak', title: 'Leaderboard', hint: "This week's top" },
  ]
  return (
    <Panel title="Quick start" icon="bolt">
      <ul className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <li key={t.title}>
            <Link
              to={t.to}
              className="flex h-full items-center gap-2.5 rounded-xl border border-border p-2.5 transition-colors hover:border-accent-brand/40 hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
            >
              <IconBadge name={t.icon} tone={t.tone} box="xs" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-text-primary">{t.title}</span>
                <span className="block truncate text-[11.5px] text-text-muted">{t.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ── Recent tests ───────────────────────────────────────────────────────── */

function RecentTests() {
  const tests = useGateTests()
  const list = [...(tests.data ?? [])].sort((a, b) => (b.submittedAt ?? b.createdAt) - (a.submittedAt ?? a.createdAt)).slice(0, 4)
  return (
    <Panel title="Recent tests" icon="timer" action={<PanelLink to={GATE_ROUTES.tests}>All tests</PanelLink>}>
      {tests.loading && !tests.data ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : !list.length ? (
        <EmptyHint icon="timer" title="No tests yet" action={<LinkButton to={GATE_ROUTES.tests} icon="add">Create a test</LinkButton>}>
          Timed tests with GATE marking show your percentile against everyone who took the same set.
        </EmptyHint>
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {list.map((t) => (
            <li key={t.id}>
              <TestLine t={t} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
