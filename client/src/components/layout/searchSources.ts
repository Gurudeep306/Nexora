import { useMemo, type ComponentType } from 'react'
import { iconComponent } from '@/components/icon/iconComponent'
import { ACCOUNT_ITEMS, ADMIN_ITEM, CREATE_SECTION, NAV_SECTIONS, type NavItem } from '@/config/nav'
import { useSite } from '@/context/SiteContext'
import { featureForPath } from '@/lib/site'
import type { RecentSearch } from '@/lib/recentSearches'
import type { IconName } from '@/components/icon/Icon'

/** A page the search can jump to, with the nav section it lives in. */
export type PageEntry = NavItem & { section: string }

/**
 * Every page the current user may open, for the top-bar search and the
 * command palette (same list, same order, same permissions).
 */
export function usePageEntries(): PageEntry[] {
  const { can, featureOn, isStaff } = useSite()
  return useMemo(
    () => [
      ...NAV_SECTIONS.flatMap((s) => s.items.filter((i) => featureOn(featureForPath(i.to))).map((i) => ({ ...i, section: s.title }))),
      // Creator tools follow the problems.manage permission (admins by default).
      ...CREATE_SECTION.items.filter((i) => !i.adminOnly || can('problems.manage')).map((i) => ({ ...i, section: CREATE_SECTION.title })),
      ...ACCOUNT_ITEMS.map((i) => ({ ...i, section: 'Account' })),
      ...(isStaff ? [{ ...ADMIN_ITEM, section: 'Account' }] : []),
    ],
    [can, featureOn, isStaff],
  )
}

/** Case-insensitive match of every word of the query against a page. */
export function pageMatches(page: PageEntry, q: string) {
  const hay = `${page.label} ${page.section} ${page.external ? '' : page.to}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

const ICON_FOR: Record<RecentSearch['kind'], IconName> = { query: 'clock', page: 'home', problem: 'problems' }

/** Icon and label for a recent search entry. */
export function describeRecent(r: RecentSearch): { label: string; hint?: string; icon: ComponentType<{ className?: string }> } {
  if (r.kind === 'query') return { label: r.q, hint: 'Search', icon: iconComponent(ICON_FOR.query) }
  if (r.kind === 'page') return { label: r.label, hint: 'Page', icon: iconComponent((r.icon as IconName | undefined) ?? ICON_FOR.page) }
  return { label: r.label, hint: r.hint ?? 'Problem', icon: iconComponent(ICON_FOR.problem) }
}
