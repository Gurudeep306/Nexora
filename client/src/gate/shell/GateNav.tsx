/*
  GATE sub-navigation: one row of section links that scrolls sideways on
  narrow screens (active link kept in view, edge fades hint at more), arrow
  keys move between links, and a "sections" button opens every destination
  as a bottom sheet on phones.
*/
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { GATE_NAV, activeNavId } from './nav'

function Badge({ n, active }: { n: number; active?: boolean }) {
  if (!n) return null
  return (
    <span
      className={cn(
        'ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums',
        active ? 'bg-accent-brand text-on-accent-brand' : 'bg-accent-brand/15 text-accent-brand',
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

export function GateNav({ reviewDue = 0 }: { reviewDue?: number }) {
  const { pathname } = useLocation()
  const active = activeNavId(pathname)
  const scroller = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const [sheet, setSheet] = useState(false)

  // Keep the active link visible and track the scroll edges for the fades.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const cur = el.querySelector<HTMLElement>('[aria-current="page"]')
    if (cur) {
      const left = cur.offsetLeft - el.clientWidth / 2 + cur.clientWidth / 2
      el.scrollTo({ left: Math.max(0, left), behavior: 'instant' as ScrollBehavior })
    }
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [active])

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const links = [...(scroller.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]
    const i = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (i < 0) return
    e.preventDefault()
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length
    links[next]?.focus()
  }

  return (
    <nav aria-label="GATE sections" className="relative">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <ul
            ref={scroller}
            onKeyDown={onKey}
            className="flex items-center gap-0.5 overflow-x-auto overscroll-x-contain scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {GATE_NAV.map((item) => {
              const on = item.id === active
              return (
                <li key={item.id} className="shrink-0">
                  <Link
                    to={item.to}
                    aria-current={on ? 'page' : undefined}
                    title={item.hint}
                    className="gnav-tab group"
                  >
                    <Icon name={item.icon} className="gnav-icon size-4" />
                    {item.label}
                    {item.id === 'review' && <Badge n={reviewDue} active={on} />}
                    {item.id === 'review' && reviewDue > 0 && <span className="sr-only"> ({reviewDue} due)</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg-app to-transparent transition-opacity',
              edges.left ? 'opacity-100' : 'opacity-0',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-app to-transparent transition-opacity',
              edges.right ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-label="All GATE sections"
          aria-haspopup="dialog"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand lg:hidden"
        >
          <Icon name="grid" className="size-4" />
        </button>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="GATE sections" size="md">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GATE_NAV.map((item) => {
            const on = item.id === active
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  onClick={() => setSheet(false)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex h-full flex-col gap-1 rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                    on ? 'border-text-primary' : 'border-border hover:bg-bg-surface-2',
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name={item.icon} className="size-4 text-text-muted" />
                    {item.label}
                    {item.id === 'review' && <Badge n={reviewDue} />}
                  </span>
                  <span className="text-[12px] leading-snug text-text-muted">{item.hint}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Modal>
    </nav>
  )
}
