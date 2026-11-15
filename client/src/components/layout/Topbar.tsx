import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, SearchX } from 'lucide-react'
import { Icon } from '@/components/icon/Icon'
import { iconComponent } from '@/components/icon/iconComponent'
import { useAuth } from '@/context/AuthContext'
import { useSite } from '@/context/SiteContext'
import { AnimatedNumber, Avatar, BackButton, Kbd, RotatingText, SearchCombobox, Tooltip, type ComboboxItem } from '@/components/ui'
import { navMeta } from '@/config/nav'
import { Notifications } from './Notifications'
import { LookPopover } from '@/components/look/LookPopover'
import { openCommandPalette } from './CommandPalette'
import { openAssistantEvent } from '@/context/AgentContext'
import { UserMenu } from './UserMenu'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { LogoMark } from '@/components/brand/Logo'
import { useSmartBack, useTrailRecorder } from '@/lib/backNav'
import { useProblemSearch } from '@/lib/problemSearch'
import { pushRecentSearch, useRecentSearches } from '@/lib/recentSearches'
import { describeRecent, pageMatches, usePageEntries, type PageEntry } from './searchSources'
import { ClearRecents } from './ClearRecents'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar() {
  const { user } = useAuth()
  const { featureOn } = useSite()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const meta = navMeta(pathname)

  const [query, setQuery] = useState('')
  const pages = usePageEntries()
  const recents = useRecentSearches()
  const q = query.trim()
  const { results, loading: searching, settled } = useProblemSearch(query)

  const items = useMemo<ComboboxItem[]>(() => {
    const openPage = (n: PageEntry) => {
      pushRecentSearch({ kind: 'page', label: n.label, to: n.to, icon: n.icon })
      if (n.external) window.location.href = n.to
      else navigate(n.to)
    }
    // Nothing typed yet: what you looked for last, then every page.
    if (!q) {
      const recent: ComboboxItem[] = recents.slice(0, 5).map((r, i) => {
        const d = describeRecent(r)
        return {
          id: `recent:${i}`,
          group: 'Recent',
          label: d.label,
          hint: d.hint,
          icon: d.icon,
          keepOpen: r.kind === 'query',
          onSelect: () => (r.kind === 'query' ? setQuery(r.q) : navigate(r.to)),
        }
      })
      const all = pages.map<ComboboxItem>((n) => ({
        id: `page:${n.to}`,
        group: 'Go to',
        label: n.label,
        hint: n.section,
        icon: iconComponent(n.icon),
        onSelect: () => openPage(n),
      }))
      return [...recent, ...all]
    }
    const pageHits = pages
      .filter((n) => pageMatches(n, q))
      .map<ComboboxItem>((n) => ({
        id: `page:${n.to}`,
        group: 'Pages',
        label: n.label,
        hint: n.section,
        icon: iconComponent(n.icon),
        onSelect: () => openPage(n),
      }))
    const problems: ComboboxItem[] =
      q.length >= 2
        ? results.map((p) => ({
            id: `problem:${p.id}`,
            group: 'Problems',
            label: p.title,
            icon: iconComponent('problems'),
            trailing: <PlatformBadge platform={p.platform} />,
            onSelect: () => {
              pushRecentSearch({ kind: 'problem', label: p.title, to: `/solve/${p.id}`, hint: p.platform })
              navigate(`/solve/${p.id}`)
            },
          }))
        : []
    const tail: ComboboxItem[] =
      q.length >= 2
        ? [
            {
              id: 'all',
              group: problems.length ? 'Problems' : 'Search',
              label: `Search all problems for “${q}”`,
              plain: true,
              icon: iconComponent('search'),
              onSelect: () => {
                pushRecentSearch({ kind: 'query', q })
                navigate(`/problems?q=${encodeURIComponent(q)}`)
              },
            },
          ]
        : []
    return [...pageHits, ...problems, ...tail]
  }, [q, results, pages, recents, navigate])

  const noMatches = q.length >= 2 && settled && results.length === 0 && !pages.some((n) => pageMatches(n, q))

  // Back: the page you came from in this tab, else one level up (see lib/backNav).
  useTrailRecorder()
  const back = useSmartBack()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 titlebar px-3 md:px-6 animate-fade-in">
      <Tooltip label="NexoraGuru home" side="bottom">
        <Link
          to="/hub"
          aria-label="NexoraGuru home"
          className="hidden shrink-0 rounded-lg transition-opacity hover:opacity-85 md:block"
        >
          <LogoMark size={28} interactive />
        </Link>
      </Tooltip>

      {/* Back, named for where it goes. Hidden at the top (Home). */}
      {back.target && <BackButton onClick={back.go} size="sm" label={back.label} />}

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {meta.section && (
          <>
            <span className="hidden text-text-muted sm:inline">{meta.section}</span>
            <ChevronRight className="hidden size-3.5 text-text-muted sm:inline" aria-hidden="true" />
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
        groupActions={{ Recent: <ClearRecents /> }}
        notice={
          noMatches ? (
            <div className="flex items-start gap-2.5 px-2.5 pt-2 pb-2.5">
              <SearchX className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
              <p className="mb-0 text-[12.5px] leading-snug text-text-secondary">
                No pages or problem titles match <span className="font-medium text-text-primary">“{q}”</span>.
                <span className="block text-text-muted">Check the spelling, or search the full library below.</span>
              </p>
            </div>
          ) : null
        }
        placeholderNode={<RotatingText items={['Search problems…', 'Jump to a page…', 'Find a topic…', 'Run an action…']} />}
        containerClassName="mx-auto hidden w-full max-w-md md:block"
        className="text-[13px]"
        aria-label="Search problems and pages"
        footer={
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-[calc(var(--radius-control)*0.8)] px-2.5 text-[12px] text-text-muted transition-colors hover:bg-text-primary/[0.05] hover:text-text-primary active:!scale-100"
          >
            <Icon name="keyboard" className="size-3.5" />
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
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-text-primary/6 hover:text-text-primary md:hidden"
        >
          <Icon name="search" className="size-[17px]" />
        </button>
        {user?.streak != null && user.streak > 0 && (
          <Tooltip label={`${user.streak}-day streak — keep it alive`} side="bottom">
            <span className="flex h-8 items-center gap-1 rounded-lg border border-state-gold/20 bg-state-gold/5 px-2 text-xs font-semibold text-state-gold tabular-nums">
              <Icon name="flame" className="size-3.5" />
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
              <Icon name="bolt" className="size-3.5" />
              <AnimatedNumber value={user.xp} />
            </Link>
          </Tooltip>
        )}
        {featureOn('ai_tutor') && (
          <Tooltip label="NexoraGuru AI (⌘J)" side="bottom">
            <button
              onClick={() => openAssistantEvent()}
              aria-label="Open AI assistant"
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-text-primary/6 hover:text-text-primary"
            >
              <Icon name="sparkles" className="size-[17px]" />
            </button>
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
