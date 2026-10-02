import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { arrKadane, arrTwoSum, arrWindowVar } from '@/learn/algorithms/arrays2'
import { arrDutch, arrMerge } from '@/learn/algorithms/arrays3'
import { CodePanel, StructureView } from '@/learn/engine/VizPlayer'
import { StageContext, type StageInfo } from '@/learn/engine/views/stage'
import type { Algorithm, Inputs, Lang, VarsState } from '@/learn/engine/types'

/**
 * The Learn module's animation engine, running on its own: real algorithms
 * traced on real input, each step lighting up its line of code with a
 * plain-language note. It plays itself through a short playlist, pauses while
 * hovered or off-screen, and hands control to the viewer when they click.
 */

interface Act {
  algo: Algorithm
  topic: string
  short: string
}

const PLAYLIST: Act[] = [
  { algo: arrKadane, topic: 'Dynamic programming', short: 'Kadane' },
  { algo: arrTwoSum, topic: 'Two pointers', short: 'Pair sum' },
  { algo: arrDutch, topic: 'Partitioning', short: 'Dutch flag' },
  { algo: arrWindowVar, topic: 'Sliding window', short: 'Window' },
  { algo: arrMerge, topic: 'Merging', short: 'Merge' },
]

const CODE_LANGS: { id: Lang; label: string }[] = [
  { id: 'pseudo', label: 'Pseudo' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
]

const STEP_MS = 1050
const HOLD_MS = 2400

function defaultInputs(algo: Algorithm): Inputs {
  const out: Inputs = {}
  for (const f of algo.inputs) {
    if (f.type === 'array') out[f.name] = f.default.split(/[\s,]+/).filter(Boolean).map(Number)
    else if (f.type === 'number') out[f.name] = Number(f.default)
    else out[f.name] = f.default
  }
  return out
}

function traceOf(algo: Algorithm) {
  try {
    return algo.run(defaultInputs(algo))
  } catch {
    return []
  }
}

export function AlgoTheater({ compact = false, className }: { compact?: boolean; className?: string }) {
  const reduce = useReducedMotion()
  const [act, setAct] = useState(0)
  const [at, setAt] = useState(0)
  const [lang, setLang] = useState<Lang>('pseudo')
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(true)
  const [stageW, setStageW] = useState(560)
  const root = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const { algo, topic } = PLAYLIST[act]
  const frames = useMemo(() => traceOf(algo), [algo])
  const last = Math.max(0, frames.length - 1)
  const frame = frames[Math.min(at, last)]
  const playing = !reduce && !userPaused && !hovered && visible

  // Advance one step at a time; hold on the last step, then roll to the next act.
  useEffect(() => {
    if (!playing || !frames.length) return
    const t = window.setTimeout(
      () => {
        if (at < last) setAt(at + 1)
        else {
          setAct((a) => (a + 1) % PLAYLIST.length)
          setAt(0)
        }
      },
      at < last ? STEP_MS : HOLD_MS,
    )
    return () => window.clearTimeout(t)
  }, [playing, at, last, frames.length])

  // Pause when scrolled away or the tab is hidden — no point animating unseen.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden), { threshold: 0.15 })
    io.observe(el)
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setStageW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stage: StageInfo = useMemo(
    () => ({ width: stageW, tick: at, prev: new Map((frames[at - 1]?.structures ?? []).map((s) => [s.id, s])) }),
    [stageW, at, frames],
  )

  const pick = (i: number) => {
    setAct(i)
    setAt(0)
  }
  const step = (d: number) => {
    setUserPaused(true)
    setAt((v) => Math.max(0, Math.min(last, v + d)))
  }

  // Range captions ("cur = 4") collide when two ranges share a cell; the
  // variable strip below shows the same values, so drop them here.
  const onStage =
    frame?.structures
      .filter((s) => s.kind !== 'vars' && s.kind !== 'output')
      .map((s) => (s.kind === 'array' && s.ranges ? { ...s, ranges: s.ranges.map(({ label: _label, ...r }) => r) } : s)) ?? []
  const vars = frame?.structures.find((s): s is VarsState => s.kind === 'vars')
  const pct = last > 0 ? (at / last) * 100 : 0

  return (
    <div
      ref={root}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'viz-player glass relative overflow-hidden !rounded-2xl text-left shadow-[0_40px_120px_-40px_rgb(139_92_246/0.55)]',
        className,
      )}
      aria-label={`Live animation: ${algo.title}`}
      role="region"
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-hairline/[0.07] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto hidden truncate rounded-md bg-hairline/[0.05] px-3 py-0.5 font-mono text-[11px] text-foreground-faint sm:block">
          nexora / learn / dsa / arrays
        </span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-success uppercase sm:ml-0">
          <span className={cn('size-1.5 rounded-full bg-success', playing && 'animate-pulse')} />
          {userPaused || hovered || reduce ? 'Paused' : 'Live'}
        </span>
      </div>

      {/* playlist */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-hairline/[0.07] px-3 py-2 [scrollbar-width:none]" role="tablist" aria-label="Algorithms">
        {PLAYLIST.map((p, i) => (
          <button
            key={p.algo.id}
            role="tab"
            aria-selected={i === act}
            onClick={() => pick(i)}
            className={cn(
              'relative shrink-0 cursor-pointer overflow-hidden rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              i === act ? 'bg-primary/15 text-foreground' : 'text-foreground-faint hover:text-foreground-dim',
            )}
          >
            {i === act && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-primary-bright to-accent"
                initial={false}
                animate={{ scaleX: pct / 100 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            )}
            {p.short}
          </button>
        ))}
      </div>

      <div className={cn('grid', !compact && 'lg:grid-cols-[1.45fr_1fr]')}>
        {/* stage */}
        <div className="viz-stage flex min-w-0 flex-col border-hairline/[0.07] lg:border-r">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
            <p className="truncate font-display text-[13.5px] font-semibold text-foreground">{algo.title}</p>
            <span className="shrink-0 text-[10px] font-semibold tracking-[0.14em] text-primary-bright uppercase">{topic}</span>
          </div>
          <div ref={stageRef} className={cn('flex flex-1 flex-col justify-center gap-4 px-3 py-4', compact ? 'min-h-[176px]' : 'min-h-[220px]')}>
            <StageContext.Provider value={stage}>
              {onStage.map((s) => (
                <StructureView key={s.id} s={s} />
              ))}
            </StageContext.Provider>
          </div>
          {vars && Object.keys(vars.vars).length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 px-3 pb-3" aria-label="Variables">
              {Object.entries(vars.vars).map(([k, v]) => {
                const changed = vars.changed?.includes(k)
                return (
                  <span
                    key={k}
                    className={cn(
                      'flex items-baseline gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors duration-300',
                      changed ? 'border-primary-bright/60 bg-primary/15 text-foreground' : 'border-hairline/[0.08] bg-bg-field text-foreground-dim',
                    )}
                  >
                    <span className="text-foreground-faint">{k}</span>
                    <motion.span key={String(v)} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-semibold">
                      {v === null ? '—' : String(v)}
                    </motion.span>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* code */}
        {!compact && (
          <div className="flex min-w-0 flex-col border-t border-hairline/[0.07] lg:border-t-0">
            <div className="flex gap-1 px-3 pt-2.5" role="tablist" aria-label="Code language">
              {CODE_LANGS.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={lang === l.id}
                  onClick={() => setLang(l.id)}
                  className={cn(
                    'cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
                    lang === l.id ? 'viz-tab-on text-foreground' : 'text-foreground-faint hover:text-foreground-dim',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="px-1.5 pb-2 [&_.viz-code]:max-h-[248px]">
              {frame && <CodePanel algo={algo} lang={algo.code[lang] ? lang : 'pseudo'} step={frame.step} />}
            </div>
          </div>
        )}
      </div>

      {/* narration + transport */}
      <div className="border-t border-hairline/[0.07] px-4 py-3">
        <div className={cn('relative overflow-hidden', compact ? 'h-[3.25rem]' : 'h-[2.75rem]')} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${act}-${at}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="line-clamp-2 text-[12.5px] leading-relaxed text-foreground-dim"
            >
              {frame?.note}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => step(-1)} aria-label="Previous step" className="viz-icon-btn !size-7">
            <ChevronLeft />
          </button>
          <button
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Play' : 'Pause'}
            className="viz-play flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg"
          >
            {userPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
          <button onClick={() => step(1)} aria-label="Next step" className="viz-icon-btn !size-7">
            <ChevronRight />
          </button>
          <div className="viz-progress relative mx-1 h-1.5 flex-1 overflow-hidden rounded-full">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-bright to-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10.5px] text-foreground-faint tabular-nums">
            {at + 1}/{last + 1}
          </span>
        </div>
      </div>
    </div>
  )
}
