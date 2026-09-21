import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CornerDownLeft, Dices, LogOut, Search, Settings, Swords, UserRound } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ACCOUNT_ITEMS, CREATE_SECTION, NAV_SECTIONS } from '@/config/nav'
import { useAuth } from '@/context/AuthContext'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import type { Problem, ProblemsResponse } from '@/components/problems/types'

type Item = {
  id: string
  group: 'Go to' | 'Problems' | 'Actions'
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
  const { user, logout } = useAuth()

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
      ...NAV_SECTIONS.flatMap((s) => s.items),
      ...CREATE_SECTION.items.filter((i) => !i.adminOnly || user?.role === 'admin'),
      ...ACCOUNT_ITEMS,
    ].map<Item>((n) => ({
      id: `page:${n.to}`,
      group: 'Go to',
      label: n.label,
      hint: n.to,
      icon: n.icon,
      run: () => go(n.to, n.external),
    }))
    const actions: Item[] = [
      {
        id: 'act:random',
        group: 'Actions',
        label: 'Surprise me — random problem',
        icon: Dices,
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
      { id: 'act:profile', group: 'Actions', label: 'View my profile', icon: UserRound, run: () => go('/profile') },
      { id: 'act:avatar', group: 'Actions', label: 'Change my avatar', icon: Settings, run: () => go('/settings') },
      {
        id: 'act:logout',
        group: 'Actions',
        label: 'Log out',
        icon: LogOut,
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
      icon: Swords,
      problem: p,
      run: () => go(`/solve/${p.id}`),
    }))
    if (q.length >= 2) {
      problemItems.push({
        id: 'act:search-all',
        group: 'Problems',
        label: `Search all problems for “${query.trim()}”`,
        icon: Search,
        run: () => go(`/problems?q=${encodeURIComponent(query.trim())}`),
      })
    }
    return [...pages.filter(match), ...problemItems, ...actions.filter(match)]
  }, [query, results, user?.role, go, close, logout, navigate])

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
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="card-neon relative w-full max-w-xl overflow-hidden border-border-glow shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-primary-bright" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a page, search problems, or run an action…"
                aria-label="Command palette search"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
                className="h-14 w-full bg-transparent text-sm text-foreground placeholder:text-foreground-faint focus:outline-none"
              />
              <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-foreground-faint sm:block">
                ESC
              </kbd>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-foreground-faint">
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
                      <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.2em] text-foreground-faint uppercase">
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
                        'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        i === active ? 'bg-primary/15 text-foreground' : 'text-foreground-dim',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', i === active ? 'text-primary-bright' : 'text-foreground-faint')} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.problem ? (
                        <PlatformBadge platform={item.problem.platform} />
                      ) : (
                        item.hint && <span className="font-mono text-[11px] text-foreground-faint">{item.hint}</span>
                      )}
                      {i === active && <ArrowRight className="size-3.5 text-primary-bright" aria-hidden="true" />}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-border bg-surface-2/40 px-4 py-2 text-[11px] text-foreground-faint">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 font-mono">↑</kbd>
                <kbd className="rounded border border-border px-1 font-mono">↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="size-3" /> open
              </span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="rounded border border-border px-1 font-mono">/</kbd> or
                <kbd className="rounded border border-border px-1 font-mono">⌘K</kbd> anywhere
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
