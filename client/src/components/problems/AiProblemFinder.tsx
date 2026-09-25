import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { PLATFORM_OPTIONS, type AiFindResponse } from './types'

const EXAMPLES = [
  'easy graph problems for a beginner',
  'hard Codeforces DP I have not solved yet',
  'problems where I count digits or sums of digits',
  'warm-up implementation problems under 1000',
]

export function AiProblemFinder({
  tags,
  onResults,
}: {
  tags: string[]
  onResults: (res: AiFindResponse) => void
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
      const res = await api.post<AiFindResponse>(
        '/api/ai/find-problems',
        { query: text, platforms: [...PLATFORM_OPTIONS], tags, limit: 12 },
        { timeoutMs: 90000 },
      )
      if (res.ok) onResults(res)
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
              Describe anything you want to practice — the AI understands the topic and hand-picks matching problems, not just title keywords.
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
            placeholder={'e.g. "tricky two-pointer problems on sorted arrays, medium difficulty"'}
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

        {busy && (
          <p className="flex items-center gap-2 text-xs text-foreground-faint">
            <span className="skeleton inline-block h-3 w-40" /> reading your request and scanning the library…
          </p>
        )}
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    </div>
  )
}
