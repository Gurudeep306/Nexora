import { useState } from 'react'
import { Sparkles, Wand2, X } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { DIFFICULTY_BANDS, PLATFORM_OPTIONS, type DifficultyBandId } from './types'

export interface AiProblemFilters {
  platform: string
  difficulty: DifficultyBandId | 'all'
  tags: string[]
  search: string
  status: 'all' | 'solved' | 'attempted' | 'unsolved'
  sort: 'rating' | 'title' | 'id'
  summary: string
}

const EXAMPLES = [
  'easy graph problems for a beginner',
  'hard Codeforces DP I have not solved yet',
  'medium string problems around rating 1400',
  'math puzzles to warm up',
]

export function AiProblemFinder({
  tags,
  onApply,
  summary,
  onClearSummary,
}: {
  tags: string[]
  onApply: (filters: AiProblemFilters) => void
  summary: string | null
  onClearSummary: () => void
}) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const run = async (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ ok: boolean; filters?: AiProblemFilters; error?: string }>(
        '/api/ai/problem-search',
        {
          query: text,
          platforms: [...PLATFORM_OPTIONS],
          tags,
          bands: DIFFICULTY_BANDS.map((b) => b.id),
        },
        { timeoutMs: 60000 },
      )
      if (res.ok && res.filters) onApply(res.filters)
      else throw new Error(res.error || 'AI search failed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined
      setError(msg ?? 'AI search failed — check your connection and try again.')
      toast.error('AI search failed', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-neon relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-bright">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">AI Problem Finder</div>
            <div className="text-[11px] text-foreground-faint">
              Describe what you want to practice — the AI sets the filters and finds the problems for you.
            </div>
          </div>
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            void run(query)
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'e.g. "medium shortest-path problems on Codeforces I haven\u2019t solved yet"'}
            aria-label="Describe the problems you want"
            className="flex-1"
          />
          <Button type="submit" variant="primary" loading={busy} className="shrink-0">
            {!busy && <Wand2 className="size-4" aria-hidden="true" />} Find problems
          </Button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => {
                setQuery(ex)
                void run(ex)
              }}
              className="cursor-pointer rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground-dim transition-colors hover:border-primary/60 hover:text-primary-bright disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <div className="text-xs text-destructive">{error}</div>}

        {summary && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary-bright">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{summary}</span>
            <button
              onClick={onClearSummary}
              aria-label="Clear AI filters"
              title="Clear AI filters"
              className="cursor-pointer rounded p-0.5 transition-colors hover:bg-primary/20"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
