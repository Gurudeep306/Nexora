import type { ReactNode } from 'react'
import type { useStepper } from './useStepper'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'

export function Player({ label, stepper, children }: { label: string; stepper: ReturnType<typeof useStepper>; children: ReactNode }) {
  const { i, setI, pause, count } = stepper
  return (
    <figure className="m-0 text-left" aria-label={label} {...pause}>
      {children}
      <div className="mt-8 flex items-center gap-2">
        <button type="button" className="ed-icon-btn" onClick={() => setI((x) => (x - 1 + count) % count)} aria-label="Previous step">
          <Icon name="play" className="size-4 rotate-180" aria-hidden />
        </button>
        <button type="button" className="ed-icon-btn" onClick={() => setI((x) => (x + 1) % count)} aria-label="Next step">
          <Icon name="play" className="size-4" aria-hidden />
        </button>
        <div className="ml-2 flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: count }, (_, k) => (
            <span key={k} className={cn('lp-step h-0.5 flex-1', k <= i && 'is-on')} />
          ))}
        </div>
        <span className="ed-caption ed-muted ml-3 tabular-nums">
          Step {i + 1} of {count}
        </span>
      </div>
    </figure>
  )
}

/** The sentence under every frame: what just happened, and why. */
export function Narration({ children }: { children: ReactNode }) {
  return (
    <p className="ed-body mt-6 min-h-[3lh]" aria-live="polite">
      {children}
    </p>
  )
}
