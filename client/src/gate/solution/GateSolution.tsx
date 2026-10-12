import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { Icon, type IconName } from '@/components/icon/Icon'
import type { GateQuestion } from '../types'
import type { Frame, Solution } from './types'
import { isAnimated, stepFrames } from './engine'
import { SceneCanvas } from './scenes/SceneCanvas'
import { useGateSolution, type GateSolutionState } from './useGateSolution'

/*
  The worked-solution panel for one GATE question.

  v2 solutions: answer card → approach → step-by-step walkthrough synced with
  an animation canvas (split view when the container is wide, stacked on
  phones) → option analysis → shortcut / pitfalls / verification.
  Legacy questions (paper not migrated yet) show their text cleanly.
*/

const SPEEDS = [0.75, 1, 1.5, 2]

export function GateSolution({ q, state }: { q: GateQuestion; state?: GateSolutionState }) {
  const own = useGateSolution(q.id, !state)
  const s = state ?? own
  if (s.loading && !s.data) return <SolutionSkeleton />
  if (s.error && !s.data)
    return (
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-text-secondary">
          <span>Couldn't load the solution: {s.error}</span>
          <button type="button" onClick={s.refetch} className="btn-secondary !px-3 !py-1.5 !text-[12.5px]">
            Retry
          </button>
        </div>
      </Panel>
    )
  const d = s.data
  if (!d || d.format === 'none')
    return (
      <Panel>
        <p className="text-[13.5px] text-text-muted">No worked solution has been written for this question yet.</p>
      </Panel>
    )
  if (d.format === 'legacy') return <LegacySolution text={d.legacy} />
  return <SolutionV2 q={q} sol={d.solution} />
}

export default GateSolution

/* ── Building blocks ─────────────────────────────────────────────────────── */

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('mt-4 rounded-2xl border border-border bg-bg-surface p-4 sm:p-5', className)}>{children}</section>
}

function Eyebrow({ icon, children, tone = 'text-text-muted' }: { icon?: IconName; children: ReactNode; tone?: string }) {
  return (
    <div className={cn('mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]', tone)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </div>
  )
}

function SolutionSkeleton() {
  return (
    <Panel>
      <div className="animate-pulse space-y-3" aria-label="Loading solution">
        <div className="h-16 rounded-xl bg-bg-surface-2" />
        <div className="h-4 w-2/3 rounded bg-bg-surface-2" />
        <div className="h-48 rounded-xl bg-bg-surface-2" />
      </div>
    </Panel>
  )
}

function LegacySolution({ text }: { text: string }) {
  return (
    <Panel>
      <Eyebrow icon="book">Worked solution</Eyebrow>
      <Markdown md={text} className="!text-[14.5px] [&_p]:!leading-relaxed" />
      <p className="mt-4 border-t border-border pt-3 text-[12px] text-text-muted">An animated, step-by-step walkthrough for this question is on its way.</p>
    </Panel>
  )
}

/* ── v2 ──────────────────────────────────────────────────────────────────── */

function SolutionV2({ q, sol }: { q: GateQuestion; sol: Solution }) {
  const frames = useMemo(() => stepFrames(sol), [sol])
  const animated = isAnimated(frames)
  const staticFrame = !animated ? (frames.find(Boolean) ?? null) : null
  return (
    <div className="@container mt-4 space-y-4">
      <AnswerCard q={q} sol={sol} />
      <Panel className="!mt-0">
        <Eyebrow icon="target" tone="text-accent-brand">
          Approach
        </Eyebrow>
        <Markdown md={sol.approach} className="!text-[14.5px] !text-text-primary" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sol.concepts.map((c) => (
            <span key={c} className="rounded-full border border-border bg-bg-surface-2 px-2.5 py-0.5 text-[11.5px] font-semibold text-text-secondary">
              {c}
            </span>
          ))}
        </div>
        {sol.given && (
          <div className="mt-4 rounded-xl border border-border/70 bg-bg-surface-2/60 p-3">
            <Eyebrow icon="list">Given</Eyebrow>
            <Markdown md={sol.given} className="!text-[14px]" />
          </div>
        )}
      </Panel>
      {animated ? <Walkthrough sol={sol} frames={frames} /> : <StaticSteps sol={sol} frame={staticFrame} />}
      {sol.optionAnalysis && sol.optionAnalysis.length > 0 && <OptionAnalysis q={q} sol={sol} />}
      <Extras sol={sol} />
    </div>
  )
}

function AnswerCard({ q, sol }: { q: GateQuestion; sol: Solution }) {
  const a = sol.answer
  const official = q.answerSource === 'official'
  return (
    <section
      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: 'color-mix(in oklab, var(--color-state-success) 45%, var(--color-border))',
        background: 'color-mix(in oklab, var(--color-state-success) 8%, var(--color-bg-surface))',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-state-success">
            <Icon name="check-circle" size={14} /> Answer
          </div>
          <Markdown md={a.value} className="!text-[19px] !font-semibold !leading-snug !text-text-primary [&_strong]:!text-text-primary" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {a.matchesKey ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold text-state-success"
              style={{ background: 'color-mix(in oklab, var(--color-state-success) 14%, transparent)' }}
            >
              <Icon name="check" size={13} /> {official ? 'Matches official key' : 'Matches answer key'}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold text-state-warning"
              style={{ background: 'color-mix(in oklab, var(--color-state-warning) 14%, transparent)' }}
            >
              <Icon name="warning" size={13} /> Differs from stored key
            </span>
          )}
        </div>
      </div>
      {!a.matchesKey && a.keyNote && (
        <div className="mt-3 rounded-xl border border-border bg-bg-surface p-3 text-[13px] text-text-secondary">
          <Markdown md={a.keyNote} className="!text-[13px]" />
        </div>
      )}
    </section>
  )
}

/* ── Animated walkthrough ────────────────────────────────────────────────── */

function stepDuration(body: string, speed: number) {
  return Math.min(9000, Math.max(3200, 2400 + body.length * 18)) / speed
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

function Walkthrough({ sol, frames }: { sol: Solution; frames: (Frame | null)[] }) {
  const n = sol.steps.length
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIx, setSpeedIx] = useState(1)
  const listRef = useRef<HTMLOListElement>(null)
  const speed = SPEEDS[speedIx]
  const frame = frames[active] ?? frames.find(Boolean) ?? null

  const go = useCallback((i: number) => setActive(Math.max(0, Math.min(n - 1, i))), [n])

  useEffect(() => {
    if (!playing) return
    // The last step still gets its reading time, then playback stops.
    const t = window.setTimeout(() => {
      if (active >= n - 1) setPlaying(false)
      else setActive(active + 1)
    }, stepDuration(sol.steps[active].body, speed))
    return () => window.clearTimeout(t)
  }, [playing, active, n, speed, sol.steps])

  // Keep the active step visible while auto-playing (wide layout only).
  useEffect(() => {
    if (!playing) return
    const el = listRef.current?.children[active] as HTMLElement | undefined
    if (el && el.offsetParent !== null && getComputedStyle(el).display !== 'none') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active, playing])

  const togglePlay = () => {
    if (!playing && active >= n - 1) setActive(0)
    setPlaying((p) => !p)
  }

  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(tag)) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPlaying(false)
      go(active + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setPlaying(false)
      go(active - 1)
    } else if (e.key === ' ') {
      e.preventDefault()
      togglePlay()
    }
  }

  const step = sol.steps[active]
  return (
    <section
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Step-by-step walkthrough. Use left and right arrow keys to move between steps, space to play or pause."
      className="rounded-2xl border border-border bg-bg-surface p-3 outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/60 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <Eyebrow icon="sparkles" tone="text-accent-brand">
          Step-by-step
        </Eyebrow>
        <span className="mb-2 font-mono text-[11.5px] font-semibold text-text-muted">
          {active + 1} / {n}
        </span>
      </div>
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        {/* Canvas (first on phones, right column on wide screens) */}
        <div className="min-w-0 @3xl:order-2">
          <div className="@3xl:sticky @3xl:top-4">
            <div className="rounded-xl border border-border/80 bg-bg-app/60 p-3 sm:p-4">
              <div className="min-h-[9rem]">{frame && <SceneCanvas frame={frame} />}</div>
            </div>
            <Controls
              n={n}
              active={active}
              playing={playing}
              speed={speed}
              onPlay={togglePlay}
              onPrev={() => {
                setPlaying(false)
                go(active - 1)
              }}
              onNext={() => {
                setPlaying(false)
                go(active + 1)
              }}
              onRestart={() => {
                setActive(0)
                setPlaying(true)
              }}
              onSpeed={() => setSpeedIx((i) => (i + 1) % SPEEDS.length)}
              onSeek={(i) => {
                setPlaying(false)
                go(i)
              }}
            />
            {/* Phones: the active step's explanation sits under the canvas. */}
            <div className="mt-3 @3xl:hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="rounded-xl border border-accent-brand/40 bg-accent-brand/5 p-3">
                  <StepHeader i={active} title={step.title} active />
                  <Markdown md={step.body} className="mt-2 !text-[14px]" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {/* Steps */}
        <ol ref={listRef} className="flex min-w-0 flex-col gap-2 @3xl:order-1">
          {sol.steps.map((s, i) => (
            <li key={i}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setPlaying(false)
                  go(i)
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  e.stopPropagation()
                  setPlaying(false)
                  go(i)
                }}
                aria-current={i === active ? 'step' : undefined}
                className={cn(
                  'w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,opacity] duration-200',
                  i === active ? 'border-accent-brand/60 bg-accent-brand/[0.07] shadow-sm' : 'border-border/60 bg-bg-surface-2/30 opacity-80 hover:border-border hover:opacity-100',
                )}
              >
                <StepHeader i={i} title={s.title} active={i === active} done={i < active} />
                <div className="hidden @3xl:block">
                  <Markdown md={s.body} className="mt-2 !text-[14px]" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function StepHeader({ i, title, active, done }: { i: number; title: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-px flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-bold transition-colors',
          active ? 'bg-accent-brand text-on-accent-brand' : done ? 'bg-bg-surface-3 text-text-secondary' : 'bg-bg-surface-2 text-text-muted',
        )}
      >
        {i + 1}
      </span>
      <span className={cn('text-[14px] font-semibold leading-snug', active ? 'text-text-primary' : 'text-text-secondary')}>
        <Markdown md={title} className="!text-[14px] [&_p]:!m-0 !text-inherit" />
      </span>
    </div>
  )
}

function Controls(p: {
  n: number
  active: number
  playing: boolean
  speed: number
  onPlay: () => void
  onPrev: () => void
  onNext: () => void
  onRestart: () => void
  onSpeed: () => void
  onSeek: (i: number) => void
}) {
  const btn = 'flex size-9 items-center justify-center rounded-xl border border-border bg-bg-surface-2 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary disabled:opacity-40 disabled:hover:border-border cursor-pointer disabled:cursor-default'
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className={btn} onClick={p.onRestart} title="Restart" aria-label="Restart">
        <Icon name="refresh" size={15} />
      </button>
      <button type="button" className={btn} onClick={p.onPrev} disabled={p.active === 0} title="Previous step (←)" aria-label="Previous step">
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        onClick={p.onPlay}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-accent-brand px-3.5 text-[13px] font-bold text-on-accent-brand shadow-sm transition-colors hover:bg-accent-brand-hover"
        title="Play / pause (space)"
        aria-label={p.playing ? 'Pause' : 'Play'}
      >
        <Icon name={p.playing ? 'pause' : 'play'} size={15} />
        {p.playing ? 'Pause' : p.active >= p.n - 1 ? 'Replay' : 'Play'}
      </button>
      <button type="button" className={btn} onClick={p.onNext} disabled={p.active >= p.n - 1} title="Next step (→)" aria-label="Next step">
        <Chevron dir="right" />
      </button>
      <div className="flex min-w-[7rem] flex-1 items-center gap-1" role="group" aria-label="Steps">
        {Array.from({ length: p.n }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => p.onSeek(i)}
            aria-label={`Go to step ${i + 1}`}
            className="group flex h-6 flex-1 cursor-pointer items-center"
          >
            <span
              className={cn(
                'h-1.5 w-full rounded-full transition-colors duration-300 group-hover:h-2',
                i < p.active ? 'bg-accent-brand/55' : i === p.active ? 'bg-accent-brand' : 'bg-bg-surface-3',
              )}
            />
          </button>
        ))}
      </div>
      <button type="button" onClick={p.onSpeed} className={cn(btn, 'w-auto px-2.5 font-mono text-[12px] font-bold')} title="Playback speed" aria-label={`Speed ${p.speed}×`}>
        {p.speed}×
      </button>
    </div>
  )
}

/* ── Static steps ────────────────────────────────────────────────────────── */

function StaticSteps({ sol, frame }: { sol: Solution; frame: Frame | null }) {
  return (
    <Panel className="!mt-0">
      <Eyebrow icon="list" tone="text-accent-brand">
        Step-by-step
      </Eyebrow>
      {frame && (
        <div className="mb-4 rounded-xl border border-border/80 bg-bg-app/60 p-3 sm:p-4">
          <SceneCanvas frame={frame} />
        </div>
      )}
      <ol className="relative space-y-4 border-l-2 border-border/70 pl-5">
        {sol.steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-0 flex size-6 items-center justify-center rounded-lg bg-bg-surface-3 font-mono text-[12px] font-bold text-text-secondary ring-4 ring-bg-surface">
              {i + 1}
            </span>
            <div className="text-[14px] font-semibold text-text-primary">
              <Markdown md={s.title} className="!text-[14px] [&_p]:!m-0 !text-inherit" />
            </div>
            <Markdown md={s.body} className="mt-1.5 !text-[14px]" />
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/* ── Options & extras ────────────────────────────────────────────────────── */

function OptionAnalysis({ q, sol }: { q: GateQuestion; sol: Solution }) {
  const text = new Map(q.options.map((o) => [o.l, o.t]))
  return (
    <Panel className="!mt-0">
      <Eyebrow icon="check-circle">Why each option is right or wrong</Eyebrow>
      <div className="grid gap-2 @2xl:grid-cols-2">
        {sol.optionAnalysis!.map((o) => (
          <div
            key={o.option}
            className="rounded-xl border p-3"
            style={{
              borderColor: o.correct ? 'color-mix(in oklab, var(--color-state-success) 50%, var(--color-border))' : 'var(--color-border)',
              background: o.correct ? 'color-mix(in oklab, var(--color-state-success) 7%, var(--color-bg-surface))' : 'var(--color-bg-surface)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[13px] font-bold"
                style={{
                  background: o.correct ? 'var(--color-state-success)' : 'var(--color-bg-surface-3)',
                  color: o.correct ? 'var(--color-bg-surface)' : 'var(--color-text-secondary)',
                }}
              >
                {o.option}
              </span>
              <div className="min-w-0 flex-1">
                {text.get(o.option) && <Markdown md={text.get(o.option)!} className="!text-[13.5px] !text-text-primary [&_p]:!m-0" />}
                <div className={cn('mt-1 flex items-start gap-1.5 text-[13px]', o.correct ? 'text-state-success' : 'text-text-secondary')}>
                  <Icon name={o.correct ? 'check' : 'x'} size={14} className="mt-0.5 shrink-0" />
                  <Markdown md={o.reason} className="!text-[13px] !text-inherit [&_p]:!m-0" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Extras({ sol }: { sol: Solution }) {
  if (!sol.shortcut && !sol.pitfalls?.length && !sol.verification) return null
  return (
    <div className="grid gap-3 @3xl:grid-cols-2">
      {sol.shortcut && (
        <Panel className="!mt-0">
          <Eyebrow icon="bolt" tone="text-accent-brand">
            Exam shortcut
          </Eyebrow>
          <Markdown md={sol.shortcut} className="!text-[14px]" />
        </Panel>
      )}
      {sol.verification && (
        <Panel className="!mt-0">
          <Eyebrow icon="check-circle" tone="text-state-success">
            How we checked it
          </Eyebrow>
          <Markdown md={sol.verification} className="!text-[14px]" />
        </Panel>
      )}
      {sol.pitfalls && sol.pitfalls.length > 0 && (
        <Panel className="!mt-0 @3xl:col-span-2">
          <Eyebrow icon="warning" tone="text-state-warning">
            Common pitfalls
          </Eyebrow>
          <ul className="space-y-1.5">
            {sol.pitfalls.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-text-secondary">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-state-warning" />
                <Markdown md={p} className="!text-[14px] [&_p]:!m-0" />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
