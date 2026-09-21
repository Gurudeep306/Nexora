import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Flame, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Tooltip } from '@/components/ui'
import { Notifications } from './Notifications'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/problems?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="cursor-pointer rounded-lg p-2 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={onSearch} className="relative min-w-0 max-w-md flex-1" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems…"
          aria-label="Search problems"
          className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-foreground placeholder:text-foreground-faint transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
        />
      </form>

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
