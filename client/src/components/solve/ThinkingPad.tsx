import { useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'

/* GET/POST /api/decomposition — one structured note per problem, autosaved */
interface Decomposition {
  approach: string
  brute_force: string
  optimization: string
  data_structures: string
  edge_cases: string
}

const FIELDS: { key: keyof Decomposition; label: string; hint: string }[] = [
  { key: 'approach', label: '01 · Understand', hint: 'Restate the problem. What is actually being asked? Key observation?' },
  { key: 'brute_force', label: '02 · Brute force', hint: 'The simplest correct idea, and its complexity.' },
  { key: 'optimization', label: '03 · Optimise', hint: 'What makes brute force slow — which insight removes the bottleneck?' },
  { key: 'data_structures', label: '04 · Data structures', hint: 'Arrays, maps, heaps, segment trees, DSU…' },
  { key: 'edge_cases', label: '05 · Edge cases', hint: 'n = 1, all equal, overflow, negatives, empty input…' },
]

const EMPTY: Decomposition = { approach: '', brute_force: '', optimization: '', data_structures: '', edge_cases: '' }

export function ThinkingPad({ problemId }: { problemId: number }) {
  const noteApi = useApi<{ note: Decomposition }>(
    () => api.get<{ note: Decomposition }>(`/api/decomposition/${problemId}`),
    [problemId],
  )
  const [note, setNote] = useState<Decomposition>(EMPTY)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (noteApi.data?.note) setNote({ ...EMPTY, ...noteApi.data.note })
  }, [noteApi.data])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const update = (key: keyof Decomposition, value: string) => {
    const next = { ...note, [key]: value }
    setNote(next)
    setState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      api
        .post('/api/decomposition', { problem_id: problemId, ...next })
        .then(() => setState('saved'))
        .catch(() => setState('error'))
    }, 700)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-foreground-dim">Decompose before you code — the best solvers write the plan first.</p>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-foreground-faint" role="status">
          {state === 'saving' && <><Loader2 className="size-3 animate-spin" aria-hidden="true" /> saving</>}
          {state === 'saved' && <><Check className="size-3 text-success" aria-hidden="true" /> saved</>}
          {state === 'error' && <span className="text-destructive">not saved</span>}
        </span>
      </div>
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="mb-1.5 block font-display text-[11px] tracking-wider text-primary-bright uppercase">{f.label}</span>
          <Textarea
            rows={3}
            value={note[f.key]}
            onChange={(e) => update(f.key, e.target.value)}
            placeholder={f.hint}
            className="font-mono text-xs"
          />
        </label>
      ))}
    </div>
  )
}
