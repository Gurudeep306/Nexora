import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Flame, Search, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AnimatedNumber, Avatar, Kbd, RotatingText, Tooltip } from '@/components/ui'
import { navMeta } from '@/config/nav'
import { Notifications } from './Notifications'
import { LookPopover } from '@/components/look/LookPopover'
import { openCommandPalette } from './CommandPalette'
import { UserMenu } from './UserMenu'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const meta = navMeta(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 titlebar px-3 md:px-6 animate-fade-in">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {meta.section && (
          <>
            <span className="hidden text-text-primary/40 sm:inline">{meta.section}</span>
            <ChevronRight className="hidden size-3.5 text-text-primary/40/60 sm:inline" aria-hidden="true" />
          </>
        )}
        <span className="truncate font-medium text-text-primary" aria-current="page">
          {meta.label}
        </span>
      </nav>

      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search problems and pages"
        aria-keyshortcuts="Control+K Meta+K /"
        className="group relative mx-auto hidden h-9 w-full max-w-md cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl border border-border/60 bg-bg-app/60 pr-1.5 pl-1.5 text-left backdrop-blur-md transition-all duration-300 hover:border-accent-brand/40 hover:bg-accent-brand/[0.07] hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-brand)_9%,transparent),0_10px_28px_-14px_color-mix(in_oklab,var(--color-accent-brand)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/50 md:flex"
      >
        {/* shimmer sweep on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-text-primary/10 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
        />
        <span className="relative flex size-6 shrink-0 items-center justify-center rounded-lg border border-accent-brand/25 bg-accent-brand/10 text-accent-brand transition-all duration-300 group-hover:border-accent-brand/45 group-hover:bg-accent-brand/15 group-hover:shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--color-accent-brand)_70%,transparent)]">
          <Search className="size-3.5" aria-hidden="true" />
        </span>
        <span className="relative min-w-0 flex-1 text-[13px] font-medium text-text-primary/55 transition-colors duration-300 group-hover:text-text-primary/80">
          <RotatingText items={['Search problems…', 'Jump to a page…', 'Find a topic…', 'Run an action…']} />
        </span>
        <span className="relative flex shrink-0 items-center gap-0.5">
          <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <button
          onClick={openCommandPalette}
          aria-label="Search"
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-primary/60 transition-colors hover:bg-accent-brand/5 md:hidden"
        >
          <Search className="size-[17px]" />
        </button>
        {user?.streak != null && user.streak > 0 && (
          <Tooltip label={`${user.streak}-day streak — keep it alive`} side="bottom">
            <span className="flex h-8 items-center gap-1 rounded-lg border border-state-gold/20 bg-state-gold/5 px-2 text-xs font-semibold text-state-gold tabular-nums">
              <Flame className="size-3.5" />
              {user.streak}
            </span>
          </Tooltip>
        )}
        {user?.xp != null && (
          <Tooltip label="Total XP" side="bottom">
            <Link
              to="/analytics"
              className="hidden h-8 items-center gap-1 rounded-lg border border-accent-brand/20 bg-accent-brand/5 px-2 text-xs font-semibold text-accent-brand tabular-nums transition-colors hover:border-accent-brand/30 sm:flex"
            >
              <Zap className="size-3.5" />
              <AnimatedNumber value={user.xp} />
            </Link>
          </Tooltip>
        )}
        <LookPopover />
        <Notifications />
        {user && (
          <UserMenu side="bottom" align="end">
            <button aria-label="Account menu" className="ml-0.5 cursor-pointer rounded-full">
              <Avatar
                seed={user.username}
                avatar={user.avatar}
                src={typeof user.avatar_url === 'string' ? user.avatar_url : undefined}
                name={user.username}
                size="sm"
                ring={false}
              />
            </button>
          </UserMenu>
        )}
      </div>
    </header>
  )
}
