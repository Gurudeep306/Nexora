import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { OutlineItem } from './outline'

/**
 * "On this page": the lesson's headings, with a clay tick that slides to the
 * section being read (the scroll spy's `active` id).
 */
export function Outline({ items, active }: { items: OutlineItem[]; active: string | null }) {
  const list = useRef<HTMLOListElement>(null)
  const [tick, setTick] = useState<{ top: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const ol = list.current
    if (!ol || !active) return
    const a = ol.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`)
    if (a) setTick({ top: a.offsetTop, height: a.offsetHeight })
  }, [active, items])

  if (items.length < 2) return null
  return (
    <>
      <p className="nr-toc-head">On this page</p>
      <div className="nr-toc-wrap">
        {tick && <span className="nr-toc-tick" aria-hidden="true" style={{ transform: `translateY(${tick.top}px)`, height: tick.height }} />}
        <ol ref={list} className="nr-toc-list">
        {items.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && 'is-sub')}>
            <a href={`#${h.id}`} className={cn(active === h.id && 'is-active')} aria-current={active === h.id ? 'location' : undefined}>
              {h.text}
            </a>
          </li>
        ))}
        </ol>
      </div>
    </>
  )
}
