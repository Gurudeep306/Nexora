import { useEffect, useState, type ReactNode } from 'react'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtMinutes } from './insights'
import type { NexusNode, NexusZone } from './types'
import './subject-contents.css'

/*
 * A subject as a book's table of contents: a sticky chapter index on the
 * left, then each chapter as a numbered serif heading (an italic roman
 * numeral) over its lessons as hairline rows — reading time in mono and a
 * moss check once done. Opening a row blooms the lesson in place, exactly as
 * selecting it in the skill tree does.
 */

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]
export function roman(n: number): string {
  let out = ''
  let left = n
  for (const [v, s] of ROMAN) {
    while (left >= v) {
      out += s
      left -= v
    }
  }
  return out
}

export function SubjectContents({
  zones,
  nodes,
  minutes,
  zoneWord,
  nextId,
  onOpen,
  aside,
}: {
  zones: NexusZone[]
  nodes: NexusNode[]
  /** Reading minutes per node, when known. */
  minutes: Record<string, number>
  /** "Chapter" or "Zone". */
  zoneWord: string
  /** The next lesson to study (marked "next"). */
  nextId: string | null
  onOpen: (id: string) => void
  /** The atlas card and anything else under the index. */
  aside?: ReactNode
}) {
  const byZone = zones.map((z) => ({ z, list: nodes.filter((n) => n.zone === z.level) })).filter((x) => x.list.length)
  const [current, setCurrent] = useState<number | null>(byZone[0]?.z.level ?? null)

  // The index follows the chapter you are reading.
  useEffect(() => {
    const els = byZone.map(({ z }) => document.getElementById(`toc-zone-${z.level}`)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (vis) setCurrent(Number(vis.target.getAttribute('data-zone')))
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, nodes])

  return (
    <div className="sx-toc">
      <aside className="sx-toc-index" aria-label="Chapters">
        <p className="ed-label ed-muted m-0">{zoneWord === 'Zone' ? 'Zones' : 'Chapters'}</p>
        <ol className="mt-4 mb-0 list-none p-0">
          {byZone.map(({ z }) => (
            <li key={z.level}>
              <a
                href={`#toc-zone-${z.level}`}
                className={cn('sx-toc-link', current === z.level && 'is-on')}
                aria-current={current === z.level ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(`toc-zone-${z.level}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <span className="ed-serif-numeral sx-toc-num">{roman(z.level)}</span>
                <span className="min-w-0 flex-1 truncate">{z.name}</span>
                <span className="ed-mono text-[11px]">{z.zoneProgress}%</span>
              </a>
            </li>
          ))}
        </ol>
        {aside && <div className="mt-10 hidden lg:block">{aside}</div>}
      </aside>

      <div className="min-w-0">
        {byZone.map(({ z, list }) => {
          const done = list.filter((n) => n.completed).length
          return (
            <section key={z.level} id={`toc-zone-${z.level}`} data-zone={z.level} className="sx-chapter" aria-labelledby={`toc-zone-h-${z.level}`}>
              <h2 id={`toc-zone-h-${z.level}`} className="sx-chapter-h">
                <span className="ed-serif-numeral sx-chapter-num" aria-hidden="true">
                  {roman(z.level)}
                </span>
                <span className="sr-only">
                  {zoneWord} {z.level}:{' '}
                </span>
                <span className="ed-serif">{z.name}</span>
              </h2>
              <p className="ed-mono ed-muted mt-2 mb-0 text-[12px]">
                {done} of {list.length} done{z.locked ? ' · locked until the chapter before it' : ''}
              </p>
              <ol className="sx-lessons mt-5 mb-0 list-none p-0">
                {list.map((n, i) => {
                  const min = minutes[n.id]
                  const locked = !n.unlocked && !n.completed
                  return (
                    <li key={n.id}>
                      <button type="button" className={cn('sx-lesson', locked && 'is-locked')} onClick={() => onOpen(n.id)}>
                        <span className="ed-mono ed-muted sx-lesson-no">
                          {z.level}.{i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="ed-ui block">{n.name}</span>
                          {n.id === nextId && <span className="ed-caption sx-next mt-0.5 block">Next up</span>}
                        </span>
                        {min ? <span className="ed-mono ed-muted text-[12px]">{fmtMinutes(min)}</span> : null}
                        <span className="sx-lesson-state">
                          {n.completed ? (
                            <span className="sx-done" title="Mastered">
                              <Check className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">Mastered</span>
                            </span>
                          ) : locked ? (
                            <Lock className="size-3.5 text-text-muted" aria-label="Locked" />
                          ) : n.progress > 0 ? (
                            <span className="ed-mono text-[11px]">{n.progress}%</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
        {aside && <div className="mt-12 lg:hidden">{aside}</div>}
      </div>
    </div>
  )
}
