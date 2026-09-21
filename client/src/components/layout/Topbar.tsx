import { Menu, Search, Flame, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Tooltip } from '@/components/ui'
import { Notifications } from './Notifications'
import { openCommandPalette } from './CommandPalette'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="cursor-pointer rounded-lg p-2 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search problems and pages"
        aria-keyshortcuts="Control+K Meta+K /"
        className="group relative flex h-9 min-w-0 max-w-md flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface pr-2 pl-3 text-left text-sm text-foreground-faint transition-colors hover:border-primary/60 hover:text-foreground-dim"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">Search problems, pages, actions…</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-foreground-faint group-hover:border-primary/50 sm:block">
          {IS_MAC ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {user?.streak != null && user.streak > 0 && (
          <Tooltip label={`${user.streak}-day streak`}>
            <span className="flex items-center gap-1 rounded-lg border border-streak/30 bg-streak/10 px-2.5 py-1.5 text-xs font-bold text-streak tabular-nums">
              <Flame className="size-3.5" />
              {user.streak}
            </span>
          </Tooltip>
        )}
        {user?.xp != null && (
          <Tooltip label="Total XP">
            <span className="hidden items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary-bright tabular-nums sm:flex">
              <Zap className="size-3.5" />
              {user.xp.toLocaleString()}
            </span>
          </Tooltip>
        )}
        <Notifications />
      </div>
    </header>
  )
}
