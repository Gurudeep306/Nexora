import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar } from '@/components/ui/Avatar'
import { formatNumber } from '@/lib/utils'
import type { Web } from './lattice'
import type { WebFilter } from './NexusWeb'
import type { RiftPlayer, WebRoute } from './types'

/*
 * The floating, card-free type that lives on the web: the web-rank line,
 * instant search, and the route / filter / memory controls. Text only —
 * underlines mark what is active; nothing has a box.
 */

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

/** You, as one line of type: avatar, rank, a hairline of XP, the numbers. */
export function WebRankLine({
  player,
  username,
  avatarUrl,
  avatar,
  displayName,
  mastered,
  total,
  streak,
  className = '',
  onWeb = true,
}: {
  player: RiftPlayer
  username: string
  avatarUrl?: string | null
  avatar?: string | null
  displayName?: string
  mastered: number
  total: number
  streak?: number
  className?: string
  /** On the night web (light type) or on the page (theme type). */
  onWeb?: boolean
}) {
  const pct = Math.round((Math.max(0, player.xpInLevel) / Math.max(1, player.xpForNext)) * 100)
  return (
    <div className={`nx-me ${onWeb ? 'nx-over' : 'nx-me-page'} ${className}`}>
      <Avatar src={avatarUrl} avatar={avatar} name={displayName ?? username} seed={username} size="sm" ring={false} />
      <div className="min-w-0">
        <p className="nx-caps mb-0">Web rank</p>
        <p className="nx-me-name mb-0 truncate font-display text-[15px] leading-tight font-semibold">
          {player.name} <span className="nx-me-dim font-normal">· LVL {player.level}</span>
        </p>
        <div className="nx-hair mt-1.5" aria-label={`${pct}% of the way to the next rank`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="nx-me-dim mt-1 mb-0 font-mono text-[10.5px] tabular-nums">
          {formatNumber(player.xp)} XP · {mastered}/{total} concepts{streak !== undefined ? ` · ${streak}d streak` : ''}
        </p>
      </div>
    </div>
  )
}

/** ⌘K / "/": type a concept or subject, Enter flies there. */
export function WebSearch(props: {
  web: Web
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (pick: { kind: 'concept' | 'subject'; id: string }) => void
  subjectsOnly?: boolean
}) {
  // A fresh box (empty query) every time it opens.
  return <AnimatePresence>{props.open && <SearchBox {...props} />}</AnimatePresence>
}

function SearchBox({
  web,
  onOpenChange,
  onPick,
  subjectsOnly = false,
}: {
  web: Web
  onOpenChange: (open: boolean) => void
  onPick: (pick: { kind: 'concept' | 'subject'; id: string }) => void
  subjectsOnly?: boolean
}) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const index = useMemo(() => {
    const subjects = web.regions.map((r) => ({ kind: 'subject' as const, id: r.cluster.id, label: r.cluster.name, meta: `${r.cluster.short} · subject`, hay: `${r.cluster.name} ${r.cluster.short}`.toLowerCase() }))
    const concepts = subjectsOnly
      ? []
      : [...web.concepts.values()].map((c) => ({ kind: 'concept' as const, id: c.key, label: c.node.n, meta: `${c.cluster.short} · ${c.node.s === 2 ? 'mastered' : c.node.s === 1 ? 'open' : 'locked'}`, hay: `${c.node.n} ${c.cluster.short} ${c.cluster.name}`.toLowerCase() }))
    return [...subjects, ...concepts]
  }, [web, subjectsOnly])
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return index.filter((x) => x.kind === 'subject').slice(0, 8)
    return index
      .filter((x) => terms.every((t) => x.hay.includes(t)))
      .sort((a, b) => Number(!a.label.toLowerCase().startsWith(terms[0])) - Number(!b.label.toLowerCase().startsWith(terms[0])) || a.label.length - b.label.length)
      .slice(0, 8)
  }, [q, index])
  useEffect(() => {
    requestAnimationFrame(() => input.current?.focus())
  }, [])
  const pick = (r: (typeof results)[number] | undefined) => {
    if (!r) return
    onPick({ kind: r.kind, id: r.id })
    onOpenChange(false)
  }
  return (
    <motion.div className="nx-over nx-search" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setI(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setI((x) => Math.min(results.length - 1, x + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setI((x) => Math.max(0, x - 1))
          } else if (e.key === 'Enter') pick(results[i])
          else if (e.key === 'Escape') onOpenChange(false)
        }}
        onBlur={() => window.setTimeout(() => onOpenChange(false), 120)}
        placeholder={subjectsOnly ? 'Pick a subject…' : 'Search a concept or subject…'}
        aria-label="Search the web"
        className="nx-search-input"
      />
      <ul className="nx-search-list" role="listbox">
        {results.map((r, k) => (
          <li key={`${r.kind}:${r.id}`} role="option" aria-selected={k === i}>
            <button type="button" className="nx-search-item" data-on={k === i || undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)} onMouseEnter={() => setI(k)}>
              <span className="nx-search-label">{r.label}</span>
              <span className="nx-search-meta">{r.meta}</span>
            </button>
          </li>
        ))}
        {!results.length && <li className="nx-search-meta px-0.5">Nothing matches — try fewer letters.</li>}
      </ul>
    </motion.div>
  )
}

/** One row of text choices: an underline marks the active one. */
function Choices<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="nx-row" role="radiogroup" aria-label={label}>
      <span className="nx-caps nx-row-label">{label}</span>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className="nx-link nx-link-sm" data-on={o.id === value || undefined} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Route, what to show, and the memory preview — three lines of type. */
export function WebControls({
  routes,
  route,
  onRoute,
  onCustomRoute,
  customName,
  filter,
  onFilter,
  domains,
  ahead,
  onAhead,
  routeNext,
}: {
  routes: WebRoute[]
  route: string | null
  onRoute: (id: string | null) => void
  onCustomRoute: () => void
  customName: string | null
  filter: WebFilter
  onFilter: (f: WebFilter) => void
  domains: string[]
  ahead: number
  onAhead: (d: number) => void
  routeNext: string[]
}) {
  const [domainsOpen, setDomainsOpen] = useState(false)
  return (
    <div className="nx-over nx-controls">
      <div className="nx-row" aria-label="Goal route">
        <span className="nx-caps nx-row-label">Route</span>
        <button type="button" className="nx-link nx-link-sm" data-on={!route || undefined} onClick={() => onRoute(null)}>
          none
        </button>
        {routes.map((r) => (
          <button key={r.id} type="button" className="nx-link nx-link-sm" data-on={route === r.id || undefined} title={r.description} onClick={() => onRoute(r.id)}>
            {r.name}
          </button>
        ))}
        <button type="button" className="nx-link nx-link-sm" data-on={route?.startsWith('subject:') || undefined} onClick={onCustomRoute}>
          {customName ?? 'custom…'}
        </button>
      </div>
      {route && routeNext.length > 0 && <p className="nx-route-next mb-0">Next: {routeNext.join('  →  ')}</p>}
      <div className="nx-row">
        <Choices
          label="Show"
          value={filter.mode}
          options={[
            { id: 'all', label: 'all' },
            { id: 'reachable', label: 'reachable now' },
            { id: 'fading', label: 'fading' },
            { id: 'mastered', label: 'mastered' },
          ]}
          onChange={(mode) => onFilter({ ...filter, mode })}
        />
        <button type="button" className="nx-link nx-link-sm" data-on={!!filter.domain || undefined} onClick={() => setDomainsOpen((v) => !v)} aria-expanded={domainsOpen}>
          {filter.domain ? filter.domain.replace(/-/g, ' ') : 'every domain'} ▾
        </button>
      </div>
      <AnimatePresence>
        {domainsOpen && (
          <motion.div className="nx-row nx-domains" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            {[null, ...domains].map((d) => (
              <button
                key={d ?? 'all'}
                type="button"
                className="nx-link nx-link-sm"
                data-on={filter.domain === d || undefined}
                onClick={() => {
                  onFilter({ ...filter, domain: d })
                  setDomainsOpen(false)
                }}
              >
                {d ? d.replace(/-/g, ' ') : 'every domain'}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <Choices
        label="Memory"
        value={String(ahead) as '0' | '7' | '30' | '90'}
        options={[
          { id: '0', label: 'now' },
          { id: '7', label: '+7 days' },
          { id: '30', label: '+30 days' },
          { id: '90', label: '+90 days' },
        ]}
        onChange={(v) => onAhead(Number(v))}
      />
    </div>
  )
}
