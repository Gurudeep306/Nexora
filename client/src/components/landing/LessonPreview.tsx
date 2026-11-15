import './landing.css'
import { cn } from '@/lib/utils'
import { Narration, Player } from './player'
import { useStepper } from './useStepper'

/**
 * Binary search finding 23 in three looks, the way a NexoraGuru lesson
 * plays: the array, the pointers, the line of code running and a sentence
 * that explains the step.
 */
const A = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
const CODE = ['lo, hi = 0, n − 1', 'while lo ≤ hi:', '    mid = (lo + hi) // 2', '    if a[mid] == 23: return mid', '    if a[mid] < 23: lo = mid + 1', '    else: hi = mid − 1']
type Step = { lo: number; hi: number; mid: number | null; line: number; text: string; found?: boolean }
const STEPS: Step[] = [
  { lo: 0, hi: 9, mid: null, line: 0, text: 'Somewhere in ten sorted numbers hides a 23. Begin with all of them in view.' },
  { lo: 0, hi: 9, mid: 4, line: 2, text: 'Don’t start at the edge. Look straight at the middle: 16.' },
  { lo: 5, hi: 9, mid: 4, line: 4, text: '16 is too small, and so is everything to its left. Half the list vanishes in one glance.' },
  { lo: 5, hi: 9, mid: 7, line: 2, text: 'A new middle in what is left: 56.' },
  { lo: 5, hi: 6, mid: 7, line: 5, text: '56 overshoots. Everything from 56 onwards goes too.' },
  { lo: 5, hi: 6, mid: 5, line: 2, text: 'Two numbers remain. The middle is 23.' },
  { lo: 5, hi: 6, mid: 5, line: 3, text: 'Found in three looks, not ten. On a million numbers it would take twenty.', found: true },
]

export function LessonPreview() {
  const stepper = useStepper(STEPS.length)
  const s = STEPS[stepper.i]
  return (
    <Player label="A lesson playing: binary search finds 23 in a sorted list" stepper={stepper}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="grid grid-cols-10 gap-1 sm:gap-2" role="list" aria-label="The sorted list">
            {A.map((v, k) => {
              const out = k < s.lo || k > s.hi
              return (
                <div key={k} role="listitem" className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'lp-cell flex aspect-square w-full items-center justify-center rounded-lg text-[13px] tabular-nums sm:rounded-xl sm:text-base',
                      out && 'is-out',
                      s.mid === k && !s.found && 'is-mid',
                      s.found && k === s.mid && 'is-found',
                    )}
                  >
                    {v}
                  </div>
                  <span className="ed-mono ed-muted h-4 text-[11px] tabular-nums">{k === s.mid ? 'mid' : k === s.lo ? 'lo' : k === s.hi ? 'hi' : ''}</span>
                </div>
              )
            })}
          </div>
          <Narration>{s.text}</Narration>
        </div>
        <pre className="lp-code m-0 hidden rounded-xl p-3 text-[13px] leading-6 lg:block" aria-label="The code">
          {CODE.map((line, k) => (
            <div key={k} className={cn('lp-code-line rounded-md px-2 whitespace-pre', k === s.line && 'is-on')}>
              {line}
            </div>
          ))}
        </pre>
      </div>
    </Player>
  )
}
