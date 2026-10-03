import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Flame, Keyboard, Search, Swords, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AnimatedNumber, Avatar, Kbd, RotatingText, SearchCombobox, Tooltip, type ComboboxItem } from '@/components/ui'
import { ACCOUNT_ITEMS, CREATE_SECTION, NAV_SECTIONS, navMeta } from '@/config/nav'
import { Notifications } from './Notifications'
import { LookPopover } from '@/components/look/LookPopover'
import { openCommandPalette } from './CommandPalette'
import { UserMenu } from './UserMenu'
import { api } from '@/lib/api'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import type { Problem, ProblemsResponse } from '@/components/problems/types'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const meta = navMeta(pathname)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Problem[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.get<ProblemsResponse>('/api/problems', { query: { search: q, limit: 6 } })
        setResults(res.problems ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  const items = useMemo<ComboboxItem[]>(() => {
    const q = query.trim().toLowerCase()
    const pages: ComboboxItem[] = [
      ...NAV_SECTIONS.flatMap((s) => s.items),
      ...CREATE_SECTION.items.filter((i) => !i.adminOnly || user?.role === 'admin'),
      ...ACCOUNT_ITEMS,
    ]
      .filter((n) => !q || n.label.toLowerCase().includes(q) || n.to.toLowerCase().includes(q))
      .map((n) => ({
        id: `page:${n.to}`,
        group: 'Go to',
        label: n.label,
        hint: n.to,
        icon: n.icon,
        onSelect: () => (n.external ? (window.location.href = n.to) : navigate(n.to)),
      }))
    const problems: ComboboxItem[] = results.map((p) => ({
      id: `problem:${p.id}`,
      group: 'Problems',
      label: p.title,
      icon: Swords,
      trailing: <PlatformBadge platform={p.platform} />,
      onSelect: () => navigate(`/solve/${p.id}`),
    }))
    const tail: ComboboxItem[] =
      q.length >= 2
        ? [
            {
              id: 'all',
              group: 'Problems',
              label: `Search all problems for “${query.trim()}”`,
              icon: Search,
              onSelect: () => navigate(`/problems?q=${encodeURIComponent(query.trim())}`),
            },
          ]
        : []
    return [...pages, ...problems, ...tail]
  }, [query, results, user?.role, navigate])

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

      <SearchCombobox
        items={items}
        value={query}
        onValueChange={setQuery}
        onSelect={() => setQuery('')}
        loading={searching}
        emptyText="Nothing matches. Try a problem name or page."
        placeholderNode={<RotatingText items={['Search problems…', 'Jump to a page…', 'Find a topic…', 'Run an action…']} />}
        containerClassName="mx-auto hidden w-full max-w-md md:block"
        className="text-[13px]"
        aria-label="Search problems and pages"
        footer={
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-foreground-faint transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <Keyboard className="size-3.5" aria-hidden="true" />
            <span className="flex-1 text-left">Open the full command palette</span>
            <span className="flex gap-0.5">
              <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        }
      />

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
