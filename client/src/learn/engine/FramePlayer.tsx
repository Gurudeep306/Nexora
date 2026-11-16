import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, History, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipBack, SkipForward, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tokenize } from './code'
import type { Frame, Lang, Role, Structure } from './types'
import { ArrayView } from './views/ArrayView'
import { roleClass } from './views/format'
import { GridView, MeterView, OutputView, QueueView, StackView, VarsView } from './views/Others'
import { GraphView, HashView, ListView, TreeView } from './views/Linked'
import { CallsView, MapView } from './views/MapCalls'
import { ROLE_LABEL, StageContext, rolesIn, type StageInfo } from './views/stage'

/*
 * The one animation player on the site. The DSA chapters (VizPlayer: an
 * algorithm run on the learner's input) and the Solve page's dry run (the
 * student's own program run on a sample) both hand it recorded frames, so
 * every animation looks and behaves the same: the stage, the narrated step,
 * the legend, the code with its current line, the variables / call stack /
 * output beside it, play / pause / step / scrub / speed, the step log, marks
 * on the timeline, keyboard keys and full screen.
 */

const SPEEDS = [0.5, 1, 1.5, 2, 3]

export function StructureView({ s }: { s: Structure }) {
  switch (s.kind) {
    case 'array':
      return <ArrayView s={s} />
    case 'stack':
      return <StackView s={s} />
    case 'queue':
      return <QueueView s={s} />
    case 'grid':
      return <GridView s={s} />
    case 'vars':
      return <VarsView s={s} />
    case 'output':
      return <OutputView s={s} />
    case 'meter':
      return <MeterView s={s} />
    case 'list':
      return <ListView s={s} />
    case 'tree':
      return <TreeView s={s} />
    case 'graph':
      return <GraphView s={s} />
    case 'hash':
      return <HashView s={s} />
    case 'map':
      return <MapView s={s} />
    case 'calls':
      return <CallsView s={s} />
  }
}

/** Structures drawn beside the code rather than on the stage. */
const SIDE = new Set<Structure['kind']>(['vars', 'output', 'calls'])

/**
 * Code with its current lines lit. `hot` holds 0-based line indexes; the
 * first one is followed by a sliding bar and kept in view (the panel
 * scrolls, never the page).
 */
export function CodeLines({ lines, hot, lang, layoutKey, label = 'Code' }: { lines: string[]; hot: Set<number>; lang: Lang; layoutKey: string; label?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const first = Math.min(...[...hot])
  useEffect(() => {
    const el = box.current
    if (!el || !Number.isFinite(first)) return
    const row = el.querySelector<HTMLElement>(`[data-line="${first}"]`)
    if (!row) return
    el.scrollTo({ top: Math.max(0, row.offsetTop - el.clientHeight / 3), behavior: 'smooth' })
  }, [first, lang])
  return (
    <div ref={box} tabIndex={0} role="region" aria-label={label} className="viz-code relative max-h-[360px] overflow-auto rounded-xl py-2 font-mono text-[12.5px] leading-[1.75]">
      {lines.map((line, i) => (
        <div key={i} data-line={i} className={cn('viz-code-line relative flex pr-3', hot.has(i) && 'viz-code-hot', hot.size > 0 && !hot.has(i) && 'viz-code-cold')}>
          {hot.has(i) &&
            (i === first ? (
              <motion.span layoutId={`hl-${layoutKey}`} className="viz-code-bar absolute inset-y-0 left-0 w-full" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            ) : (
              <span className="viz-code-bar absolute inset-y-0 left-0 w-full" />
            ))}
          <span className="viz-code-no relative w-9 shrink-0 pr-3 text-right select-none">{hot.has(i) ? '▸' : i + 1}</span>
          <span className="relative whitespace-pre">
            {tokenize(line, lang).map((t, k) => (
              <span key={k} className={t.k ? `tok-${t.k}` : undefined}>
                {t.t}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The steps so far as a readable log; click one to jump there. */
function TraceLog({ frames, idx, onPick }: { frames: Frame[]; idx: number; onPick: (i: number) => void }) {
  const box = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`)
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight + el.clientHeight + 8, behavior: 'smooth' })
  }, [idx])
  return (
    <ol ref={box} className="viz-log max-h-[220px] space-y-0.5 overflow-auto rounded-xl p-1.5">
      {frames.slice(0, idx + 1).map((f, i) => (
        <li key={i} data-i={i}>
          <button
            type="button"
            onClick={() => onPick(i)}
            className={cn('flex w-full cursor-pointer gap-2 rounded-lg px-2 py-1 text-left text-[12px] leading-snug hover:!scale-100', i === idx ? 'bg-accent-brand/12 text-text-primary' : 'text-text-secondary hover:bg-bg-surface-3')}
          >
            <span className="w-6 shrink-0 text-right font-mono text-[10.5px] text-text-muted">{i + 1}</span>
            <span>{f.note}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function Ctl({ label, onClick, icon, disabled }: { label: string; onClick: () => void; icon: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled} className="viz-icon-btn !size-8 disabled:opacity-35">
      {icon}
    </button>
  )
}

/** A moment worth finding again on the timeline. */
export interface TimelineMark {
  at: number
  kind: 'call' | 'ret' | 'error' | 'output' | 'event'
  label: string
}

export interface FramePlayerProps {
  /** Stable id (layout animations). */
  id: string
  kicker?: string
  title: string
  blurb?: ReactNode
  frames: Frame[]
  error?: string | null
  /** Shown under the title: an input form, a sample picker… */
  header?: ReactNode
  /** The code panel for the current frame. */
  code: (frame: Frame | undefined) => ReactNode
  /** Above the code panel (language tabs). */
  codeTabs?: ReactNode
  /** Words for the roles, where the generic ones would mislead. */
  legend?: Partial<Record<Role, string>>
  /** Changing it starts again from the first step. */
  resetKey?: unknown
  /** Scroll-sync: a position 0–1 through the steps, set by the text beside the figure (null: off). */
  syncTo?: number | null
  /** Play by itself once in view (the chapters); off for the dry run. */
  autoplay?: boolean
  marks?: TimelineMark[]
  /** Under the stage: a banner such as "showing the first 3000 steps". */
  footnote?: ReactNode
  className?: string
}

export function FramePlayer({ id, kicker = 'Visualizer', title, blurb, frames, error, header, code, codeTabs, legend, resetKey, syncTo, autoplay = true, marks, footnote, className }: FramePlayerProps) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [focus, setFocus] = useState(false)
  const [log, setLog] = useState(false)
  const [stageW, setStageW] = useState(760)
  const stageRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // Figures play by themselves once they are in view, and hold still while the
  // reader hovers or focuses them, scrolls away, asks for less motion, or takes
  // the controls (after which only the controls move it).
  const still = useReducedMotion()
  const [hold, setHold] = useState(false)
  const [touched, setTouched] = useState(!autoplay)

  // A new input or a new run starts from the first step (adjusted during
  // render, not in an effect).
  const [seenKey, setSeenKey] = useState(resetKey)
  if (resetKey !== seenKey) {
    setSeenKey(resetKey)
    setIdx(0)
    setPlaying(false)
    setTouched(true)
  }

  const last = frames.length - 1
  const at = Math.max(0, Math.min(idx, last))
  const frame = frames[at]
  const running = playing && at < last && !(hold && !touched)

  useEffect(() => {
    const el = rootRef.current
    if (!el || still || touched || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [still, touched])

  // Scroll-sync: the paragraph in the middle of the screen picks the step.
  const [seen, setSeen] = useState<number | null | undefined>(syncTo)
  if (syncTo !== seen) {
    setSeen(syncTo)
    if (syncTo != null && last >= 0) {
      setPlaying(false)
      setIdx(Math.round(Math.max(0, Math.min(1, syncTo)) * last))
    }
  }

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, last)), 1000 / speed)
    return () => window.clearTimeout(t)
  }, [running, at, last, speed])

  // Arrays size their cells to the stage, so a long array still fits a phone.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setStageW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [focus])

  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(false)
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [focus])

  const stage: StageInfo = useMemo(() => ({ width: stageW, tick: at, prev: new Map((frames[at - 1]?.structures ?? []).map((s) => [s.id, s])) }), [stageW, at, frames])

  const go = (i: number) => {
    setTouched(true)
    setIdx(Math.max(0, Math.min(last, i)))
    setPlaying(false)
  }
  const toggle = () => {
    setTouched(true)
    setHold(false)
    if (at >= last) {
      setIdx(0)
      setPlaying(true)
    } else setPlaying(!(playing && at < last))
  }
  // Jump to the next / previous mark (calls, errors, output).
  const nextMark = (dir: 1 | -1) => {
    const list = (marks ?? []).map((m) => m.at).sort((a, b) => a - b)
    const target = dir > 0 ? list.find((m) => m > at) : [...list].reverse().find((m) => m < at)
    if (target !== undefined) go(target)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      toggle()
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault()
      go(at + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      e.preventDefault()
      go(at - 1)
    } else if (e.key === ']') nextMark(1)
    else if (e.key === '[') nextMark(-1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(last)
    else if (e.key === 'f') setFocus((f) => !f)
  }

  const onStage = frame?.structures.filter((s) => !SIDE.has(s.kind)) ?? []
  const side = frame?.structures.filter((s) => SIDE.has(s.kind)) ?? []
  // Call stack first, then variables, then output.
  side.sort((a, b) => ['calls', 'vars', 'output'].indexOf(a.kind) - ['calls', 'vars', 'output'].indexOf(b.kind))
  const roles = frame ? rolesIn(frame.structures) : []
  const pct = last > 0 ? (at / last) * 100 : 0

  const body = (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHold(false)}
      className={cn('viz-player card overflow-hidden p-0 outline-none', focus && 'viz-focus', className)}
      aria-label={`Animation: ${title}`}
    >
      <div className="viz-head border-b border-border px-4 pt-3 pb-3">
        <div className="flex items-start gap-3">
          <span className="viz-badge mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-0 text-[10.5px] font-semibold tracking-[0.14em] text-accent-brand uppercase">{kicker}</p>
            <p className="mb-0 font-display text-[15.5px] leading-snug font-semibold text-text-primary">{title}</p>
            {blurb && <div className="mt-0.5 mb-0 text-[12.5px] text-text-muted">{blurb}</div>}
          </div>
          <button type="button" onClick={() => setFocus((f) => !f)} className="viz-icon-btn" aria-label={focus ? 'Exit full screen' : 'Full screen'} title={focus ? 'Exit full screen (Esc)' : 'Full screen (F)'}>
            {focus ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
        {header}
      </div>

      <div className={cn('grid gap-0', focus ? 'xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]')}>
        <div className="flex min-w-0 flex-col border-border lg:border-r">
          <StageContext.Provider value={stage}>
            <div ref={stageRef} className={cn('viz-stage flex flex-1 flex-col justify-center gap-7 overflow-x-auto px-3 py-5 sm:px-4 sm:py-7', focus ? 'min-h-[48vh]' : 'min-h-[190px] sm:min-h-[250px]')}>
              {error ? (
                <p className="text-center text-[13px] text-state-error">{error}</p>
              ) : onStage.length ? (
                onStage.map((s) => <StructureView key={s.id} s={s} />)
              ) : frame ? (
                <p className="text-center text-[13px] text-text-muted">Nothing to draw on this step — see the variables beside it.</p>
              ) : null}
            </div>
          </StageContext.Provider>
          {frame && (
            <div className="viz-note border-t border-border px-4 py-3">
              <div className="flex gap-3">
                <span className="viz-step-chip mt-0.5 shrink-0 font-mono">{at + 1}</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={at} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="mb-0 min-h-[2.6em] flex-1 text-[14px] leading-relaxed text-text-primary">
                    {frame.note}
                  </motion.p>
                </AnimatePresence>
              </div>
              {roles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-10">
                  {roles.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                      <span className={cn('viz-legend-dot', roleClass(r))} /> {legend?.[r] ?? ROLE_LABEL[r]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {footnote && <div className="viz-footnote border-t border-border px-4 py-2 text-[12px] text-text-muted">{footnote}</div>}
        </div>

        <div className="viz-side flex min-w-0 flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">{codeTabs}</div>
            <button type="button" onClick={() => setLog((v) => !v)} className={cn('viz-icon-btn', log && 'viz-icon-btn-on')} aria-pressed={log} aria-label="Step log" title="Step log">
              <History />
            </button>
          </div>
          {code(frame)}
          {side.map((s) => (
            <StructureView key={s.id} s={s} />
          ))}
          {log && frames.length > 0 && (
            <div>
              <p className="viz-label !text-left">Step log</p>
              <TraceLog frames={frames} idx={at} onPick={go} />
            </div>
          )}
        </div>
      </div>

      <div className="viz-controls relative border-t border-border px-3 py-2.5 sm:px-4">
        <div className="viz-progress absolute inset-x-0 top-0 h-[2px]">
          <motion.div className="h-full bg-accent-brand" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-0.5">
            <Ctl label="Restart (Home)" onClick={() => go(0)} icon={<SkipBack />} />
            <Ctl label="Previous step (←)" onClick={() => go(at - 1)} icon={<ChevronLeft />} disabled={at <= 0} />
            <button type="button" onClick={toggle} className="viz-play mx-1 flex size-10 cursor-pointer items-center justify-center rounded-full" aria-label={running ? 'Pause' : 'Play'} title={running ? 'Pause (Space)' : 'Play (Space)'}>
              {running ? <Pause className="size-4" /> : at >= last && last > 0 ? <RotateCcw className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <Ctl label="Next step (→)" onClick={() => go(at + 1)} icon={<ChevronRight />} disabled={at >= last} />
            <Ctl label="Last step (End)" onClick={() => go(last)} icon={<SkipForward />} />
          </div>
          <div className="relative min-w-[120px] flex-1">
            {marks && last > 0 && (
              <div className="viz-marks pointer-events-none absolute inset-x-0 -top-1.5 h-1.5" aria-hidden="true">
                {marks.slice(0, 200).map((m, i) => (
                  <span key={i} className={cn('viz-mark absolute top-0 h-1.5 w-[2px] rounded-full', `viz-mark-${m.kind}`)} style={{ left: `${(m.at / last) * 100}%` }} title={m.label} />
                ))}
              </div>
            )}
            <input type="range" min={0} max={Math.max(0, last)} value={at} onChange={(e) => go(Number(e.target.value))} className="viz-scrub w-full" aria-label="Step" style={{ ['--pct' as string]: `${pct}%` }} />
          </div>
          <span className="viz-count font-mono text-[11px] text-text-muted tabular-nums">
            Step {frames.length ? at + 1 : 0} of {frames.length}
          </span>
          <div className="viz-tabs flex items-center gap-0.5 rounded-lg p-0.5" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s} className={cn('cursor-pointer rounded-md px-1.5 py-0.5 font-mono text-[10.5px] hover:!scale-100', speed === s ? 'viz-tab-on text-text-primary' : 'text-text-muted hover:text-text-primary')}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (!focus) return body
  return createPortal(
    <div className="viz-overlay fixed inset-0 z-[80] overflow-y-auto p-2 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && setFocus(false)}>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-[1500px]" data-player={id}>
        {body}
      </motion.div>
    </div>,
    document.body,
  )
}
