/*
  Dry run → "Explain this step": the AI (whatever model Admin → AI models
  picks for the code coach — Qwen when chosen) puts the step on screen into
  words. Its facts come only from the tracer's record of the real run: the
  line, the values before and after, the output so far, the steps before.
  Shown only when an AI is set up; the dry run itself never needs it.
*/
import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { agentTask } from '@/lib/agent'
import { Markdown } from '@/learn/md'
import { sceneById } from '@/voice/scene/active'
import { valuesAt } from '@/voice/scene/resolve'
import type { DryFrame } from './toFrames'

const show = (v: Record<string, unknown>) =>
  Object.entries(v)
    .filter(([k]) => /^[A-Za-z_][\w.[\]]*$/.test(k))
    .slice(0, 24)
    .map(([k, x]) => `${k} = ${Array.isArray(x) ? `[${x.slice(0, 20).join(', ')}${x.length > 20 ? ', …' : ''}]` : String(x)}`)
    .join(', ')

export function StepExplain({ frames, code, language, stdout }: { frames: DryFrame[]; code: string; language: string; stdout: string }) {
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<{ step: number; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api
      .get<{ configured: boolean }>('/api/agent/status')
      .then((r) => live && setReady(!!r.configured))
      .catch(() => live && setReady(false))
    return () => {
      live = false
    }
  }, [])

  if (!ready || !frames.length) return null

  const explain = async () => {
    const at = Math.max(0, Math.min(frames.length - 1, sceneById('dryrun')?.at() ?? 0))
    const f = frames[at]
    const lines = code.split('\n')
    const recent = frames
      .slice(Math.max(0, at - 6), at)
      .map((x, k) => `step ${at - Math.min(at, 6) + k + 1}: line ${x.line}${x.note ? ` (${x.note})` : ''}`)
      .join('\n')
    setBusy(true)
    setError(null)
    try {
      const text = await agentTask<string>('dry_explain', {
        code: lines.map((l, i) => `${String(i + 1).padStart(3)}| ${l}`).join('\n'),
        language,
        step: at + 1,
        total: frames.length,
        line: f.line,
        lineText: lines[f.line - 1] ?? '',
        note: f.note ?? '',
        vars: show(valuesAt(f)),
        prev: at > 0 ? show(valuesAt(frames[at - 1])) : '(start)',
        output: stdout.slice(0, f.out).slice(-500),
        recent,
      })
      setAnswer({ step: at + 1, text })
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'The AI could not explain this step just now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void explain()} disabled={busy} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
          Explain this step
        </button>
        <span className="text-[12px] text-text-muted">The AI explains the step on screen, using only what your run actually did.</span>
      </div>
      {error && <p className="m-0 text-[12.5px] text-state-error">{error}</p>}
      {answer && (
        <div className="rounded-lg border border-border px-3 py-2 text-[13.5px] leading-relaxed" aria-live="polite">
          <p className="m-0 mb-1 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Step {answer.step}</p>
          <Markdown md={answer.text} />
        </div>
      )}
    </div>
  )
}
