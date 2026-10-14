/*
  GATE planner — exam date, hours and priorities in; a week-by-week plan out.

  Hours are split by  exam weightage × your weakness × your priority  (see
  gate/insights/planner.ts). The plan regenerates live as settings change; Save
  stores it on the server (and in this browser as a fallback).
*/
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Skeleton, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { GATE_ROUTES, gateApi, type StudyPlan } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { useGateSummary } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { EmptyHint, Kpi, Panel, Segmented } from '@/gate/insights/ui'
import { dayKey, daysUntil, parseDay, pct } from '@/gate/insights/format'
import { generatePlan, type PlanTask, type PlanWeek } from '@/gate/insights/planner'
import { DEFAULT_PLAN, usePlanInputs, useStudyPlan, writeLocalPlan } from '@/gate/insights/planInputs'
import { shortSubject } from '@/gate/insights/subjects'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITIES = [
  { id: '0', label: 'Skip' },
  { id: '1', label: 'Low' },
  { id: '2', label: 'Normal' },
  { id: '3', label: 'High' },
] as const

const fmtDate = (k: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => parseDay(k).toLocaleDateString(undefined, o)

export default function GatePlannerPage() {
  const [exam] = useGateExam()
  const toast = useToast()
  const stored = useStudyPlan()
  const summary = useGateSummary()
  const inputs = usePlanInputs(exam)
  const [draft, setDraft] = useState<StudyPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const plan = draft ?? stored.plan ?? DEFAULT_PLAN
  const dirty = JSON.stringify(plan) !== JSON.stringify(stored.plan ?? null)
  const update = (patch: Partial<StudyPlan>) => setDraft({ ...plan, ...patch })

  const gen = useMemo(
    () =>
      inputs.subjects.length
        ? generatePlan({
            plan,
            subjects: inputs.subjects,
            weight: inputs.weight,
            topicCount: inputs.topicCount,
            bySubject: summary.data?.bySubject ?? [],
            byTopic: summary.data?.byTopic ?? [],
          })
        : null,
    [plan, inputs, summary.data],
  )

  const save = async () => {
    setSaving(true)
    writeLocalPlan(plan)
    try {
      const r = await gateApi.savePlan(plan)
      stored.query.setData(r.plan)
      setDraft(r.plan)
      toast.success('Plan saved', 'Your countdown and daily tasks are updated.')
    } catch {
      stored.query.setData(plan)
      toast.info('Saved on this device', 'We couldn’t reach the server — the plan is kept in this browser for now.')
    } finally {
      setSaving(false)
    }
  }

  const days = daysUntil(plan.examDate)
  const todayKey = dayKey()
  const today = gen?.days.find((d) => d.date >= todayKey)

  return (
    <GateShell
      title="Study planner"
      subtitle="A week-by-week plan weighted by exam weightage, your weak spots and your priorities."
      actions={
        <Button onClick={save} loading={saving} disabled={!dirty && !!stored.plan} size="sm">
          <Icon name="save" /> {stored.plan && !dirty ? 'Saved' : 'Save plan'}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Settings ── */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-32 lg:self-start">
          <Panel title="Settings" icon="sliders">
            {stored.loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="gate-exam-date" className="text-[12.5px] font-medium text-text-secondary">
                    Exam date
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="gate-exam-date"
                      type="date"
                      min={todayKey}
                      value={plan.examDate ?? ''}
                      onChange={(e) => update({ examDate: e.target.value || null })}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg-surface-2 px-3 text-[13.5px] text-text-primary [color-scheme:light_dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
                    />
                    {plan.examDate && (
                      <Button variant="ghost" size="sm" onClick={() => update({ examDate: null })} aria-label="Clear exam date">
                        <Icon name="x" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-text-muted">
                    {days != null && days > 0 ? `${days} days to go` : 'No date: a rolling 12-week plan'} · GATE is usually in early February.
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="gate-hours" className="text-[12.5px] font-medium text-text-secondary">
                      Hours per study day
                    </label>
                    <span className="font-display text-[15px] font-semibold text-text-primary tabular-nums">{plan.hoursPerDay}h</span>
                  </div>
                  <input
                    id="gate-hours"
                    type="range"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={plan.hoursPerDay}
                    onChange={(e) => update({ hoursPerDay: Number(e.target.value) })}
                    className="mt-2 w-full accent-[var(--color-accent-brand)]"
                  />
                </div>

                <fieldset>
                  <legend className="text-[12.5px] font-medium text-text-secondary">Study days</legend>
                  <div className="mt-1.5 grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((d, i) => {
                      const on = plan.days.includes(i)
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update({ days: on ? plan.days.filter((x) => x !== i) : [...plan.days, i].sort() })}
                          className={cn(
                            'h-9 cursor-pointer rounded-lg border text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand',
                            on ? 'border-accent-brand/50 bg-accent-brand/12 text-text-primary' : 'border-border text-text-muted hover:bg-bg-surface-2',
                          )}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[12.5px] font-medium text-text-secondary">Subject priorities</legend>
                  {inputs.loading ? (
                    <Skeleton className="mt-2 h-48 w-full rounded-lg" />
                  ) : (
                    <ul className="mt-1.5 space-y-1.5">
                      {inputs.subjects.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-[12.5px] text-text-primary" title={s.name}>
                            {shortSubject(s.name)}
                          </span>
                          <Segmented
                            label={`Priority for ${s.name}`}
                            value={String(plan.priorities[s.id] ?? 2) as '0' | '1' | '2' | '3'}
                            onChange={(v) => update({ priorities: { ...plan.priorities, [s.id]: Number(v) } })}
                            options={PRIORITIES.map((p) => ({ id: p.id, label: p.label }))}
                            className="h-7 shrink-0 [&_button]:px-1.5 [&_button]:text-[11.5px]"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>
              </div>
            )}
          </Panel>
          <p className="px-1 text-[12px] leading-relaxed text-text-muted">
            How it works: learning hours go to subjects in proportion to <strong className="text-text-secondary">weightage × weakness × priority</strong>, then to topics
            by PYQ frequency. The last ~15% of days are revision with full mocks on alternate days.
          </p>
        </div>

        {/* ── Generated plan ── */}
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Days left" icon="timer" value={days != null && days > 0 ? days : '—'} sub={plan.examDate ? fmtDate(plan.examDate, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Rolling 12 weeks'} />
            <Kpi label="Study days" icon="calendar" tone="info" value={gen?.studyDays ?? '—'} sub={`${plan.days.length} per week`} loading={!gen && inputs.loading} />
            <Kpi label="Total hours" icon="clock" tone="success" value={gen ? Math.round(gen.totalHours) : '—'} sub={`${plan.hoursPerDay}h per study day`} loading={!gen && inputs.loading} />
            <Kpi label="Weeks" icon="layers" tone="gold" value={gen?.weeks.length ?? '—'} sub={gen ? `${gen.weeks.filter((w) => w.phase !== 'learn').length} revision` : ''} loading={!gen && inputs.loading} />
          </div>

          <Panel
            title={today && today.date !== todayKey ? `Next study day · ${fmtDate(today.date, { weekday: 'long', day: 'numeric', month: 'short' })}` : "Today's tasks"}
            icon="check-circle"
          >
            {!gen ? (
              <Skeleton className="h-28 w-full rounded-lg" />
            ) : !today ? (
              <EmptyHint icon="calendar" title="No study days">Pick at least one study day to generate a plan.</EmptyHint>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {today.tasks.map((t, i) => (
                  <li key={i} className="min-w-0">
                    <TaskCard t={t} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {gen && gen.subjectHours.length > 0 && (
            <Panel title="Where your hours go" icon="chart" subtitle="Learning-phase hours per subject">
              <ul className="space-y-1.5">
                {gen.subjectHours.map((s) => {
                  const st = summary.data?.bySubject.find((x) => x.subject === s.id)
                  return (
                    <li key={s.id} className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-3 text-[12.5px]">
                      <span className="truncate text-text-primary" title={s.name}>
                        {shortSubject(s.name)}
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-bg-surface-3">
                        <span className="block h-full rounded-full bg-accent-brand" style={{ width: `${Math.max(2, (s.hours / gen.subjectHours[0]!.hours) * 100)}%` }} />
                      </span>
                      <span className="w-24 text-right text-text-muted tabular-nums">
                        <span className="font-semibold text-text-primary">{Math.round(s.hours)}h</span>
                        {st?.attempted ? ` · ${pct(st.accuracy)}%` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}

          <Panel title="Week by week" icon="route" subtitle={gen?.rolling ? 'Rolling 12-week plan — set an exam date for a full countdown.' : 'Through to exam day'}>
            {!gen ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : !gen.weeks.length ? (
              <p className="text-[13px] text-text-muted">Nothing to schedule yet.</p>
            ) : (
              <ol className="space-y-2">
                {gen.weeks.map((w) => (
                  <WeekRow key={w.start} w={w} current={w.start <= todayKey && todayKey <= w.end} />
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </GateShell>
  )
}

function taskHref(t: PlanTask) {
  if (t.kind === 'mock') return GATE_ROUTES.cbt
  if (t.kind === 'revise' && !t.topic) return testLink({ focus: 'mistakes', count: 15, durationMin: 30 })
  return practiceLink({ subject: t.subject, topic: t.topic })
}

function TaskCard({ t }: { t: PlanTask }) {
  const title = t.kind === 'mock' ? 'Full-length mock' : t.kind === 'revise' ? (t.topicName ? `Revise · ${t.topicName}` : 'Revise mistakes') : (t.topicName ?? 'Practice')
  return (
    <Link
      to={taskHref(t)}
      className="group flex h-full items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-accent-brand/40 hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          t.kind === 'mock' ? 'bg-gold/15 text-gold' : t.kind === 'revise' ? 'bg-info/15 text-info' : 'bg-accent-brand/12 text-accent-brand',
        )}
      >
        <Icon name={t.kind === 'mock' ? 'monitor' : t.kind === 'revise' ? 'refresh' : 'book'} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-text-primary group-hover:text-accent-brand">{title}</span>
        <span className="block truncate text-[12px] text-text-muted">
          {t.subjectName ?? (t.kind === 'mock' ? 'GATE CBT · 65 questions' : 'Spaced review')} · {t.hours}h{t.kind !== 'mock' ? ` · ${t.questions} PYQs` : ''}
        </span>
      </span>
    </Link>
  )
}

const PHASE = {
  learn: { label: 'Learn', cls: 'bg-accent-brand/12 text-accent-brand' },
  revise: { label: 'Revise', cls: 'bg-info/15 text-info' },
  mock: { label: 'Mocks', cls: 'bg-gold/15 text-gold' },
} as const

function WeekRow({ w, current }: { w: PlanWeek; current: boolean }) {
  const [open, setOpen] = useState(current)
  const id = `week-${w.start}`
  return (
    <li className={cn('min-w-0 rounded-xl border', current ? 'border-accent-brand/45 bg-accent-brand/5' : 'border-border')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
      >
        <span className="w-12 shrink-0 text-[12px] font-semibold text-text-muted tabular-nums">W{w.index}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13px] font-medium text-text-primary">
              {fmtDate(w.start)} – {fmtDate(w.end)}
            </span>
            <span className={cn('rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold', PHASE[w.phase].cls)}>{PHASE[w.phase].label}</span>
            {current && <span className="text-[11px] font-semibold text-accent-brand">This week</span>}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-text-muted">{w.subjects.map(shortSubject).join(' · ') || 'Full mocks and revision'}</span>
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold text-text-primary tabular-nums">{w.hours}h</span>
        <span aria-hidden="true" className={cn('inline-block text-[18px] leading-none text-text-muted transition-transform', open && 'rotate-90')}>
          ›
        </span>
      </button>
      {open && (
        <ul id={id} className="min-w-0 space-y-2 border-t border-border px-3 py-3">
          {w.days.map((d) => (
            <li key={d.date} className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[96px_minmax(0,1fr)]">
              <span className={cn('text-[12px] font-medium', d.date === dayKey() ? 'text-accent-brand' : 'text-text-muted')}>
                {fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className="flex min-w-0 flex-wrap gap-1.5">
                {d.tasks.map((t, i) => (
                  <Link
                    key={i}
                    to={taskHref(t)}
                    className={cn(
                      'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-[12px] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand',
                      PHASE[t.kind === 'learn' ? 'learn' : t.kind === 'mock' ? 'mock' : 'revise'].cls,
                    )}
                  >
                    <span className="min-w-0 truncate">{t.kind === 'mock' ? 'Mock test' : (t.topicName ?? 'Revision')}</span>
                    <span className="opacity-70 tabular-nums">{t.hours}h</span>
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
