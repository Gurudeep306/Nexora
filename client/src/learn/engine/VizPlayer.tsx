import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, History, Maximize2, Minimize2, Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parsed, tokenize } from './code'
import { LANGS, type Algorithm, type Frame, type Inputs, type Lang, type Structure } from './types'
import { ArrayView } from './views/ArrayView'
import { roleClass } from './views/format'
import { GridView, MeterView, OutputView, QueueView, StackView, VarsView } from './views/Others'
import { GraphView, HashView, ListView, TreeView } from './views/Linked'
import { ROLE_LABEL, StageContext, rolesIn, type StageInfo } from './views/stage'

const LANG_KEY = 'nexora:learn-lang'
const SPEEDS = [0.5, 1, 1.5, 2, 3]

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY) as Lang | null
    if (v && LANGS.some((l) => l.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'pseudo'
}

/** Parse the learner's text inputs into typed values, with friendly errors. */
function parseInputs(algo: Algorithm, raw: Record<string, string>): { inputs?: Inputs; error?: string } {
  const out: Inputs = {}
  for (const f of algo.inputs) {
    const text = (raw[f.name] ?? f.default).trim()
    if (f.type === 'array') {
      const parts = text.split(/[\s,]+/).filter(Boolean)
      const nums = parts.map(Number)
      if (!parts.length) return { error: `${f.label}: enter at least one number.` }
      if (nums.some((n) => !Number.isFinite(n))) return { error: `${f.label}: use numbers separated by spaces or commas.` }
      if (f.maxLen && nums.length > f.maxLen) return { error: `${f.label}: at most ${f.maxLen} values keep the animation readable.` }
      if (f.min != null && nums.some((n) => n < f.min!)) return { error: `${f.label}: values must be ≥ ${f.min}.` }
      if (f.max != null && nums.some((n) => n > f.max!)) return { error: `${f.label}: values must be ≤ ${f.max}.` }
      out[f.name] = nums
    } else if (f.type === 'number') {
      const n = Number(text)
      if (text === '' || !Number.isFinite(n)) return { error: `${f.label} must be a number.` }
      if (f.min != null && n < f.min) return { error: `${f.label} must be ≥ ${f.min}.` }
      if (f.max != null && n > f.max) return { error: `${f.label} must be ≤ ${f.max}.` }
      out[f.name] = n
    } else out[f.name] = text
  }
  return { inputs: out }
}

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
  }
}

export function CodePanel({ algo, lang, step }: { algo: Algorithm; lang: Lang; step: string }) {
  const src = algo.code[lang] ?? algo.code.pseudo ?? ''
  const { lines, steps } = parsed(src)
  const hot = new Set(steps.get(step) ?? [])
  const box = useRef<HTMLDivElement>(null)
  const first = Math.min(...[...hot])

  // Keep the active line in view — scroll the panel, never the page.
  useEffect(() => {
    const el = box.current
    if (!el || !Number.isFinite(first)) return
    const row = el.querySelector<HTMLElement>(`[data-line="${first}"]`)
    if (!row) return
    const top = row.offsetTop - el.clientHeight / 3
    el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [first, lang])

  return (
    <div ref={box} className="viz-code relative max-h-[360px] overflow-auto rounded-xl py-2 font-mono text-[12.5px] leading-[1.75]">
      {lines.map((line, i) => (
        <div key={i} data-line={i} className={cn('viz-code-line relative flex pr-3', hot.has(i) && 'viz-code-hot', hot.size > 0 && !hot.has(i) && 'viz-code-cold')}>
          {hot.has(i) &&
            (i === first ? (
              <motion.span layoutId={`hl-${algo.id}`} className="viz-code-bar absolute inset-y-0 left-0 w-full" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
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

/**
 * The player every lesson uses. The algorithm is run once on the input to
 * record its frames; the player then steps through them, drawing each data
 * structure, lighting the code line (in whichever language is chosen) and
 * narrating what happens. Play, pause, step, scrub, change speed, open the
 * step log, go full screen, or change the input and run it again.
 */
export function VizPlayer({ algo, className, initial }: { algo: Algorithm; className?: string; initial?: Record<string, string> }) {
  const defaults = useMemo(() => Object.fromEntries(algo.inputs.map((f) => [f.name, initial?.[f.name] ?? f.default])), [algo, initial])
  const [draft, setDraft] = useState<Record<string, string>>(defaults)
  const [applied, setApplied] = useState<Record<string, string>>(defaults)
  const [lang, setLangState] = useState<Lang>(readLang)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [focus, setFocus] = useState(false)
  const [log, setLog] = useState(false)
  const [stageW, setStageW] = useState(760)
  const stageRef = useRef<HTMLDivElement>(null)

  const { frames, error } = useMemo((): { frames: Frame[]; error?: string } => {
    const p = parseInputs(algo, applied)
    if (!p.inputs) return { frames: [], error: p.error }
    try {
      return { frames: algo.run(p.inputs) }
    } catch (e) {
      return { frames: [], error: e instanceof Error ? e.message : 'Could not run this input.' }
    }
  }, [algo, applied])

  const last = frames.length - 1
  const at = Math.max(0, Math.min(idx, last))
  const frame = frames[at]

  const running = playing && at < last
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

  const stage: StageInfo = useMemo(
    () => ({ width: stageW, tick: at, prev: new Map((frames[at - 1]?.structures ?? []).map((s) => [s.id, s])) }),
    [stageW, at, frames],
  )

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }

  const run = (next: Record<string, string>) => {
    setApplied(next)
    setIdx(0)
    setPlaying(false)
  }

  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(last, i)))
    setPlaying(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      if (at >= last) {
        setIdx(0)
        setPlaying(true)
      } else setPlaying(!running)
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault()
      go(at + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      e.preventDefault()
      go(at - 1)
    } else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(last)
    else if (e.key === 'f') setFocus((f) => !f)
  }

  const onStage = frame?.structures.filter((s) => s.kind !== 'vars' && s.kind !== 'output') ?? []
  const side = frame?.structures.filter((s) => s.kind === 'vars' || s.kind === 'output') ?? []
  const legend = frame ? rolesIn(frame.structures) : []
  const codeLang = algo.code[lang] ? lang : 'pseudo'
  const pct = last > 0 ? (at / last) * 100 : 0

  const body = (
    <div
      tabIndex={0}
      onKeyDown={onKey}
      className={cn('viz-player card overflow-hidden p-0 outline-none', focus && 'viz-focus', className)}
      aria-label={`Animation: ${algo.title}`}
    >
      {/* header */}
      <div className="viz-head border-b border-border px-4 pt-3 pb-3">
        <div className="flex items-start gap-3">
          <span className="viz-badge mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-0 text-[10.5px] font-semibold tracking-[0.14em] text-accent-brand uppercase">Visualizer</p>
            <p className="mb-0 font-display text-[15.5px] leading-snug font-semibold text-text-primary">{algo.title}</p>
            {algo.blurb && <p className="mt-0.5 mb-0 text-[12.5px] text-text-muted">{algo.blurb}</p>}
          </div>
          <button
            type="button"
            onClick={() => setFocus((f) => !f)}
            className="viz-icon-btn"
            aria-label={focus ? 'Exit full screen' : 'Full screen'}
            title={focus ? 'Exit full screen (Esc)' : 'Full screen (F)'}
          >
            {focus ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(draft)
          }}
        >
          {algo.inputs.map((f) => (
            <label key={f.name} className={cn('flex min-w-0 flex-col gap-1', f.type === 'array' && 'flex-1 basis-48')}>
              <span className="text-[10.5px] font-semibold tracking-wide text-text-muted uppercase">{f.label}</span>
              <input
                value={draft[f.name] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                title={f.hint}
                spellCheck={false}
                inputMode={f.type === 'string' ? 'text' : 'numeric'}
                className={cn('viz-input input-base !py-1.5 !text-[13px] font-mono', f.type === 'array' ? 'w-full' : 'w-20')}
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary inline-flex items-center gap-1.5 !px-3.5 !py-1.5 !text-[12.5px]">
              <Play className="size-3.5" /> Run
            </button>
            {algo.random && (
              <button
                type="button"
                onClick={() => {
                  const r = algo.random!()
                  setDraft(r)
                  run(r)
                }}
                className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]"
                title="Random input"
              >
                <Shuffle className="size-3.5" /> Random
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={cn('grid gap-0', focus ? 'xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]')}>
        {/* stage */}
        <div className="flex min-w-0 flex-col border-border lg:border-r">
          <StageContext.Provider value={stage}>
            <div ref={stageRef} className={cn('viz-stage flex flex-1 flex-col justify-center gap-7 overflow-x-auto px-3 py-5 sm:px-4 sm:py-7', focus ? 'min-h-[48vh]' : 'min-h-[190px] sm:min-h-[250px]')}>
              {error ? <p className="text-center text-[13px] text-state-error">{error}</p> : onStage.map((s) => <StructureView key={s.id} s={s} />)}
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
              {legend.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-10">
                  {legend.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                      <span className={cn('viz-legend-dot', roleClass(r))} /> {algo.legend?.[r] ?? ROLE_LABEL[r]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* code + variables */}
        <div className="viz-side flex min-w-0 flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <div className="viz-tabs flex min-w-0 flex-1 gap-0.5 overflow-x-auto rounded-lg p-0.5 [scrollbar-width:none]">
              {LANGS.filter((l) => algo.code[l.id]).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={cn('relative shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:!scale-100', codeLang === l.id ? 'text-text-primary' : 'text-text-muted hover:text-text-primary')}
                >
                  {codeLang === l.id && <motion.span layoutId={`lt-${algo.id}`} className="viz-tab-on absolute inset-0 rounded-md" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span className="relative">{l.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setLog((v) => !v)} className={cn('viz-icon-btn', log && 'viz-icon-btn-on')} aria-pressed={log} aria-label="Step log" title="Step log">
              <History />
            </button>
          </div>
          <CodePanel algo={algo} lang={codeLang} step={frame?.step ?? ''} />
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

      {/* controls */}
      <div className="viz-controls relative border-t border-border px-3 py-2.5 sm:px-4">
        <div className="viz-progress absolute inset-x-0 top-0 h-[2px]">
          <motion.div className="h-full bg-accent-brand" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-0.5">
            <Ctl label="Restart (Home)" onClick={() => go(0)} icon={<SkipBack />} />
            <Ctl label="Previous step (←)" onClick={() => go(at - 1)} icon={<ChevronLeft />} disabled={at <= 0} />
            <button
              type="button"
              onClick={() => {
                if (at >= last) {
                  setIdx(0)
                  setPlaying(true)
                } else setPlaying(!running)
              }}
              className="viz-play mx-1 flex size-10 cursor-pointer items-center justify-center rounded-full"
              aria-label={running ? 'Pause' : 'Play'}
              title={running ? 'Pause (Space)' : 'Play (Space)'}
            >
              {running ? <Pause className="size-4" /> : at >= last && last > 0 ? <RotateCcw className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <Ctl label="Next step (→)" onClick={() => go(at + 1)} icon={<ChevronRight />} disabled={at >= last} />
            <Ctl label="Last step (End)" onClick={() => go(last)} icon={<SkipForward />} />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, last)}
            value={at}
            onChange={(e) => go(Number(e.target.value))}
            className="viz-scrub min-w-[120px] flex-1"
            aria-label="Step"
            style={{ ['--pct' as string]: `${pct}%` }}
          />
          <span className="font-mono text-[11px] text-text-muted tabular-nums">
            {frames.length ? at + 1 : 0} / {frames.length}
          </span>
          <div className="viz-tabs flex items-center gap-0.5 rounded-lg p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn('cursor-pointer rounded-md px-1.5 py-0.5 font-mono text-[10.5px] hover:!scale-100', speed === s ? 'viz-tab-on text-text-primary' : 'text-text-muted hover:text-text-primary')}
              >
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
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-[1500px]">
        {body}
      </motion.div>
    </div>,
    document.body,
  )
}

function Ctl({ label, onClick, icon, disabled }: { label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled} className="viz-icon-btn !size-8 disabled:opacity-35">
      {icon}
    </button>
  )
}
