import { NavLink, useLocation } from 'react-router-dom'
import { prefetchHandlers } from '@/routes'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useSite } from '@/context/SiteContext'
import { featureForPath } from '@/lib/site'
import { Icon } from '@/components/icon/Icon'
import { dockIconName } from './dockIcons'
import { openCommandPalette } from './CommandPalette'
import { DOCK_BY_ID, isDockFocusRoute, useDock, type DockItem } from './dockStore'
import { tStandard } from '@/lib/motion'

/** Native-feeling bottom tab bar on phones. Its four tabs are the first four
 *  pages in the user's Dock, so customizing the Dock customizes this too. */
export function MobileTabBar() {
  const { pathname } = useLocation()
  const dock = useDock()
  const { featureOn, isStaff } = useSite()

  if (isDockFocusRoute(pathname)) return null

  const pages = dock.pinned
    .map((id) => DOCK_BY_ID.get(id))
    .filter((i): i is DockItem => !!i && !!i.to && !i.external && !i.action && !i.to.includes('?') && (!i.staffOnly || isStaff) && featureOn(featureForPath(i.to)))
    .slice(0, 4)
  const tabs: (DockItem | 'search')[] = [...pages.slice(0, 2), 'search', ...pages.slice(2, 4)]

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 glass-thick border-x-0 border-b-0 !shadow-none pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-14 max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) =>
          t === 'search' ? (
            // The centre tab opens search. A flat, tinted well marks it as the
            // primary action — no gloss, no glow — and it keeps a label so it
            // lines up with its neighbours.
            <button
              key="search"
              onClick={openCommandPalette}
              className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-text-secondary active:!scale-100"
              aria-label="Search"
            >
              <span className="flex h-7 w-11 items-center justify-center rounded-full border border-border bg-text-primary/[0.06] text-text-primary transition-colors active:bg-text-primary/10">
                <Icon name="search" className="size-[17px]" />
              </span>
              Search
            </button>
          ) : (
            <NavLink
              key={t.id}
              to={t.to!}
              {...prefetchHandlers(t.to!)}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-text-primary' : 'text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-dot"
                      transition={tStandard}
                      className="absolute top-0 h-0.5 w-7 rounded-b-full bg-accent-brand"
                    />
                  )}
                  <span className="flex h-7 items-center justify-center">
                    <Icon name={dockIconName(t.id)} className={cn('size-[19px]', isActive && 'text-accent-brand')} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}
