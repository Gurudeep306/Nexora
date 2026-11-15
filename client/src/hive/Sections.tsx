/* ────────────────────────────────────────────────────────────────────────
   Merged sections: one nav item, several tabs (path segments, so pages that
   already use ?tab= keep working). Every old URL redirects here with its
   query string and hash intact.
   ──────────────────────────────────────────────────────────────────────── */
import type { ReactNode } from 'react'
import { NavLink, Navigate, useLocation, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useNavFade } from './kit'

export interface SectionTab {
  id: string
  label: string
  element: ReactNode
}

/**
 * A page made of tabs: `/hive/<base>` shows the first tab, `/hive/<base>/<id>`
 * the others. `active` forces a tab (for routes with their own params).
 */
export function Sectioned({ base, label, tabs, active }: { base: string; label: string; tabs: SectionTab[]; active?: string }) {
  const { '*': rest = '' } = useParams()
  const id = active ?? (rest.split('/')[0] || tabs[0].id)
  const tab = tabs.find((t) => t.id === id) ?? tabs[0]
  const navFade = useNavFade()
  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-[var(--hv-border)] bg-[color-mix(in_oklab,var(--hv-bg-app)_92%,transparent)] px-4 sm:px-6">
        <nav role="tablist" aria-label={label} className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto">
          {tabs.map((t, i) => {
            const on = t.id === tab.id
            return (
              <NavLink
                key={t.id}
                to={i === 0 ? `/hive/${base}` : `/hive/${base}/${t.id}`}
                role="tab"
                aria-selected={on}
                onClick={(e) => navFade(e, i === 0 ? `/hive/${base}` : `/hive/${base}/${t.id}`)}
                className={cn(
                  'relative -mb-px whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors duration-[var(--hv-d-fast)]',
                  on ? 'font-medium text-[var(--hv-text-1)]' : 'text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]',
                )}
              >
                {t.label}
                {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--hv-accent)]" aria-hidden />}
              </NavLink>
            )
          })}
        </nav>
      </div>
      <div className="min-h-0 flex-1" role="tabpanel" aria-label={tab.label}>
        {tab.element}
      </div>
    </div>
  )
}

/**
 * Redirect an old URL to its new home, keeping the query string and hash
 * (e.g. /hive/health?x=1 → /hive/models/health?x=1). `:param` placeholders
 * in `to` are filled from the old route's params.
 */
export function Go({ to }: { to: string }) {
  const loc = useLocation()
  const params = useParams()
  const filled = to.replace(/:(\w+)\??/g, (_, k: string) => params[k] ?? '').replace(/\/+$/, '').replace(/\/\?/, '?')
  const [path, q = ''] = filled.split('?')
  const sp = new URLSearchParams(q)
  new URLSearchParams(loc.search).forEach((v, k) => {
    if (!sp.has(k)) sp.set(k, v)
  })
  const s = sp.toString()
  return <Navigate to={`${path || '/hive'}${s ? `?${s}` : ''}${loc.hash}`} replace />
}
