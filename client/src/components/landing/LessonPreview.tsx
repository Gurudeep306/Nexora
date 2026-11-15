import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'

/**
 * The hero's product shot, live: a binary search finding 23 in three looks,
 * the way a NexoraGuru lesson plays — the array, the pointers, the line of
 * code running and a sentence that explains the step. Pauses on hover and
 * focus; under reduced motion it waits for the step buttons.
 */
const A = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
const TARGET = 23
const CODE = ['lo, hi = 0, n − 1', 'while lo ≤ hi:', '    mid = (lo + hi) // 2', '    if a[mid] == x: return mid', '    if a[mid] < x: lo = mid + 1', '    else: hi = mid − 1']
type Step = { lo: number; hi: number; mid: number | null; line: number; text: string; found?: boolean }
const STEPS: Step[] = [
  { lo: 0, hi: 9, mid: null, line: 0, text: 'Find 23 in a sorted list of ten numbers. Start with the whole list.' },
  { lo: 0, hi: 9, mid: 4, line: 2, text: 'Look at the middle: 16.' },
  { lo: 5, hi: 9, mid: 4, line: 4, text: '16 is smaller than 23, so 23 can only be to its right. Half the list is gone.' },
  { lo: 5, hi: 9, mid: 7, line: 2, text: 'The new middle is 56.' },
  { lo: 5, hi: 6, mid: 7, line: 5, text: '56 is bigger than 23, so drop everything from 56 onwards.' },
  { lo: 5, hi: 6, mid: 5, line: 2, text: 'The new middle is 23.' },
  { lo: 5, hi: 6, mid: 5, line: 3, text: 'Found in three looks instead of ten. That is binary search.', found: true },
]

export function LessonPreview() {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (still || paused) return
    const t = setTimeout(() => setI((x) => (x + 1) % STEPS.length), i === STEPS.length - 1 ? 3200 : 1900)
    return () => clearTimeout(t)
  }, [i, paused, still])
  const s = STEPS[i]

  return (
    <figure
      className="lp-card m-0 overflow-hidden rounded-2xl text-left"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-label="A lesson playing: binary search finds 23 in a sorted list"
    >
      <div className="flex items-center gap-2 border-b border-[var(--lp-line)] px-4 py-3">
        <span className="caption-4 lp-dim">Learn</span>
        <span className="caption-5 lp-muted">/</span>
        <span className="caption-4 lp-dim">Binary search</span>
        <span className="caption-5 lp-muted ml-auto tabular-nums">
          Step {i + 1} of {STEPS.length}
        </span>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          {/* the array and its pointers */}
          <div className="grid grid-cols-10 gap-1" role="list" aria-label="The sorted list">
            {A.map((v, k) => {
              const out = k < s.lo || k > s.hi
              return (
                <div key={k} role="listitem" className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'lp-cell lp-mono body-5 flex aspect-square w-full items-center justify-center rounded-md tabular-nums',
                      out && 'is-out',
                      s.mid === k && !s.found && 'is-mid',
                      s.found && k === s.mid && 'is-found',
                    )}
                  >
                    {v}
                  </div>
                  <span className="lp-mono caption-5 lp-muted h-4 tabular-nums">{k === s.mid ? 'mid' : k === s.lo ? 'lo' : k === s.hi ? 'hi' : ''}</span>
                </div>
              )
            })}
          </div>
          <p className="body-6 lp-dim mt-4 min-h-12" aria-live="polite">
            {s.text}
          </p>
        </div>

        {/* the code, with the running line lit */}
        <pre className="lp-mono caption-5 m-0 hidden rounded-lg border border-[var(--lp-line)] bg-[var(--lp-bg)] p-3 md:block" aria-label="The code">
          {CODE.map((line, k) => (
            <div key={k} className={cn('lp-code-line lp-muted rounded px-2 py-0.5 whitespace-pre', k === s.line && 'is-on')}>
              {line.replace('x', String(TARGET))}
            </div>
          ))}
        </pre>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--lp-line)] px-4 py-3">
        <button type="button" className="lp-btn lp-btn-ghost button-sm !px-2" onClick={() => setI((x) => (x - 1 + STEPS.length) % STEPS.length)} aria-label="Previous step">
          <Icon name="play" className="size-4 rotate-180" aria-hidden />
        </button>
        <button type="button" className="lp-btn lp-btn-ghost button-sm !px-2" onClick={() => setI((x) => (x + 1) % STEPS.length)} aria-label="Next step">
          <Icon name="play" className="size-4" aria-hidden />
        </button>
        <div className="ml-2 flex flex-1 gap-1" aria-hidden="true">
          {STEPS.map((_, k) => (
            <span key={k} className={cn('h-1 flex-1 rounded-full transition-colors duration-500', k <= i ? 'bg-[var(--lp-text)]' : 'bg-[var(--lp-line-strong)]')} />
          ))}
        </div>
      </div>
    </figure>
  )
}
