import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Loader2, Search, SearchX } from 'lucide-react'
import { iconComponent } from '@/components/icon/iconComponent'
import { Highlight, Kbd } from '@/components/ui'
import { openShortcuts } from './ShortcutsDialog'
import { openAssistantEvent } from '@/context/AgentContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fadeInOut, popIn } from '@/lib/motion'
import { useAuth } from '@/context/AuthContext'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import type { Problem, ProblemsResponse } from '@/components/problems/types'
import { useProblemSearch } from '@/lib/problemSearch'
import { pushRecentSearch, useRecentSearches } from '@/lib/recentSearches'
import { describeRecent, pageMatches, usePageEntries } from './searchSources'
import { ClearRecents } from './ClearRecents'
// Theme entries (Theme Centre)
import { useTheme } from '@/context/ThemeContext'
import { THEMES } from '@/theme/styles'

type Group = 'Recent' | 'Go to' | 'Pages' | 'Problems' | 'Themes' | 'Actions' | 'Try instead'

type Item = {
  id: string
  group: Group
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  problem?: Problem
  /** Don't mark the query inside this label. */
  plain?: boolean
  run: () => void | Promise<void>
}

/** Open the palette from anywhere: window.dispatchEvent(new Event('nexora:palette')) */
export const openCommandPalette = () => window.dispatchEvent(new Event('nexora:palette'))

/**
 * ⌘K / Ctrl+K command palette — jump to any page, search the problem library,
 * pick a random problem, or run quick actions, all from the keyboard.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { mode, setAppearance, setLook } = useTheme()
  const pages = usePageEntries()
  const recents = useRecentSearches()
  const q = query.trim()
  const { results, loading: searching, settled } = useProblemSearch(query, { enabled: open })

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A page with its own ⌘K / "/" (the Nexus search) handles it first.
      if (e.defaultPrevented) return
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('nexora:palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('nexora:palette', onOpen)
    }
  }, [open])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const go = useCallback(
    (to: string, external?: boolean) => {
      close()
      if (external) window.location.href = to
      else navigate(to)
    },
    [close, navigate],
  )

  const lower = q.toLowerCase()
  const pageHits = useMemo(() => (q ? pages.filter((n) => pageMatches(n, q)) : pages), [pages, q])
  const themeHits = useMemo(
    () => (q.length >= 2 ? THEMES.filter((t) => `${t.name} ${t.tagline} ${t.forWho ?? ''}`.toLowerCase().includes(lower)).slice(0, 5) : []),
    [q, lower],
  )

  const actions = useMemo<Item[]>(
    () => [
      {
        id: 'act:random',
        group: 'Actions',
        label: 'Surprise me — random problem',
        icon: iconComponent('random'),
        run: async () => {
          close()
          try {
            const first = await api.get<ProblemsResponse>('/api/problems', { query: { limit: 1 } })
            const offset = Math.floor(Math.random() * Math.max(first.total, 1))
            const pick = await api.get<ProblemsResponse>('/api/problems', { query: { limit: 1, offset } })
            if (pick.problems?.[0]) navigate(`/solve/${pick.problems[0].id}`)
          } catch {
            navigate('/problems')
          }
        },
      },
      {
        id: 'act:mode',
        group: 'Actions',
        label: mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        hint: 'Appearance',
        icon: iconComponent(mode === 'dark' ? 'sun' : 'moon'),
        run: () => {
          close()
          setAppearance(mode === 'dark' ? 'light' : 'dark')
        },
      },
      { id: 'act:themes', group: 'Actions', label: 'Change style or theme…', hint: 'Appearance', icon: iconComponent('palette'), run: () => go('/theme') },
      { id: 'act:profile', group: 'Actions', label: 'View my profile', icon: iconComponent('profile'), run: () => go('/profile') },
      { id: 'act:avatar', group: 'Actions', label: 'Change my avatar', icon: iconComponent('settings'), run: () => go('/settings') },
      {
        id: 'act:keys',
        group: 'Actions',
        label: 'Keyboard shortcuts',
        hint: '?',
        icon: iconComponent('keyboard'),
        run: () => {
          close()
          openShortcuts()
        },
      },
      {
        id: 'act:logout',
        group: 'Actions',
        label: 'Log out',
        icon: iconComponent('logout'),
        run: async () => {
          close()
          await logout()
          navigate('/auth')
        },
      },
    ],
    [mode, close, go, navigate, setAppearance, logout],
  )

  const askAi = useMemo<Item>(
    () => ({
      id: 'act:assistant',
      group: 'Actions',
      label: q.length >= 2 ? `Ask NexoraGuru AI: “${q}”` : 'Ask NexoraGuru AI',
      plain: true,
      hint: '⌘J',
      icon: iconComponent('sparkles'),
      run: () => {
        close()
        openAssistantEvent(q.length >= 2 ? q : undefined)
      },
    }),
    [q, close],
  )

  const searchAll = useMemo<Item>(
    () => ({
      id: 'act:search-all',
      group: 'Problems',
      label: `Search all problems for “${q}”`,
      plain: true,
      icon: iconComponent('search'),
      run: () => {
        pushRecentSearch({ kind: 'query', q })
        go(`/problems?q=${encodeURIComponent(q)}`)
      },
    }),
    [q, go],
  )

  // Nothing matched: the query got no page, problem, theme or action.
  const noMatches =
    q.length >= 2 &&
    settled &&
    results.length === 0 &&
    pageHits.length === 0 &&
    themeHits.length === 0 &&
    !actions.some((i) => i.label.toLowerCase().includes(lower))

  const items = useMemo<Item[]>(() => {
    if (!q) {
      const recent: Item[] = recents.slice(0, 5).map((r, i) => {
        const d = describeRecent(r)
        return {
          id: `recent:${i}`,
          group: 'Recent',
          label: d.label,
          hint: d.hint,
          icon: d.icon,
          run: () => (r.kind === 'query' ? setQuery(r.q) : go(r.to)),
        }
      })
      const goTo = pages.map<Item>((n) => ({
        id: `page:${n.to}`,
        group: 'Go to',
        label: n.label,
        hint: n.section,
        icon: iconComponent(n.icon),
        run: () => {
          pushRecentSearch({ kind: 'page', label: n.label, to: n.to, icon: n.icon })
          go(n.to, n.external)
        },
      }))
      return [...recent, ...goTo, ...actions, askAi]
    }
    if (noMatches) {
      return [{ ...searchAll, group: 'Try instead' }, { ...askAi, group: 'Try instead' }]
    }
    const pageItems = pageHits.map<Item>((n) => ({
      id: `page:${n.to}`,
      group: 'Pages',
      label: n.label,
      hint: n.section,
      icon: iconComponent(n.icon),
      run: () => {
        pushRecentSearch({ kind: 'page', label: n.label, to: n.to, icon: n.icon })
        go(n.to, n.external)
      },
    }))
    const problemItems: Item[] = q.length >= 2
      ? [
          ...results.map<Item>((p) => ({
            id: `problem:${p.id}`,
            group: 'Problems',
            label: p.title,
            hint: `${p.problem_id}${p.rating ? ` · ${p.rating}` : ''}`,
            icon: iconComponent('problems'),
            problem: p,
            run: () => {
              pushRecentSearch({ kind: 'problem', label: p.title, to: `/solve/${p.id}`, hint: p.platform })
              go(`/solve/${p.id}`)
            },
          })),
          searchAll,
        ]
      : []
    // Typing a theme's name offers to apply it directly.
    const themeItems: Item[] = themeHits.map((p) => ({
      id: `theme:${p.id}`,
      group: 'Themes',
      label: `Use theme: ${p.name}`,
      hint: p.tagline,
      icon: iconComponent('palette'),
      run: () => {
        close()
        setLook({ style: p.id })
      },
    }))
    const actionItems = [...actions.filter((i) => i.label.toLowerCase().includes(lower) || i.hint?.toLowerCase().includes(lower)), askAi]
    return [...pageItems, ...problemItems, ...themeItems, ...actionItems]
  }, [q, lower, recents, pages, pageHits, results, themeHits, actions, askAi, searchAll, noMatches, go, close, setLook])

  useEffect(() => setActive(0), [q, results.length, noMatches])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void items[active]?.run()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  let lastGroup = ''
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1050] flex items-start justify-center p-3 pt-[10vh] sm:p-4 sm:pt-[14vh]" onKeyDown={onKeyDown}>
          <motion.div data-ui="scrim" className="absolute inset-0 bg-bg-app/60 backdrop-blur-[2px]" {...fadeInOut} onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            data-ui="sheet"
            className="pop-surface relative flex max-h-[min(36rem,80vh)] w-full max-w-[640px] flex-col overflow-hidden !rounded-[var(--radius-sheet)]"
            {...popIn}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-border px-4">
              {searching ? (
                <Loader2 className="size-[18px] shrink-0 animate-spin text-text-muted" aria-hidden="true" />
              ) : (
                <Search className="size-[18px] shrink-0 text-text-muted" aria-hidden="true" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems, pages, actions…"
                aria-label="Command palette search"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
                className="h-14 w-full bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted focus-visible:outline-none"
              />
              <Kbd className="hidden sm:inline-flex">Esc</Kbd>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {noMatches && (
                <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-surface text-text-muted">
                    <SearchX className="size-[18px]" aria-hidden="true" />
                  </span>
                  <p className="mt-3 mb-0 text-sm font-medium text-text-primary">No results for “{q}”</p>
                  <p className="mt-1 mb-0 max-w-xs text-[13px] text-text-secondary">
                    Nothing in pages, problem titles, themes or actions. Check the spelling, or try one of these.
                  </p>
                </div>
              )}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null
                lastGroup = item.group
                const Icon = item.icon
                const isActive = i === active
                return (
                  <div key={item.id}>
                    {header && (
                      <div className={cn('flex items-center justify-between px-3 pb-1.5', i === 0 && !noMatches ? 'pt-1.5' : 'pt-4')}>
                        <span data-ui="group-title" className="text-[11px] font-medium text-text-muted">
                          {header}
                          {header === 'Problems' && searching && <span className="ml-2 text-text-muted/80">Searching…</span>}
                        </span>
                        {header === 'Recent' && <ClearRecents />}
                      </div>
                    )}
                    <button
                      id={`palette-${item.id}`}
                      data-index={i}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => void item.run()}
                      className={cn(
                        'flex h-10 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-sm active:!scale-100',
                        isActive ? 'bg-text-primary/[0.07] text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', isActive ? 'text-text-primary' : 'text-text-muted')} />
                      <span className="min-w-0 flex-1 truncate">
                        {item.plain ? item.label : <Highlight text={item.label} query={q} />}
                      </span>
                      {item.problem ? (
                        <>
                          {item.hint && <span className="hidden shrink-0 font-mono text-[11px] text-text-muted sm:inline">{item.hint}</span>}
                          <PlatformBadge platform={item.problem.platform} />
                        </>
                      ) : (
                        item.hint && <span className="shrink-0 text-[12px] text-text-muted">{item.hint}</span>
                      )}
                      <CornerDownLeft
                        className={cn('size-3.5 shrink-0 text-text-muted', isActive ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex shrink-0 items-center gap-4 border-t border-border bg-bg-surface/60 px-4 py-2.5 text-[11.5px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                to open
              </span>
              <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                <Kbd>?</Kbd> all shortcuts
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
