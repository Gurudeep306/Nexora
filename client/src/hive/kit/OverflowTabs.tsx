import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface OverflowTab<T extends string> {
  id: T
  label: string
  icon?: ReactNode
  count?: number
}

/**
 * A tab bar that never scrolls sideways: tabs that don't fit move into a
 * "More" menu (the active tab always stays visible). Icon + label + count.
 */
export function OverflowTabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: OverflowTab<T>[]; value: T; onChange: (id: T) => void; label: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(tabs.length)
  useLayoutEffect(() => {
    const el = wrap.current
    const m = measure.current
    if (!el || !m) return
    const calc = () => {
      const widths = [...m.children].map((c) => (c as HTMLElement).offsetWidth + 2)
      const avail = el.clientWidth - 72 // room for "More"
      let used = 0
      let n = 0
      for (const w of widths) {
        if (used + w > avail) break
        used += w
        n++
      }
      setFit(n >= tabs.length ? tabs.length : Math.max(1, n))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tabs])
  // Visible: the first `fit` tabs, swapping the active one in if it would be hidden.
  let shown = tabs.slice(0, fit)
  if (fit < tabs.length && !shown.some((t) => t.id === value)) {
    const active = tabs.find((t) => t.id === value)
    if (active) shown = [...shown.slice(0, Math.max(0, fit - 1)), active]
  }
  const hidden = tabs.filter((t) => !shown.includes(t))
  const tab = (t: OverflowTab<T>) => (
    <>
      {t.icon && <span className="grid place-items-center [&_svg]:size-3.5">{t.icon}</span>}
      {t.label}
      {t.count != null && t.count > 0 && <span className="hv-num rounded-full bg-[var(--hv-surface-2)] px-1.5 text-[10.5px] text-[var(--hv-text-2)]">{t.count > 99 ? '99+' : t.count}</span>}
    </>
  )
  return (
    <div ref={wrap} className={cn('relative flex min-w-0 items-center gap-0.5', className)}>
      <div role="tablist" aria-label={label} className="flex min-w-0 items-center gap-0.5">
        {shown.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--hv-r-btn)] px-2.5 text-[12.5px] transition-colors duration-[var(--hv-d-fast)]', t.id === value ? 'bg-[var(--hv-surface-2)] font-medium text-[var(--hv-text-1)]' : 'text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]')}>
            {tab(t)}
          </button>
        ))}
      </div>
      {hidden.length > 0 && (
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--hv-r-btn)] px-2 text-[12.5px] text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]">
              More <ChevronDown className="size-3" />
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            {hidden.map((t) => (
              <MenuItem key={t.id} onSelect={() => onChange(t.id)}>
                {tab(t)}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      )}
      {/* Off-screen copy used to measure each tab's natural width. */}
      <div ref={measure} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-0.5">
        {tabs.map((t) => (
          <span key={t.id} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap px-2.5 text-[12.5px] font-medium">
            {tab(t)}
          </span>
        ))}
      </div>
    </div>
  )
}
