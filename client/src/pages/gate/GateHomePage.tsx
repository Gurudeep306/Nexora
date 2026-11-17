/*
  GATE home — "The Exam Hall": your exam desk.

    the desk      countdown in serif numerals · streak · today's goal
                  and, on a manilla spread, today's plan with the one clay
                  action (start practising, or review what is due)
    figures       attempted (with 30 days of real activity) · accuracy ·
                  review due · papers
    left          subject mastery as small multiples · the year of activity
                  · every subject's skill tree, notes and PYQs
    right         weak topics as sentences · continue · quick start · tests

  Works with zero data: every part has a calm empty state with a next step.
  Nothing is invented: a figure without data says so.
*/
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingBlock } from '@/components/ui/EmptyState'
import { Icon, type IconName, type IconTone } from '@/components/icon/Icon'
import { GATE_ROUTES, type GateSummary } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import '@/gate/insights/gate-home.css'
import { useGateDaily, useGateSummary, useGateTests, useQuestionsByIds, useReviewDue } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { ActivityHeatmap } from '@/gate/insights/ActivityHeatmap'
import { EmptyHint, Kpi, LinkButton, Panel, PanelLink } from '@/gate/insights/ui'
import { MASTERY, dayKey, daysUntil, fmtPct, fmtTime, greeting, masteryOf, masteryScore, pct, timeAgo } from '@/gate/insights/format'
import { generatePlan, type PlanTask } from '@/gate/insights/planner'
import { usePlanInputs, useStudyPlan } from '@/gate/insights/planInputs'
import { useSubjects } from '@/gate/insights/subjects'
import { QuestionRow } from '@/gate/insights/QuestionRow'
import { OutcomeDot, TestLine } from '@/gate/insights/TestLine'
import { useNexusWeb } from '@/components/nexus/SubjectsHub'
import { subjectHref } from '@/components/nexus/course'
import { Discover } from '@/components/today/Discover'
import { discoverPool } from '@/lib/discover'

const QUESTIONS_PER_HOUR = 6

export default function GateHomePage() {
  const [exam] = useGateExam()
  const summary = useGateSummary()
  const s = summary.data
  const loading = summary.loading && !s

  return (
    <GateShell title="Your exam desk" cta={false} bare>
      <div className="gh">
        <ExamDesk summary={s} loading={loading} />
        <KpiRow summary={s} loading={loading} />

        {/* The syllabus: every subject once, with your mastery and where to go. */}
        <SyllabusLedger summary={s} loading={loading} />

        <div className="gh-cols">
          <div className="min-w-0">
            <Panel title="Activity" icon="activity" subtitle="Questions attempted per day over the last year">
              {loading ? <LoadingBlock rows={3} /> : <ActivityHeatmap activity={s?.activity ?? {}} />}
            </Panel>
          </div>
          <div className="min-w-0">
            <QuickStart />
          </div>
        </div>

        <div className="gh-trio">
          <WeakTopics summary={s} loading={loading} />
          <ContinuePanel summary={s} loading={loading} />
          <RecentTests />
        </div>
        <p className="sr-only" aria-live="polite">
          {summary.error ? `Personal progress is unavailable right now. Showing ${exam} defaults.` : ''}
        </p>
      </div>
    </GateShell>
  )
}

/* ── The desk: countdown and today's plan ──────────────────────────────── */

function ExamDesk({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const [exam] = useGateExam()
  const { user } = useAuth()
  const { plan } = useStudyPlan()
  const review = useReviewDue()
  const daily = useGateDaily()
  const days = daysUntil(plan?.examDate ?? null)
  const goal = Math.max(5, Math.round((plan?.hoursPerDay ?? 2) * QUESTIONS_PER_HOUR))
  const today = summary?.activity?.[dayKey()] ?? 0
  const streak = summary?.streak
  const dueN = review.data ?? summary?.totals.reviewDue ?? 0
  const examDay = plan?.examDate ? new Date(`${plan.examDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <section className="gh-desk" aria-label="Your exam desk">
      {/* Countdown in serif numerals, with the streak and today's goal beneath. */}
      <div className="gh-count">
        <p className="ed-label">
          The Exam Hall · GATE {exam} · {greeting()}, {user?.username ?? 'there'}
        </p>
        {days != null && days >= 0 ? (
          <>
            <h1 className="gh-days">
              <span className="gh-days-n">{days}</span>
              <span className="gh-days-w">{days === 1 ? 'day' : 'days'} until GATE {exam}</span>
            </h1>
            <p className="gh-date">{examDay}</p>
          </>
        ) : (
          <>
            <h1 className="gh-days">
              <span className="gh-days-w gh-days-none">Your exam desk</span>
            </h1>
            <p className="gh-date">
              <Link to={GATE_ROUTES.planner} className="gp-link text-text-primary">
                Set your exam date
              </Link>{' '}
              for a countdown and a week-by-week plan.
            </p>
          </>
        )}
        <dl className="gh-readings">
          <div>
            <dt>Today</dt>
            <dd>
              {loading ? '…' : today} <span>of {goal} questions</span>
            </dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>
              {loading ? '…' : streak?.current ?? 0} <span>{(streak?.current ?? 0) === 1 ? 'day' : 'days'} · best {streak?.best ?? 0}</span>
            </dd>
          </div>
        </dl>
        <div className="gh-goal" role="meter" aria-label="Today's goal" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(today, goal)}>
          <span style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} />
        </div>
      </div>

      {/* Today's plan on the page's one manilla spread, with its one clay action. */}
      <div className="gh-plan ed-feature">
        <TodayPlan summary={summary} />
        <div className="gh-plan-actions">
          <LinkButton to={dueN > 0 ? GATE_ROUTES.review : practiceLink({ exam })} variant="primary" icon={dueN > 0 ? 'brain' : 'play'}>
            {dueN > 0 ? `Review ${dueN} due` : 'Start practising'}
          </LinkButton>
          <LinkButton to={GATE_ROUTES.daily} icon="sunrise">
            {daily.data?.solvedToday ? 'Daily solved ✓' : 'Daily challenge'}
          </LinkButton>
          <LinkButton to={testLink({ preset: 'random', count: 10, durationMin: 20 })} icon="timer" variant="ghost">
            10-question sprint
          </LinkButton>
        </div>
      </div>
    </section>
  )
}

/* ── KPIs ───────────────────────────────────────────────────────────────── */

function KpiRow({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const t = summary?.totals
  const review = useReviewDue()
  const coverage = t && t.questionsInBank ? Math.round((t.attempted / t.questionsInBank) * 100) : 0
  // Questions attempted on each of the last 30 days, from the real activity log.
  const [now] = useState(() => Date.now())
  const last30 = useMemo(() => Array.from({ length: 30 }, (_, i) => summary?.activity?.[dayKey(now - (29 - i) * 86_400_000)] ?? 0), [summary, now])
  return (
    <div className="gh-figures" role="group" aria-label="Your numbers">
      <Kpi
        label="Attempted"
        icon="target"
        loading={loading}
        value={(t?.attempted ?? 0).toLocaleString()}
        sub={t?.questionsInBank ? `${coverage}% of ${t.questionsInBank.toLocaleString()} PYQs` : 'Across the PYQ bank'}
        spark={last30.some(Boolean) ? last30 : undefined}
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
        sub={<Link to={GATE_ROUTES.review}>Spaced repetition</Link>}
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
  const subjects = useSubjects(exam)
  const web = useNexusWeb()
  const examSubjects = useMemo(() => new Set((web.structure?.hubs?.gate?.[exam === 'DA' ? 'DA' : 'CSE'] ?? []).map((h) => h.nexus)), [web.structure, exam])
  // With no plan for today: picks from every GATE subject, topic and set of
  // notes, changing every few hours (and on Shuffle).
  const pool = useMemo(
    () =>
      discoverPool({
        // Only this exam's subjects (Machine Learning is GATE DA, not CSE).
        clusters: (web.clusters ?? []).filter((c) => examSubjects.has(c.id) && (c.gate?.pyq || c.gate?.notes)),
        gate: subjects.list,
        links: { subject: subjectHref, practice: ({ subject, topic }) => practiceLink({ exam, subject, topic }) },
      }),
    [web.clusters, subjects.list, exam, examSubjects],
  )

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

  const when = !plan ? 'Picks for now' : today && today.date !== dayKey() ? `Next study day: ${new Date(`${today.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}` : 'From your study plan'
  return (
    <div className="gh-plan-body">
      <div className="gh-plan-head">
        <div>
          <p className="ed-label">Today&rsquo;s plan</p>
          <p className="gh-plan-when">{when}</p>
        </div>
        <PanelLink to={GATE_ROUTES.planner}>Full plan</PanelLink>
      </div>
      {!plan ? (
        <div className="gh-plan-empty">
          <p className="max-w-md text-[13.5px] text-text-secondary">
            No study plan yet: here are a few picks for now.{' '}
            <Link to={GATE_ROUTES.planner} className="gp-link font-semibold text-text-primary">
              Build my plan
            </Link>{' '}
            and the planner splits the syllabus by weightage and your weak spots.
          </p>
          <Discover pool={pool} scope={`gate:${exam}`} label="Try today" className="mt-4" />
        </div>
      ) : !today ? (
        <div className="gh-plan-empty">
          <p className="text-[13.5px] text-text-secondary">Nothing scheduled today. Enjoy the break, or try one of these.</p>
          <Discover pool={pool} scope={`gate:${exam}`} label="Try today" className="mt-4" />
        </div>
      ) : (
        <ol className="gh-tasks">
          {today.tasks.map((t, i) => (
            <li key={i}>
              <Link to={taskLink(t)} className="gh-task group">
                <span className="gh-task-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="gh-task-name">{taskLabel(t)}</span>
                  <span className="gh-task-meta">{t.kind === 'learn' ? t.subjectName : t.kind === 'mock' ? '65 questions · 3 hours' : t.subjectName ?? 'Spaced review'}</span>
                </span>
                <span className="gh-task-time">
                  {t.hours}h{t.kind !== 'mock' && <span> · {t.questions} Qs</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ── The syllabus: every subject once ──────────────────────────────────── */

function SyllabusLedger({ summary, loading }: { summary: GateSummary | null; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const web = useNexusWeb()
  const stats = new Map((summary?.bySubject ?? []).map((x) => [x.subject, x]))
  const hubs = web.structure?.hubs?.gate?.[exam === 'DA' ? 'DA' : 'CSE'] ?? []
  const nexusOf = new Map(hubs.map((h) => [h.bank, h.nexus]))
  const clusterOf = new Map((web.clusters ?? []).map((c) => [c.id, c]))
  const list = subjects.list.filter((x) => !x.legacy)

  return (
    <section className="gh-syl" aria-labelledby="gh-syl-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ed-label ed-muted m-0">The syllabus</p>
          <h2 id="gh-syl-h" className="ed-h2 mt-3 mb-0">
            Every subject, where you stand
          </h2>
        </div>
        <Link to={GATE_ROUTES.syllabus} className="ed-link ed-ui">
          Full syllabus
        </Link>
      </div>
      {loading || (subjects.meta.loading && !list.length) ? (
        <LoadingBlock rows={6} />
      ) : !list.length ? (
        <EmptyHint icon="layers" title="Syllabus unavailable">The subject list couldn&rsquo;t be loaded. Try again shortly.</EmptyHint>
      ) : (
        <ol className="gh-syl-rows">
          {list.map((sub, i) => {
            const st = stats.get(sub.id)
            const att = st?.attempted ?? 0
            const level = masteryOf(att, st?.accuracy)
            const score = masteryScore(att, st?.accuracy)
            const c = clusterOf.get(nexusOf.get(sub.id) ?? '')
            const notes = c?.gate?.notes && web.notes.has(c.gate.notes)
            const home = c ? subjectHref(c) : null
            return (
              <li key={sub.id} className="gh-syl-row">
                <span className="gh-syl-no ed-mono" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  {home ? (
                    <Link to={home} className="gh-syl-name">
                      {sub.name}
                    </Link>
                  ) : (
                    <span className="gh-syl-name">{sub.name}</span>
                  )}
                  <span className="gh-syl-meta">{att ? `${pct(st?.accuracy)}% right · ${att} questions tried` : MASTERY[0].label}</span>
                </span>
                <span className="gh-syl-bar" role="meter" aria-label={`${sub.name} mastery`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(score * 100)}>
                  <span style={{ width: `${Math.max(Math.round(score * 100), att ? 3 : 0)}%` }} data-level={level} />
                </span>
                <span className="gh-syl-links">
                  {home && notes ? (
                    <Link to={home} className="gh-syl-link is-read">
                      Read
                    </Link>
                  ) : (
                    <span className="gh-syl-link is-soon" title="Notes are being written; the skill tree and PYQs are ready">
                      Notes soon
                    </span>
                  )}
                  {c && (
                    <Link to={`${subjectHref(c)}?view=tree`} className="gh-syl-link">
                      Tree
                    </Link>
                  )}
                  <Link to={practiceLink({ exam, subject: sub.id })} className="gh-syl-link">
                    PYQs
                  </Link>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
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
        <LoadingBlock rows={3} />
      ) : !last ? (
        <EmptyHint icon="rocket" title="Your first question awaits" action={<LinkButton to={practiceLink({ exam })} icon="play">Open the PYQ bank</LinkButton>}>
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
        <LoadingBlock rows={3} />
      ) : !weak.length ? (
        <p className="text-[13.5px] text-text-secondary">Attempt a few questions per topic and your weakest areas will surface here, each with a one-tap drill.</p>
      ) : (
        <ul className="gh-weak">
          {weak.map((t) => (
            <li key={`${t.subject}/${t.topic}`}>
              <p>
                <span className="font-semibold text-text-primary">{subjects.topicName(t.subject, t.topic)}</span> in {subjects.subjectName(t.subject)}:{' '}
                <span className="font-mono text-text-primary">
                  {t.correct} of {t.attempted}
                </span>{' '}
                right ({pct(t.accuracy)}%).{' '}
                <Link to={practiceLink({ exam, subject: t.subject, topic: t.topic })} className="gp-link font-semibold text-text-primary">
                  Drill it
                </Link>
              </p>
            </li>
          ))}
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
      <ul className="gh-quick">
        {tiles.map((t) => (
          <li key={t.title}>
            <Link to={t.to} className="gh-quick-row group" data-tone={t.tone}>
              <Icon name={t.icon} className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-text-primary">{t.title}</span>
                <span className="block truncate text-[12px] text-text-muted">{t.hint}</span>
              </span>
              <span aria-hidden="true" className="text-text-muted transition-transform group-hover:translate-x-0.5">
                →
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
        <LoadingBlock rows={3} />
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
