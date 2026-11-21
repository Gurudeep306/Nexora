import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Play, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parsed } from './code'
import { CodeLines, FramePlayer, StructureView } from './FramePlayer'
import { LANGS, type Algorithm, type Frame, type Inputs, type Lang } from './types'
import { whatIfInputs } from '@/voice/scene/resolve'
import type { WhatIf } from '@/voice/scene/parse'
import { MirrorRun } from '@/voice/mirror/MirrorRun'

const LANG_KEY = 'nexora:learn-lang'

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

export function CodePanel({ algo, lang, step }: { algo: Algorithm; lang: Lang; step: string }) {
  const src = algo.code[lang] ?? algo.code.pseudo ?? ''
  const { lines, steps } = parsed(src)
  return <CodeLines lines={lines} hot={new Set(steps.get(step) ?? [])} lang={lang} layoutKey={algo.id} />
}

/**
 * The player every lesson uses. The algorithm is run once on the input to
 * record its frames; the player then steps through them, drawing each data
 * structure, lighting the code line (in whichever language is chosen) and
 * narrating what happens. Play, pause, step, scrub, change speed, open the
 * step log, go full screen, or change the input and run it again.
 */
export function VizPlayer({
  algo,
  className,
  initial,
  syncTo,
}: {
  algo: Algorithm
  className?: string
  initial?: Record<string, string>
  /** Scroll-sync: a position 0–1 through the steps, set by the text beside the figure (null: off). */
  syncTo?: number | null
}) {
  const defaults = useMemo(() => Object.fromEntries(algo.inputs.map((f) => [f.name, initial?.[f.name] ?? f.default])), [algo, initial])
  const [draft, setDraft] = useState<Record<string, string>>(defaults)
  const [applied, setApplied] = useState<Record<string, string>>(defaults)
  const [lang, setLangState] = useState<Lang>(readLang)

  const parsedInputs = useMemo(() => parseInputs(algo, applied).inputs ?? null, [algo, applied])
  const { frames, error } = useMemo((): { frames: Frame[]; error?: string } => {
    const p = parseInputs(algo, applied)
    if (!p.inputs) return { frames: [], error: p.error }
    try {
      return { frames: algo.run(p.inputs) }
    } catch (e) {
      return { frames: [], error: e instanceof Error ? e.message : 'Could not run this input.' }
    }
  }, [algo, applied])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }
  const codeLang = algo.code[lang] ? lang : 'pseudo'

  const header = (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        setApplied({ ...draft })
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
              setApplied(r)
            }}
            className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]"
            title="Random input"
          >
            <Shuffle className="size-3.5" /> Random
          </button>
        )}
      </div>
    </form>
  )

  const codeTabs = (
    <div className="viz-tabs flex min-w-0 gap-0.5 overflow-x-auto rounded-lg p-0.5 [scrollbar-width:none]">
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
  )

  return (
    <FramePlayer
      id={algo.id}
      title={algo.title}
      blurb={algo.blurb}
      frames={frames}
      error={error}
      header={header}
      codeTabs={codeTabs}
      code={(frame) => <CodePanel algo={algo} lang={codeLang} step={frame?.step ?? ''} />}
      legend={algo.legend}
      resetKey={applied}
      syncTo={syncTo}
      className={className}
      after={frames.length ? <MirrorRun sceneId={algo.id} title={algo.title} inputs={parsedInputs} frames={frames} /> : undefined}
      onWhatIf={(input: WhatIf) => {
        const r = whatIfInputs(algo.inputs, applied, input)
        if ('error' in r) return r
        // Try it first: an input this algorithm can't take is explained, not applied.
        const p = parseInputs(algo, r.raw)
        if (!p.inputs) return { error: `That input doesn’t work here — ${p.error}` }
        try {
          if (!algo.run(p.inputs).length) return { error: 'That input gives nothing to show.' }
        } catch (e) {
          return { error: `That input doesn’t work here — ${e instanceof Error ? e.message : 'it can’t run'}` }
        }
        setDraft(r.raw)
        setApplied(r.raw)
        return { say: r.say }
      }}
    />
  )
}

/** Re-exported for the pages that draw a single structure. */
export { StructureView }
