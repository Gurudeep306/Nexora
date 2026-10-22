import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { WebCluster, WebStream } from './types'

/*
 * ⌘K inside the Nexus: search every concept and subject, and run the
 * Nexus's commands (fit, fullscreen, next step, goal paths). Type to filter,
 * arrows to move, Enter to run, Esc to close.
 */

export interface PaletteCommand {
  id: string
  label: string
  hint?: string
  icon?: ReactNode
  run: () => void
}

type Row =
  | { kind: 'command'; id: string; label: string; hint?: string; icon?: ReactNode; run: () => void; hay: string }
  | { kind: 'subject'; id: string; label: string; hint: string; hue?: string; hay: string }
  | { kind: 'concept'; id: string; label: string; hint: string; hue?: string; state: number; hay: string }

export function NexusPalette({
  open,
  onClose,
  clusters,
  streams,
  commands,
  onSubject,
  onConcept,
}: {
  open: boolean
  onClose: () => void
  clusters: WebCluster[]
  streams: WebStream[]
  commands: PaletteCommand[]
  onSubject: (id: string) => void
  onConcept: (key: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg" className="nx-palette">
      {open && <PaletteBody clusters={clusters} streams={streams} commands={commands} onClose={onClose} onSubject={onSubject} onConcept={onConcept} />}
    </Modal>
  )
}

function PaletteBody({
  clusters,
  streams,
  commands,
  onClose,
  onSubject,
  onConcept,
}: {
  clusters: WebCluster[]
  streams: WebStream[]
  commands: PaletteCommand[]
  onClose: () => void
  onSubject: (id: string) => void
  onConcept: (key: string) => void
}) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const hue = useMemo(() => new Map(streams.map((s) => [s.id, s.hue])), [streams])
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = commands.map((c) => ({ kind: 'command', id: c.id, label: c.label, hint: c.hint, icon: c.icon, run: c.run, hay: `${c.label} ${c.hint ?? ''}`.toLowerCase() }))
    for (const c of clusters) {
      out.push({ kind: 'subject', id: c.id, label: c.name, hint: `${c.short} · subject`, hue: hue.get(c.stream), hay: `${c.name} ${c.short}`.toLowerCase() })
      for (const n of c.nodes) {
        out.push({
          kind: 'concept',
          id: `${c.id}:${n.id}`,
          label: n.n,
          hint: `${c.short} · ${n.s === 2 ? 'mastered' : n.s === 1 ? 'open' : 'locked'}`,
          hue: hue.get(c.stream),
          state: n.s,
          hay: `${n.n} ${c.short} ${c.name}`.toLowerCase(),
        })
      }
    }
    return out
  }, [clusters, commands, hue])
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return [...rows.filter((r) => r.kind === 'command'), ...rows.filter((r) => r.kind === 'subject').slice(0, 6)] as Row[]
    const first = terms[0]
    return rows
      .filter((r) => terms.every((t) => r.hay.includes(t)))
      .sort((a, b) => {
        const ka = a.kind === 'command' ? 0 : a.kind === 'subject' ? 1 : 2
        const kb = b.kind === 'command' ? 0 : b.kind === 'subject' ? 1 : 2
        const pa = a.label.toLowerCase().startsWith(first) ? 0 : 1
        const pb = b.label.toLowerCase().startsWith(first) ? 0 : 1
        return pa - pb || ka - kb || a.label.length - b.label.length
      })
      .slice(0, 12)
  }, [q, rows])
  useEffect(() => {
    requestAnimationFrame(() => input.current?.focus())
  }, [])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [i])
  const pick = (r: Row | undefined) => {
    if (!r) return
    onClose()
    if (r.kind === 'command') r.run()
    else if (r.kind === 'subject') onSubject(r.id)
    else onConcept(r.id)
  }
  return (
    <div className="-mx-5 -my-4">
      <label className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Search className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
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
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(results[i])
            }
          }}
          placeholder="Search concepts and subjects, or run a command…"
          aria-label="Search the Nexus"
          role="combobox"
          aria-expanded="true"
          aria-controls="nx-palette-list"
          aria-activedescendant={results[i] ? `nx-pal-${i}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted"
        />
        <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Esc</kbd>
      </label>
      <ul ref={list} id="nx-palette-list" role="listbox" className="max-h-[56vh] overflow-y-auto p-2">
        {results.map((r, k) => (
          <li key={`${r.kind}:${r.id}`} id={`nx-pal-${k}`} role="option" aria-selected={k === i} data-i={k}>
            <button
              type="button"
              onMouseEnter={() => setI(k)}
              onClick={() => pick(r)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150',
                k === i ? 'bg-text-primary/7' : 'hover:bg-text-primary/4',
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center text-text-muted" aria-hidden="true">
                {r.kind === 'command' ? (
                  r.icon
                ) : (
                  <span
                    className={cn('block rounded-full', r.kind === 'subject' ? 'size-2.5' : 'size-2')}
                    style={{ background: r.kind === 'concept' && r.state === 0 ? 'transparent' : r.hue, boxShadow: r.kind === 'concept' && r.state === 0 ? `inset 0 0 0 1.5px ${r.hue}` : undefined }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{r.label}</span>
              <span className="shrink-0 font-mono text-[11px] text-text-muted tabular-nums">{r.kind === 'command' ? (r.hint ?? 'command') : r.hint}</span>
              {k === i && <CornerDownLeft className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />}
            </button>
          </li>
        ))}
        {!results.length && <li className="px-3 py-6 text-center text-[13px] text-text-muted">Nothing matches — try fewer letters.</li>}
      </ul>
    </div>
  )
}
