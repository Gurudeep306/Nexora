/*
  GateShell — the frame around every GATE page:

    ┌ GATE · [CSE|DA] switcher ········ countdown · [Start practising] ┐
    ├ Home · Practice · Review(3) · Daily · Tests · Mock · … (sticky)  ┤
    │ eyebrow / Title / subtitle                              actions  │
    └ page content                                                     ┘

  Usage (props are the stable contract every GATE page uses):
    <GateShell title="Analytics" subtitle="…" actions={<Button/>}>…</GateShell>
*/
import type { KeyboardEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { GateNav } from './GateNav'
import { GATE_EXAMS, useGateExam, type GateExam } from './examStore'
import { useReviewDue } from './useGateData'
import { practiceLink } from './links'
import { GATE_ROUTES } from '@/gate/api'
import { daysUntil } from '@/gate/insights/format'
import { useStudyPlan } from '@/gate/insights/planInputs'

export interface GateShellProps {
  /** Page title shown in the header. */
  title: string
  /** One-line description under the title. */
  subtitle?: string
  /** Right side of the header (buttons). */
  actions?: ReactNode
  /** Skip the title row: the page draws its own (the notes reader). */
  bare?: boolean
  /** Show "Start practising" in the top row (off where the page has its own main action). */
  cta?: boolean
  children: ReactNode
}

function ExamSwitcher() {
  const [exam, setExam] = useGateExam()
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const i = GATE_EXAMS.findIndex((x) => x.id === exam)
    const next = GATE_EXAMS[(i + 1) % GATE_EXAMS.length]!.id
    setExam(next)
    requestAnimationFrame(() => document.getElementById(`gate-exam-${next}`)?.focus())
  }
  return (
    <div
      role="radiogroup"
      aria-label="Exam paper"
      onKeyDown={onKey}
      className="gseg inline-flex items-center"
    >
      {GATE_EXAMS.map((x) => {
        const on = x.id === exam
        return (
          <button
            key={x.id}
            id={`gate-exam-${x.id}`}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={x.long}
            onClick={() => setExam(x.id as GateExam)}
            className="gseg-btn font-mono tracking-wide"
          >
            {x.label}
          </button>
        )
      })}
    </div>
  )
}

function Countdown() {
  const plan = useStudyPlan()
  const days = daysUntil(plan.plan?.examDate ?? null)
  if (plan.loading) return <span className="hidden h-8 w-28 animate-pulse rounded-lg bg-bg-surface-2 sm:block" aria-hidden="true" />
  if (days == null || days < 0)
    return (
      <Link
        to={GATE_ROUTES.planner}
        className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary sm:inline-flex"
      >
        <Icon name="calendar" className="size-3.5" /> Set exam date
      </Link>
    )
  return (
    <Link
      to={GATE_ROUTES.planner}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12.5px] text-text-secondary transition-colors hover:bg-bg-surface-2"
      title="Days left to your exam"
    >
      <Icon name="timer" className="size-3.5 text-text-muted" />
      <span className="font-mono font-semibold text-text-primary tabular-nums">{days}</span>
      <span className="hidden sm:inline">days to go</span>
      <span className="sm:hidden">d</span>
    </Link>
  )
}

export function GateShell({ title, subtitle, actions, bare, cta = true, children }: GateShellProps) {
  const [exam] = useGateExam()
  const review = useReviewDue()
  const examInfo = GATE_EXAMS.find((x) => x.id === exam)!

  return (
    <div className="gate-shell -mt-2">
      {/* Brand row: exam switcher, countdown, primary CTA */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to={GATE_ROUTES.home} className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand" aria-label="The Exam Hall, GATE home">
            <span className="ed-serif text-[19px] leading-none text-text-primary">The Exam Hall</span>
          </Link>
          <ExamSwitcher />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Countdown />
          {cta && (
            <Link to={practiceLink({ exam })} data-variant="primary" className="gbtn">
            <Icon name="play" className="size-3.5" />
            <span className="hidden sm:inline">Start practising</span>
            <span className="sm:hidden">Practise</span>
          </Link>
          )}
        </div>
      </div>

      {/* Section links — sticky under the app top bar */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-border bg-bg-app/85 px-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <GateNav reviewDue={review.data ?? 0} />
      </div>

      {!bare && (
      <header data-ui="page-header" className="mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p data-ui="eyebrow" className="ed-label">
            The Exam Hall · GATE {exam} <span className="sr-only">({examInfo.long})</span>
          </p>
          <h1 data-ui="page-title" className="ed-title mt-2">
            {title}
          </h1>
          {subtitle && <p className="ed-lead mt-2 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      )}

      {children}
    </div>
  )
}
