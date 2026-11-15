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
import { useTheme } from '@/context/ThemeContext'
import { loadSolutionFont } from '@/theme/fontLoaders'
import './solution-font.css'

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
  // The handwriting face is fetched only once a solution is on screen.
  const { look } = useTheme()
  useEffect(() => {
    void loadSolutionFont(look.solutionFont)
  }, [look.solutionFont])
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

/* Sections are separated by hairlines, not boxed (the journal reads like a page). */
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('mt-4 border-t border-[var(--ed-line)] pt-5', className)}>{children}</section>
}

/** A label above a section. Words, not colour: the icon and tone are kept for the API only. */
function Eyebrow({ children }: { icon?: IconName; children: ReactNode; tone?: string }) {
  return <p className="ed-label ed-muted mt-0 mb-3">{children}</p>
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx']
const roman = (i: number) => ROMAN[i] ?? String(i + 1)

/*
  Solution prose, set in the reader's chosen handwriting face
  (look.solutionFont → --font-solution; see solution-font.css). `size` is the
  authored size; the face's own scale is applied on top. Maths and code
  inside keep their fonts.
*/
const PROSE_SIZE = { 13: '[--sol-size:13px]', 14: '[--sol-size:14px]', 14.5: '[--sol-size:14.5px]' } as const

function Prose({ md, size = 14, title, className }: { md: string; size?: keyof typeof PROSE_SIZE; title?: boolean; className?: string }) {
  return <Markdown md={md} className={cn('sol-hand', title && 'sol-title', PROSE_SIZE[size], className)} />
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
      <Prose md={text} size={14.5} />
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
        <Prose md={sol.approach} size={14.5} className="!text-text-primary" />
        {sol.concepts.length > 0 && <p className="ed-caption ed-muted mt-3 mb-0">Ideas used: {sol.concepts.join(' · ')}</p>}
        {sol.given && (
          <div className="mt-4 border-l-2 border-[var(--ed-line-strong)] pl-4">
            <Eyebrow icon="list">Given</Eyebrow>
            <Prose md={sol.given} />
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
    <section className="border-l-2 border-state-success pl-4">
      <p className="ed-label ed-muted mt-0 mb-2">Answer</p>
      <Markdown md={a.value} className="ed-serif !text-[1.25rem] !leading-snug !text-text-primary [&_p]:!m-0 [&_strong]:!text-text-primary" />
      <p className={cn('ed-caption mt-2 mb-0 inline-flex items-center gap-1.5', a.matchesKey ? 'text-state-success' : 'text-state-warning')}>
        <Icon name={a.matchesKey ? 'check' : 'warning'} size={13} />
        {a.matchesKey ? (official ? 'Matches the official key' : 'Matches the answer key') : 'Differs from the stored key'}
      </p>
      {!a.matchesKey && a.keyNote && (
        <div className="ed-ui-sm ed-ink-2 mt-3">
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
      className="ed-feature p-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ed-focus)] sm:p-6"
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
            <div className="rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-card)] p-3 sm:p-4">
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
                  <Prose md={step.body} className="mt-2" />
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
                  <Prose md={s.body} className="mt-2" />
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
        className={cn('ed-serif-numeral w-7 shrink-0 text-[1.125rem] leading-[1.4] transition-colors', active ? 'text-text-primary' : done ? 'text-text-secondary' : 'text-text-muted')}
        aria-label={`Step ${i + 1}`}
      >
        {roman(i)}
      </span>
      <span className={cn('text-[14px] font-semibold leading-snug', active ? 'text-text-primary' : 'text-text-secondary')}>
        <Prose md={title} title className="[&_p]:!m-0 !text-inherit" />
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
        <div className="ed-feature mb-5 p-4 sm:p-6">
          <div className="rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-card)] p-3 sm:p-4">
            <SceneCanvas frame={frame} />
          </div>
        </div>
      )}
      <ol className="m-0 list-none space-y-5 p-0">
        {sol.steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2">
            <span className="ed-serif-numeral text-[1.125rem] leading-[1.4] text-text-muted" aria-label={`Step ${i + 1}`}>
              {roman(i)}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-text-primary">
                <Prose md={s.title} title className="[&_p]:!m-0 !text-inherit" />
              </div>
              <Prose md={s.body} className="mt-1.5" />
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/* ── Options & extras ────────────────────────────────────────────────────── */

function OptionAnalysis({ q, sol }: { q: GateQuestion; sol: Solution }) {
  const text = new Map(q.options.map((o) => [o.l, o.t]))
  const list = [...sol.optionAnalysis!].sort((x, y) => Number(y.correct) - Number(x.correct))
  return (
    <Panel className="!mt-0">
      <Eyebrow>Why the others are wrong</Eyebrow>
      <ul className="m-0 list-none border-t border-[var(--ed-line)] p-0">
        {list.map((o) => (
          <li key={o.option} className={cn('relative flex items-start gap-3 border-b border-[var(--ed-line)] py-3 pr-1 pl-3', o.correct && 'shadow-[inset_2px_0_0_var(--color-state-success)]')}>
            <span
              className={cn(
                'inline-grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[12px]',
                o.correct ? 'border-state-success bg-state-success text-[var(--ed-card)]' : 'border-[var(--ed-line-strong)] text-text-secondary',
              )}
            >
              {o.option}
            </span>
            <div className="min-w-0 flex-1">
              {text.get(o.option) && <Markdown md={text.get(o.option)!} className="ed-serif !text-[1rem] !text-text-primary [&_p]:!m-0" />}
              <div className={cn('mt-1 flex items-start gap-1.5 text-[13px]', o.correct ? 'text-state-success' : 'text-text-secondary')}>
                <Icon name={o.correct ? 'check' : 'x'} size={14} className="mt-0.5 shrink-0" />
                <span className="sr-only">{o.correct ? 'Correct:' : 'Wrong:'}</span>
                <Prose md={o.reason} size={13} className="!text-inherit [&_p]:!m-0" />
              </div>
            </div>
          </li>
        ))}
      </ul>
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
          <Prose md={sol.shortcut} />
        </Panel>
      )}
      {sol.verification && (
        <Panel className="!mt-0">
          <Eyebrow icon="check-circle" tone="text-state-success">
            How we checked it
          </Eyebrow>
          <Prose md={sol.verification} />
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
                <span className="mt-[0.7em] h-px w-3 shrink-0 bg-[var(--ed-line-strong)]" aria-hidden="true" />
                <Prose md={p} className="[&_p]:!m-0" />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
