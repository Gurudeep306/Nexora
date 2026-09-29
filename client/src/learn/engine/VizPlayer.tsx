import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parsed, tokenize } from './code'
import { LANGS, type Algorithm, type Frame, type Inputs, type Lang, type Structure } from './types'
import { ArrayView } from './views/ArrayView'
import { GridView, OutputView, QueueView, StackView, VarsView } from './views/Others'

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
      if (nums.some((n) => !Number.isFinite(n))) return { error: `${f.label}: use numbers separated by spaces or commas.` }
      if (f.maxLen && nums.length > f.maxLen) return { error: `${f.label}: at most ${f.maxLen} values keep the animation readable.` }
      if (f.min != null && nums.some((n) => n < f.min!)) return { error: `${f.label}: values must be ≥ ${f.min}.` }
      if (f.max != null && nums.some((n) => n > f.max!)) return { error: `${f.label}: values must be ≤ ${f.max}.` }
      out[f.name] = nums
    } else if (f.type === 'number') {
      const n = Number(text)
      if (!Number.isFinite(n)) return { error: `${f.label} must be a number.` }
      if (f.min != null && n < f.min) return { error: `${f.label} must be ≥ ${f.min}.` }
      if (f.max != null && n > f.max) return { error: `${f.label} must be ≤ ${f.max}.` }
      out[f.name] = n
    } else out[f.name] = text
  }
  return { inputs: out }
}

function StructureView({ s }: { s: Structure }) {
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
  }
}

function CodePanel({ algo, lang, step }: { algo: Algorithm; lang: Lang; step: string }) {
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
    <div ref={box} className="viz-code relative max-h-[340px] overflow-auto rounded-xl py-2 font-mono text-[12.5px] leading-[1.7]">
      {lines.map((line, i) => (
        <div key={i} data-line={i} className={cn('viz-code-line relative flex pr-3', hot.has(i) && 'viz-code-hot')}>
          {hot.has(i) &&
            (i === first ? (
              <motion.span layoutId={`hl-${algo.id}`} className="viz-code-bar absolute inset-y-0 left-0 w-full" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            ) : (
              <span className="viz-code-bar absolute inset-y-0 left-0 w-full" />
            ))}
          <span className="viz-code-no relative w-9 shrink-0 pr-3 text-right select-none">{i + 1}</span>
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

/**
 * The player every lesson uses. The algorithm is run once on the input to
 * record its frames; the player then steps through them, drawing each data
 * structure, lighting the code line (in whichever language is chosen) and
 * narrating what happens. Play, pause, step, scrub, change speed, or change
 * the input and run it again.
 */
export function VizPlayer({ algo, className, initial }: { algo: Algorithm; className?: string; initial?: Record<string, string> }) {
  const defaults = useMemo(() => Object.fromEntries(algo.inputs.map((f) => [f.name, initial?.[f.name] ?? f.default])), [algo, initial])
  const [draft, setDraft] = useState<Record<string, string>>(defaults)
  const [applied, setApplied] = useState<Record<string, string>>(defaults)
  const [lang, setLangState] = useState<Lang>(readLang)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const { frames, error } = useMemo((): { frames: Frame[]; error?: string } => {
    const p = parseInputs(algo, applied)
    if (!p.inputs) return { frames: [], error: p.error }
    try {
      return { frames: algo.run(p.inputs) }
    } catch (e) {
      return { frames: [], error: e instanceof Error ? e.message : 'Could not run this input.' }
    }
  }, [algo, applied])

  const frame = frames[Math.min(idx, frames.length - 1)]
  const last = frames.length - 1

  // Playing stops by itself at the last frame.
  const running = playing && idx < last
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, last)), 950 / speed)
    return () => window.clearTimeout(t)
  }, [running, idx, last, speed])

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

  const root = useRef<HTMLDivElement>(null)
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.key === ' ') {
      e.preventDefault()
      setPlaying(!running)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setIdx((i) => Math.min(i + 1, last))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setIdx((i) => Math.max(i - 1, 0))
    }
  }

  const stage = frame?.structures.filter((s) => s.kind !== 'vars' && s.kind !== 'output') ?? []
  const side = frame?.structures.filter((s) => s.kind === 'vars' || s.kind === 'output') ?? []

  return (
    <div ref={root} tabIndex={0} onKeyDown={onKey} className={cn('viz-player card outline-none', className)} aria-label={`Animation: ${algo.title}`}>
      {/* header: title + inputs */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-border px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="mb-0 text-[10.5px] font-semibold tracking-[0.12em] text-accent-brand uppercase">Visualizer</p>
          <p className="mb-0 font-display text-[15px] font-semibold text-text-primary">{algo.title}</p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(draft)
          }}
        >
          {algo.inputs.map((f) => (
            <label key={f.name} className="flex flex-col gap-1">
              <span className="text-[10.5px] font-medium text-text-muted">{f.label}</span>
              <input
                value={draft[f.name] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                title={f.hint}
                spellCheck={false}
                className={cn('input-base !py-1.5 !text-[12.5px] font-mono', f.type === 'array' ? 'w-52' : 'w-20')}
              />
            </label>
          ))}
          <button type="submit" className="btn-primary !px-3 !py-1.5 !text-[12.5px]">
            Run
          </button>
          {algo.random && (
            <button
              type="button"
              onClick={() => {
                const r = algo.random!()
                setDraft(r)
                run(r)
              }}
              className="btn-secondary !px-2.5 !py-1.5"
              aria-label="Random input"
              title="Random input"
            >
              <Shuffle className="size-3.5" />
            </button>
          )}
        </form>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* stage */}
        <div className="flex min-w-0 flex-col border-border lg:border-r">
          <div className="viz-stage flex min-h-[230px] flex-1 flex-col justify-center gap-6 overflow-x-auto px-4 py-6">
            {error ? (
              <p className="text-center text-[13px] text-state-error">{error}</p>
            ) : (
              stage.map((s) => <StructureView key={s.id} s={s} />)
            )}
          </div>
          {frame && (
            <div className="viz-note border-t border-border px-4 py-3">
              <motion.p key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-0 text-[13.5px] leading-relaxed text-text-primary">
                {frame.note}
              </motion.p>
            </div>
          )}
        </div>

        {/* code + variables */}
        <div className="flex min-w-0 flex-col gap-3 p-3">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {LANGS.filter((l) => algo.code[l.id]).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:!scale-100',
                  (algo.code[lang] ? lang : 'pseudo') === l.id ? 'bg-accent-brand/15 text-accent-brand' : 'text-text-muted hover:bg-bg-surface-3 hover:text-text-primary',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <CodePanel algo={algo} lang={algo.code[lang] ? lang : 'pseudo'} step={frame?.step ?? ''} />
          {side.map((s) => (
            <StructureView key={s.id} s={s} />
          ))}
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Ctl label="Restart" onClick={() => { setIdx(0); setPlaying(false) }} icon={<SkipBack />} />
          <Ctl label="Previous step" onClick={() => setIdx((i) => Math.max(0, i - 1))} icon={<ChevronLeft />} />
          <button
            type="button"
            onClick={() => {
              if (idx >= last) {
                setIdx(0)
                setPlaying(true)
              } else setPlaying(!running)
            }}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-accent-brand text-on-accent-brand shadow-md hover:!scale-105"
            aria-label={running ? 'Pause' : 'Play'}
          >
            {running ? <Pause className="size-4" /> : idx >= last && last > 0 ? <RotateCcw className="size-4" /> : <Play className="size-4 translate-x-px" />}
          </button>
          <Ctl label="Next step" onClick={() => setIdx((i) => Math.min(last, i + 1))} icon={<ChevronRight />} />
          <Ctl label="Last step" onClick={() => { setIdx(last); setPlaying(false) }} icon={<SkipForward />} />
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, last)}
          value={Math.min(idx, Math.max(0, last))}
          onChange={(e) => {
            setIdx(Number(e.target.value))
            setPlaying(false)
          }}
          className="viz-scrub min-w-[120px] flex-1"
          aria-label="Step"
        />
        <span className="font-mono text-[11px] text-text-muted tabular-nums">
          {frames.length ? idx + 1 : 0}/{frames.length}
        </span>
        <div className="flex items-center gap-0.5 rounded-lg bg-bg-surface-2 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn('cursor-pointer rounded-md px-1.5 py-0.5 font-mono text-[10.5px] hover:!scale-100', speed === s ? 'bg-bg-surface-3 text-text-primary' : 'text-text-muted')}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Ctl({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:!scale-100 hover:bg-bg-surface-3 hover:text-text-primary [&_svg]:size-4"
    >
      {icon}
    </button>
  )
}
