import { NavLink, useLocation } from 'react-router-dom'
import { prefetchHandlers } from '@/routes'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { dockIconName } from './dockIcons'
import { openCommandPalette } from './CommandPalette'
import { DOCK_BY_ID, isDockFocusRoute, useDock, type DockItem } from './dockStore'

/** Native-feeling bottom tab bar on phones. Its four tabs are the first four
 *  pages in the user's Dock, so customizing the Dock customizes this too. */
export function MobileTabBar() {
  const { pathname } = useLocation()
  const dock = useDock()

  if (isDockFocusRoute(pathname)) return null

  const pages = dock.pinned
    .map((id) => DOCK_BY_ID.get(id))
    .filter((i): i is DockItem => !!i && !!i.to && !i.external && !i.action && !i.to.includes('?'))
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
            <button
              key="search"
              onClick={openCommandPalette}
              className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-text-secondary hover:!scale-100"
              aria-label="Search"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-b from-accent-brand-hover to-accent-brand text-on-accent-brand shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--color-accent-brand)_80%,transparent)]">
                <Icon name="search" className="size-[18px]" />
              </span>
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
                      className="absolute top-0 h-0.5 w-8 rounded-b-full bg-accent-brand shadow-[0_0_10px_var(--color-accent-brand)]"
                    />
                  )}
                  <Icon name={dockIconName(t.id)} className={cn('size-[19px]', isActive && 'text-accent-brand')} />
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
