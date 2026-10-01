import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Button, SearchInput, useToast } from '@/components/ui'
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
    <div className="card-neon relative overflow-hidden p-4 sm:p-5">
      {/* ambient accent glow */}
      <div
        className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/18 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-secondary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4">
        {/* header */}
        <div className="flex items-start gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-bright ring-1 ring-primary/25">
            <Sparkles className="size-5" aria-hidden="true" />
            <span
              className="absolute inset-0 rounded-xl ring-1 ring-primary/40 animate-pulse-glow"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                AI Problem Finder
              </h2>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] text-primary-bright uppercase">
                Semantic
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-foreground-faint">
              Describe anything you want to practice — the AI understands the topic and
              hand-picks matching problems, not just title keywords.
            </p>
          </div>
        </div>

        {/* search row */}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            void run(query)
          }}
        >
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder={'e.g. "tricky two-pointer problems on sorted arrays, medium difficulty"'}
            aria-label="Describe the problems you want"
            containerClassName="flex-1"
            className="text-[13px]"
          />
          <Button type="submit" variant="primary" loading={busy} disabled={!query.trim()} className="shrink-0 sm:px-5">
            {!busy && <Wand2 className="size-4" aria-hidden="true" />} Find problems
          </Button>
        </form>

        {/* busy progress line */}
        {busy && (
          <div className="flex items-center gap-2.5">
            <span className="skeleton h-1 flex-1 overflow-hidden rounded-full" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-[11px] text-foreground-faint">
              <span className="size-1.5 animate-pulse rounded-full bg-primary-bright" />
              reading your request and scanning the library…
            </span>
          </div>
        )}

        {/* example chips */}
        {!busy && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] text-foreground-faint/70 uppercase">
              Try one
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex)
                    void run(ex)
                  }}
                  className="group/chip flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[11.5px] text-foreground-dim transition-all duration-200 hover:-translate-y-px hover:border-primary/50 hover:bg-primary/10 hover:text-primary-bright hover:shadow-[0_2px_12px_-4px_var(--color-accent-brand)] active:translate-y-0"
                >
                  <Sparkles
                    className="size-3 shrink-0 text-foreground-faint transition-colors group-hover/chip:text-primary-bright"
                    aria-hidden="true"
                  />
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
