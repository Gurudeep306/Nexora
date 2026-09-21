import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronsLeft, Zap, LogOut, X, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCOUNT_ITEMS, CREATE_SECTION, NAV_SECTIONS } from '@/config/nav'
import { Avatar, XpBar } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

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
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex-col border-r border-border bg-surface transition-[width,transform] duration-300 ease-out',
          collapsed ? 'w-[72px]' : 'w-60',
          mobileOpen ? 'flex translate-x-0' : 'hidden lg:flex lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className={cn('relative flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4', collapsed && 'justify-center px-0')}>
          <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent glow-box', collapsed && 'hidden')}>
            <Zap className="size-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg tracking-widest text-foreground glow-text">NEXORA</span>
          )}
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'ml-auto hidden cursor-pointer rounded-md p-1.5 text-foreground-faint transition-colors hover:bg-surface-2 hover:text-foreground lg:block',
              collapsed && 'ml-0',
            )}
          >
            <ChevronsLeft className={cn('size-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
          <button onClick={onMobileClose} aria-label="Close navigation" className="ml-auto rounded-md p-2 text-foreground-dim lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4" aria-label="Main navigation">
          {[
            ...NAV_SECTIONS,
            { ...CREATE_SECTION, items: CREATE_SECTION.items.filter((i) => !i.adminOnly || user?.role === 'admin') },
            { title: 'Account', items: ACCOUNT_ITEMS },
          ].map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[10px] font-bold tracking-[0.2em] text-foreground-faint uppercase">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} {...item} collapsed={collapsed} onNavigate={onMobileClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-border p-3">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <NavLink to="/profile" onClick={onMobileClose} aria-label="Profile">
                  <Avatar src={typeof user.avatar_url === 'string' ? user.avatar_url : undefined} name={user.username} size="sm" />
                </NavLink>
                <button
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="cursor-pointer rounded-md p-1.5 text-foreground-faint transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <XpBar
                  xp={user.xpInLevel ?? 0}
                  nextLevelXp={user.nextLevelXp ?? 1000}
                  level={user.level}
                  levelName={user.title}
                />
                <div className="flex items-center gap-2">
                  <NavLink to="/profile" onClick={onMobileClose} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-2">
                    <Avatar src={typeof user.avatar_url === 'string' ? user.avatar_url : undefined} name={user.username} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{user.username}</p>
                      <p className="truncate text-[10px] text-primary-bright">{user.title ?? `Level ${user.level ?? 1}`}</p>
                    </div>
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    aria-label="Log out"
                    className="cursor-pointer rounded-md p-1.5 text-foreground-faint transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
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
  if (external) {
    return (
      <a
        href={to}
        className={cn(
          'group relative flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground-dim transition-all duration-200 hover:bg-surface-2 hover:text-foreground',
          collapsed && 'justify-center px-0',
        )}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? `${label} (opens creator app)` : undefined}
      >
        <Icon className="size-[18px] shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate">{label}</span>
            <ArrowUpRight className="ml-auto size-3.5 text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </>
        )}
      </a>
    )
  }
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary/12 text-primary-bright'
            : 'text-foreground-dim hover:bg-surface-2 hover:text-foreground',
        )
      }
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-1.5 -left-2.5 w-1 rounded-r-full bg-primary glow-box" />
          )}
          <Icon className={cn('size-[18px] shrink-0 transition-colors', isActive && 'drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]')} />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}
