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
import { motion } from 'motion/react'
import { Icon, IconBadge } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
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
      className="relative inline-flex h-8 items-center rounded-lg border border-border bg-bg-surface-2 p-0.5"
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
            className={cn(
              'relative z-10 h-full cursor-pointer rounded-md px-3 text-[12.5px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand',
              on ? 'text-on-accent-brand' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {on && (
              <motion.span
                layoutId="gate-exam-pill"
                className="absolute inset-0 -z-10 rounded-md bg-accent-brand"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
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
        className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-primary sm:inline-flex"
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
      <Icon name="timer" className="size-3.5 text-accent-brand" />
      <span className="font-semibold text-text-primary tabular-nums">{days}</span>
      <span className="hidden sm:inline">days to go</span>
      <span className="sm:hidden">d</span>
    </Link>
  )
}

export function GateShell({ title, subtitle, actions, children }: GateShellProps) {
  const [exam] = useGateExam()
  const review = useReviewDue()
  const examInfo = GATE_EXAMS.find((x) => x.id === exam)!

  return (
    <div className="gate-shell -mt-2">
      {/* Brand row: exam switcher, countdown, primary CTA */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to={GATE_ROUTES.home} className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand" aria-label="GATE home">
            <IconBadge name="gate" box="sm" />
            <span className="hidden font-display text-[15px] font-semibold tracking-tight text-text-primary sm:inline">GATE</span>
          </Link>
          <ExamSwitcher />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Countdown />
          <Link
            to={practiceLink({ exam })}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-brand px-3 text-[13px] font-semibold text-on-accent-brand shadow-[0_6px_18px_-8px_var(--color-accent-brand)] transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2"
          >
            <Icon name="play" className="size-3.5" />
            <span className="hidden sm:inline">Start practising</span>
            <span className="sm:hidden">Practise</span>
          </Link>
        </div>
      </div>

      {/* Section links — sticky under the app top bar */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-border bg-bg-app/85 px-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <GateNav reviewDue={review.data ?? 0} />
      </div>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-accent-brand uppercase">
            GATE {exam} · {examInfo.long}
          </p>
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-text-primary md:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {children}
    </div>
  )
}
