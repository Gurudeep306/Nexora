import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { NgConcept } from './concepts/engine'

/**
 * Interactive NexoraGuru logo concept (round 3). Not wired into the app yet;
 * see docs/brand/concepts-v3/preview.html to compare the four concepts.
 *
 * The DOM engine is lazy-loaded, so pages that never show the mark pay nothing.
 * Colours follow the theme through --ng-c1 (accent), --ng-c2, --ng-c3, --ng-ink.
 */
export function NgConceptMark({
  concept,
  size = 32,
  animate,
  className,
}: {
  concept: NgConcept
  size?: number
  /** false → static mark (default: animated above 24 px; reduced motion is always static). */
  animate?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    void import('./concepts/engine').then(({ mountNgMark }) => {
      if (!cancelled) cleanup = mountNgMark(host, concept, { size, animate })
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [concept, size, animate])
  return <span ref={ref} aria-hidden="true" className={cn('ng-mark', className)} style={{ width: size, height: size }} />
}
