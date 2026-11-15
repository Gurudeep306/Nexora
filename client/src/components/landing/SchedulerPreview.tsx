import { cn } from '@/lib/utils'
import { Narration, Player } from './player'
import { useStepper } from './useStepper'

/**
 * Round-robin CPU scheduling with a two-tick slice: three jobs, one CPU.
 * The Gantt strip fills slice by slice, the ready queue rotates, and each
 * job's remaining work drains until it leaves.
 */
const JOBS = [
  { id: 'P1', burst: 5 },
  { id: 'P2', burst: 3 },
  { id: 'P3', burst: 1 },
]
const TOTAL = 9
type Slice = { job: string; from: number; to: number }
type Step = { slices: Slice[]; queue: string[]; left: Record<string, number>; text: string; done?: boolean }
const STEPS: Step[] = [
  { slices: [], queue: ['P1', 'P2', 'P3'], left: { P1: 5, P2: 3, P3: 1 }, text: 'Three jobs, one CPU. The rule: nobody keeps it for more than two ticks at a time.' },
  { slices: [{ job: 'P1', from: 0, to: 2 }], queue: ['P2', 'P3', 'P1'], left: { P1: 3, P2: 3, P3: 1 }, text: 'P1 runs for its two ticks, then walks to the back of the line, still unfinished.' },
  { slices: [{ job: 'P2', from: 2, to: 4 }], queue: ['P3', 'P1', 'P2'], left: { P1: 3, P2: 1, P3: 1 }, text: 'P2 gets the same two ticks. Fairness is the whole point.' },
  { slices: [{ job: 'P3', from: 4, to: 5 }], queue: ['P1', 'P2'], left: { P1: 3, P2: 1, P3: 0 }, text: 'P3 needs a single tick. It finishes early and hands the CPU on.' },
  { slices: [{ job: 'P1', from: 5, to: 7 }], queue: ['P2', 'P1'], left: { P1: 1, P2: 1, P3: 0 }, text: 'Back to P1 for another slice.' },
  { slices: [{ job: 'P2', from: 7, to: 8 }], queue: ['P1'], left: { P1: 1, P2: 0, P3: 0 }, text: 'P2 finishes its last tick and leaves.' },
  { slices: [{ job: 'P1', from: 8, to: 9 }], queue: [], left: { P1: 0, P2: 0, P3: 0 }, text: 'Nine ticks, three jobs, no one starved. That is round-robin: a busy CPU shared one slice at a time.', done: true },
]
const TONE: Record<string, string> = { P1: 'lp-job-1', P2: 'lp-job-2', P3: 'lp-job-3' }

export function SchedulerPreview() {
  const stepper = useStepper(STEPS.length)
  const s = STEPS[stepper.i]
  const slices = STEPS.slice(0, stepper.i + 1).flatMap((x) => x.slices)
  const running = s.slices[0]?.job
  return (
    <Player label="A lesson playing: round-robin scheduling shares one CPU between three jobs" stepper={stepper}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
        <div className="min-w-0">
          <p className="ed-label ed-muted">CPU timeline</p>
          <div className="lp-gantt mt-3" style={{ gridTemplateColumns: `repeat(${TOTAL}, minmax(0, 1fr))` }}>
            {slices.map((sl, k) => (
              <div key={k} className={cn('lp-slice', TONE[sl.job], k === slices.length - 1 && 'is-new')} style={{ gridColumn: `${sl.from + 1} / ${sl.to + 1}` }}>
                {sl.job}
              </div>
            ))}
          </div>
          <div className="ed-mono ed-muted mt-1 grid text-[11px] tabular-nums" style={{ gridTemplateColumns: `repeat(${TOTAL}, minmax(0, 1fr))` }} aria-hidden="true">
            {Array.from({ length: TOTAL }, (_, k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
          <Narration>{s.text}</Narration>
        </div>
        <div className="grid gap-6">
          <div>
            <p className="ed-label ed-muted">Work left</p>
            <ul className="mt-3 grid list-none gap-2 p-0">
              {JOBS.map((j) => (
                <li key={j.id} className="flex items-center gap-3">
                  <span className={cn('ed-mono w-6 text-[13px]', running === j.id ? 'text-[var(--ed-ink)]' : 'ed-muted')}>{j.id}</span>
                  <span className="flex flex-1 gap-1" aria-label={`${s.left[j.id]} of ${j.burst} ticks left`}>
                    {Array.from({ length: j.burst }, (_, k) => (
                      <span key={k} className={cn('lp-tick', TONE[j.id], k >= s.left[j.id] && 'is-spent')} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="ed-label ed-muted">Ready queue</p>
            <p className="ed-mono mt-3 min-h-6 text-[13px]">{s.queue.length ? s.queue.join('  →  ') : s.done ? 'empty — all done' : ''}</p>
          </div>
        </div>
      </div>
    </Player>
  )
}
