import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Width of the reading area at which notes move out into the margin. */
const MARGIN_AT = 1180

/**
 * A note beside the text, as in Distill and Tufte: in the right margin when
 * the reading area is wide enough, otherwise a small "note" marker in the
 * line of text that opens on tap. Either way it is a `note` (not a landmark),
 * so it never nests a complementary region inside the page.
 */
export function Sidenote({ label = 'Note', tone, children }: { label?: string; tone?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const host = ref.current?.closest('.nr-main') as HTMLElement | null
    if (!host || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= MARGIN_AT))
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} role="note" aria-label={label} className={cn('nr-sidenote', wide ? 'is-margin' : 'is-inline')} data-tone={tone}>
      {wide ? (
        <>
          <span className="nr-sidenote-label">{label}</span>
          <div className="nr-sidenote-body">{children}</div>
        </>
      ) : (
        <details>
          <summary>
            <span className="nr-sidenote-mark" aria-hidden="true">
              ✱
            </span>
            {label}
          </summary>
          <div className="nr-sidenote-body">{children}</div>
        </details>
      )}
    </div>
  )
}
