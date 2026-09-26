import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ChevronsLeft, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CREATE_SECTION, NAV_SECTIONS } from '@/config/nav'
import { Avatar, Kbd, RankGlyph, Tooltip } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { UserMenu } from './UserMenu'
import { openCommandPalette } from './CommandPalette'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const { user } = useAuth()
  const sections = [
    ...NAV_SECTIONS,
    { ...CREATE_SECTION, items: CREATE_SECTION.items.filter((i) => !i.adminOnly || user?.role === 'admin') },
  ]
  const level = Number(user?.level) || 1
  const pct = user?.nextLevelXp ? Math.min(100, ((user.xpInLevel ?? 0) / user.nextLevelXp) * 100) : 0

  const body = (
    <>
      {/* Brand */}
      <div className={cn('flex h-14 shrink-0 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <NavLink to="/hub" onClick={onMobileClose} className="flex items-center gap-2.5" aria-label="Nexora home">
          <LogoMark size={28} className="drop-shadow-[0_4px_14px_rgb(99_102_241/0.55)]" />
          {!collapsed && <Wordmark />}
        </NavLink>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'ml-auto hidden cursor-pointer rounded-md p-1.5 text-text-primary/60 transition-colors hover:bg-accent-brand/5 hover:text-text-primary lg:block',
            collapsed && 'absolute top-4 -right-3 z-10 rounded-full border border-border/30 bg-bg-surface-2 p-1 shadow-md',
          )}
        >
          <ChevronsLeft className={cn('size-4 transition-transform duration-300', collapsed && 'size-3.5 rotate-180')} />
        </button>
        <button onClick={onMobileClose} aria-label="Close navigation" className="ml-auto rounded-md p-2 text-text-primary/60 lg:hidden">
          <X className="size-5" />
        </button>
      </div>

      {/* Search */}
      <div className={cn('px-3 pb-2', collapsed && 'px-2.5')}>
        {collapsed ? (
          <Tooltip label="Search (⌘K)" side="right">
            <button
              onClick={openCommandPalette}
              aria-label="Search"
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border/30 bg-bg-app/5 text-text-primary/60 transition-colors hover:text-text-primary"
            >
              <Search className="size-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => {
              onMobileClose()
              openCommandPalette()
            }}
            className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-border/30 bg-bg-app/5 px-2.5 text-[13px] text-text-primary/60 transition-colors hover:border-border/20 hover:text-text-primary/60"
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span className="flex-1 text-left">Search…</span>
            <span className="flex gap-0.5">
              <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2 [scrollbar-width:thin]" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border/20" />
            ) : (
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold tracking-[0.14em] text-text-primary/60/80 uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-px">
              {section.items.map((item) => (
                <SidebarLink key={item.to} {...item} collapsed={collapsed} onNavigate={onMobileClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Level + account */}
      {user && (
        <div className="border-t border-border/20 p-3">
          {!collapsed && (
            <NavLink
              to="/nexus"
              onClick={onMobileClose}
              className="group mb-2.5 block rounded-lg border border-border/20 bg-gradient-to-b from-bg-app/5 to-transparent p-2.5 transition-colors hover:border-accent-brand/30"
            >
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text-primary">
                  Level {level} <span className="text-text-primary/60">· {user.title ?? 'Rift Walker'}</span>
                </span>
                <span className="font-mono text-text-primary/60 tabular-nums">{Math.round(pct)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-border/20">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent-brand via-accent-brand-hover to-state-info"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </NavLink>
          )}
          <UserMenu>
            <button
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-bg-app/5 data-[state=open]:bg-bg-app/8',
                collapsed && 'justify-center',
              )}
              aria-label="Account menu"
            >
              <span className="relative">
                <Avatar
                  seed={user.username}
                  avatar={user.avatar}
                  src={typeof user.avatar_url === 'string' ? user.avatar_url : undefined}
                  name={user.username}
                  size="sm"
                  ring={false}
                />
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-bg-app/50 bg-state-success" />
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text-primary">{user.username}</span>
                    <span className="block truncate text-[11px] text-text-primary/60">
                      {(user.xp ?? 0).toLocaleString()} XP
                    </span>
                  </span>
                  <RankGlyph level={level} size={22} animated={false} />
                  <ChevronsUpDown className="size-3.5 text-text-primary/60" aria-hidden="true" />
                </>
              )}
            </button>
          </UserMenu>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-border/20 bg-bg-app/85 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {body}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/20 bg-bg-app lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              {body}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
  external,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  collapsed: boolean
  onNavigate: () => void
  external?: boolean
}) {
  const base = cn(
    'group relative flex h-9 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors duration-150',
    collapsed && 'mx-auto size-10 justify-center px-0',
  )
  const link = external ? (
    <a
      href={to}
      className={cn(base, 'text-text-primary/60 hover:bg-bg-app/5 hover:text-text-primary')}
      aria-label={collapsed ? `${label} (opens creator app)` : undefined}
    >
      <Icon className="size-[17px] shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          <ArrowUpRight className="ml-auto size-3.5 text-text-primary/60 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </>
      )}
    </a>
  ) : (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(base, isActive ? 'text-accent-brand' : 'text-text-primary/60 hover:bg-bg-app/5 hover:text-text-primary')
      }
      aria-label={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-lg border border-accent-brand/20 bg-gradient-to-r from-accent-brand/10 via-white/[0.02] to-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
            >
              <span className="absolute top-1/2 -left-3 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-brand-bright shadow-[0_0_10px_rgb(167_139_250/0.9)]" />
            </motion.span>
          )}
          <Icon
            className={cn(
              'relative size-[17px] shrink-0 transition-colors',
              isActive ? 'text-accent-brand' : 'text-text-primary/60 group-hover:text-text-primary',
            )}
          />
          {!collapsed && <span className="relative truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
  return collapsed ? (
    <div className="flex justify-center">
      <Tooltip label={label} side="right">
        {link}
      </Tooltip>
    </div>
  ) : (
    link
  )
}
