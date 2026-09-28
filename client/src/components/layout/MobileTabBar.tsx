import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { LayoutDashboard, Network, Search, Swords, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openCommandPalette } from './CommandPalette'

const TABS = [
  { to: '/hub', label: 'Hub', icon: LayoutDashboard },
  { to: '/problems', label: 'Problems', icon: Swords },
  { to: '#search', label: 'Search', icon: Search },
  { to: '/nexus', label: 'Nexus', icon: Network },
  { to: '/social', label: 'Social', icon: Users },
]

/** Native-feeling bottom tab bar on phones. */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/10 bg-bg-app/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-14 max-w-md grid-cols-5">
        {TABS.map((t) =>
          t.to === '#search' ? (
            <button
              key={t.to}
              onClick={openCommandPalette}
              className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-text-primary/60"
              aria-label="Search"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#9d74ff] to-primary text-on-accent-brand shadow-[0_6px_20px_-6px_rgb(139_92_246/0.8)]">
                <t.icon className="size-[18px]" />
              </span>
            </button>
          ) : (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-text-primary' : 'text-text-primary/60',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-dot"
                      className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary-bright shadow-[0_0_10px_rgb(167_139_250/0.9)]"
                    />
                  )}
                  <t.icon className={cn('size-[19px]', isActive && 'text-accent-brand')} />
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
