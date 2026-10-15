import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import { iconComponent } from '@/components/icon/iconComponent'
import { Kbd } from '@/components/ui'
import { openShortcuts } from './ShortcutsDialog'
import { openAssistantEvent } from '@/context/AgentContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ACCOUNT_ITEMS, ADMIN_ITEM, CREATE_SECTION, NAV_SECTIONS } from '@/config/nav'
import { useAuth } from '@/context/AuthContext'
import { useSite } from '@/context/SiteContext'
import { featureForPath } from '@/lib/site'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import type { Problem, ProblemsResponse } from '@/components/problems/types'
// Theme entries (Theme Centre)
import { useTheme } from '@/context/ThemeContext'
import { PALETTES } from '@/theme/palettes'

type Item = {
  id: string
  group: 'Go to' | 'Problems' | 'Themes' | 'Actions'
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  problem?: Problem
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
  const [results, setResults] = useState<Problem[]>([])
  const [active, setActive] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { can, featureOn, isStaff } = useSite()
  const { mode, setAppearance, setLook } = useTheme()

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setActive(0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  // Debounced problem search
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
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
  }, [query, open])

  const go = useCallback(
    (to: string, external?: boolean) => {
      close()
      if (external) window.location.href = to
      else navigate(to)
    },
    [close, navigate],
  )

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const pages = [
      ...NAV_SECTIONS.flatMap((s) => s.items).filter((i) => featureOn(featureForPath(i.to))),
      // Creator tools follow the problems.manage permission (admins by default).
      ...CREATE_SECTION.items.filter((i) => !i.adminOnly || can('problems.manage')),
      ...ACCOUNT_ITEMS,
      ...(isStaff ? [ADMIN_ITEM] : []),
    ].map<Item>((n) => ({
      id: `page:${n.to}`,
      group: 'Go to',
      label: n.label,
      hint: n.to,
      icon: iconComponent(n.icon),
      run: () => go(n.to, n.external),
    }))
    const actions: Item[] = [
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
        hint: 'Toggle light/dark',
        icon: iconComponent(mode === 'dark' ? 'sun' : 'moon'),
        run: () => {
          close()
          setAppearance(mode === 'dark' ? 'light' : 'dark')
        },
      },
      { id: 'act:themes', group: 'Actions', label: 'Switch theme…', hint: 'Theme Centre', icon: iconComponent('palette'), run: () => go('/theme') },
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
        id: 'act:assistant',
        group: 'Actions',
        label: q.length >= 2 ? `Ask NexoraGuru AI: “${query.trim()}”` : 'Ask NexoraGuru AI',
        hint: '⌘J',
        icon: iconComponent('sparkles'),
        run: () => {
          close()
          openAssistantEvent(q.length >= 2 ? query.trim() : undefined)
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
    ]
    const match = (i: Item) => !q || i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)
    const problemItems: Item[] = results.map((p) => ({
      id: `problem:${p.id}`,
      group: 'Problems',
      label: p.title,
      hint: `${p.problem_id}${p.rating ? ` · ${p.rating}` : ''}`,
      icon: iconComponent('problems'),
      problem: p,
      run: () => go(`/solve/${p.id}`),
    }))
    if (q.length >= 2) {
      problemItems.push({
        id: 'act:search-all',
        group: 'Problems',
        label: `Search all problems for “${query.trim()}”`,
        icon: iconComponent('search'),
        run: () => go(`/problems?q=${encodeURIComponent(query.trim())}`),
      })
    }
    // Typing a theme's name offers to apply it directly.
    const themeItems: Item[] =
      q.length >= 2
        ? PALETTES.filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map((p) => ({
              id: `theme:${p.id}`,
              group: 'Themes',
              label: `Use theme: ${p.name}`,
              hint: p.dark && p.light ? 'Light & dark' : p.dark ? 'Dark' : 'Light',
              icon: iconComponent('palette'),
              run: () => {
                close()
                setLook({ theme: p.id })
              },
            }))
        : []
    return [...pages.filter(match), ...problemItems, ...themeItems, ...actions.filter(match)]
  }, [query, results, can, featureOn, isStaff, go, close, logout, navigate, mode, setAppearance, setLook])

  useEffect(() => setActive(0), [query, results.length])

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
          <motion.div
            className="absolute inset-0 bg-bg-app/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="pop-surface relative w-full max-w-[640px] overflow-hidden !rounded-2xl"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 36 }}
          >
            <span aria-hidden="true" className="hairline-top pointer-events-none absolute inset-x-0 top-0 h-px" />
            <div className="flex items-center gap-3 border-b border-border/10 px-4">
              <Search className="size-4 shrink-0 text-accent-brand" aria-hidden="true" />
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
                className="h-14 w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-primary/60 focus:outline-none"
              />
              <Kbd className="hidden sm:inline-flex">ESC</Kbd>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-text-secondary">
                  {searching ? 'Searching the rift…' : 'Nothing matches that. Try a problem name or page.'}
                </p>
              )}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null
                lastGroup = item.group
                const Icon = item.icon
                return (
                  <div key={item.id}>
                    {header && (
                      <p className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-text-secondary uppercase">
                        {header}
                        {header === 'Problems' && searching && <span className="ml-2 normal-case">searching…</span>}
                      </p>
                    )}
                    <button
                      id={`palette-${item.id}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => void item.run()}
                      className={cn(
                        'relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        i === active ? 'bg-bg-app/5 text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {i === active && (
                        <motion.span
                          layoutId="palette-active"
                          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent-brand"
                          transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                        />
                      )}
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md border',
                          i === active ? 'border-accent-brand/40 bg-accent-brand/15 text-accent-brand' : 'border-border/10 bg-bg-app/5 text-text-secondary',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.problem ? (
                        <PlatformBadge platform={item.problem.platform} />
                      ) : (
                        item.hint && <span className="font-mono text-[11px] text-text-secondary">{item.hint}</span>
                      )}
                      {i === active && <ArrowRight className="size-3.5 text-accent-brand" aria-hidden="true" />}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-border/10 bg-bg-app/20 px-4 py-2.5 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                open
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
