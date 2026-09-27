import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Flame, Search, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AnimatedNumber, Avatar, Kbd, Tooltip } from '@/components/ui'
import { navMeta } from '@/config/nav'
import { Notifications } from './Notifications'
import { openCommandPalette } from './CommandPalette'
import { UserMenu } from './UserMenu'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const meta = navMeta(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-bg-app/50 px-3 backdrop-blur-xl backdrop-saturate-150 md:px-6 animate-fade-in">
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
        className="group mx-auto hidden h-8 w-full max-w-sm cursor-pointer items-center gap-2 rounded-lg border border-accent-brand/20 bg-accent-brand/5 pr-1.5 pl-3 text-left text-[13px] text-text-primary/60 transition-colors hover:border-accent-brand/30 hover:bg-accent-brand/10 hover:text-text-primary md:flex"
      >
        <Search className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">Search problems, pages, actions…</span>
        <span className="flex gap-0.5">
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
