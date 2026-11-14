/* ────────────────────────────────────────────────────────────────────────
   Single-key shortcuts for Hive: never while typing, never with ⌘/Ctrl/Alt,
   and switchable off (WCAG 2.1.4). "G then X" goes somewhere; "?" shows the
   sheet. ⌘ shortcuts live with the shell (⌘K, ⌘I, ⌘J, ⌘B, ⌘.).
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui'

const PREF = 'hive:singleKeys'
export function singleKeysOn(): boolean {
  try {
    return localStorage.getItem(PREF) !== '0'
  } catch {
    return true
  }
}

const GO: Record<string, { to: string; label: string }> = {
  h: { to: '/hive', label: 'Home' },
  i: { to: '/hive/inbox', label: 'Inbox' },
  c: { to: '/hive/copilot', label: 'Copilot' },
  t: { to: '/hive/chat', label: 'Chat' },
  p: { to: '/hive/projects', label: 'Projects' },
  l: { to: '/hive/pipelines', label: 'Pipelines' },
  d: { to: '/hive/drive', label: 'Drive' },
  m: { to: '/hive/models', label: 'Models' },
  k: { to: '/hive/keys', label: 'Keys & limits' },
  e: { to: '/hive/extensions', label: 'Extensions' },
  s: { to: '/hive/spend', label: 'Spend' },
}

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest('[role="dialog"] input, [contenteditable="true"]'))
}

export function useShortcuts({ onPalette, onSheet, onToggleSide }: { onPalette: () => void; onSheet: () => void; onToggleSide: () => void }) {
  const navigate = useNavigate()
  const pendingG = useRef(0)
  // Latest callbacks without re-binding the listener on every render.
  const cb = useRef({ onPalette, onSheet, onToggleSide })
  cb.current = { onPalette, onSheet, onToggleSide }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘/ (Ctrl+/) opens the shortcut list from anywhere, even while typing.
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        cb.current.onSheet()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(e.target)) return
      if (!singleKeysOn()) return
      const k = e.key.toLowerCase()
      if (Date.now() - pendingG.current < 900 && GO[k]) {
        pendingG.current = 0
        e.preventDefault()
        navigate(GO[k].to)
        return
      }
      if (k === 'g') {
        pendingG.current = Date.now()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        cb.current.onSheet()
      } else if (k === '/') {
        e.preventDefault()
        cb.current.onPalette()
      } else if (k === '[') {
        e.preventDefault()
        cb.current.onToggleSide()
      } else if (k === 'c') {
        e.preventDefault()
        navigate('/hive/copilot')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Everywhere',
    rows: [
      ['⌘K  or  /', 'Search or run a command'],
      ['⌘I', 'Open or close the Copilot panel'],
      ['⌘J', 'New chat'],
      ['C', 'New task (Copilot)'],
      ['⌘B  or  [', 'Show or hide the sidebar'],
      ['?  or  ⌘/', 'This list'],
    ],
  },
  { title: 'Go to', rows: Object.entries(GO).map(([k, v]): [string, string] => [`G then ${k.toUpperCase()}`, v.label]) },
  {
    title: 'Lists and messages',
    rows: [
      ['J / K', 'Next / previous item'],
      ['Enter / Esc', 'Open / close'],
      ['Enter', 'Send'],
      ['Shift+Enter', 'New line'],
    ],
  },
]

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [on, setOn] = useState(singleKeysOn)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (open) {
      setOn(singleKeysOn())
      setQ('')
    }
  }, [open])
  const toggle = () => {
    const v = !on
    setOn(v)
    try {
      localStorage.setItem(PREF, v ? '1' : '0')
    } catch {
      /* private mode */
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" description="Everything in Hive is two keystrokes away.">
      <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search shortcuts" placeholder="Search shortcuts" className="mb-3 h-9 w-full rounded-[var(--hv-r-btn)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] px-3 text-[13px] outline-none placeholder:text-[var(--hv-text-3)] focus-visible:ring-2 focus-visible:ring-[var(--hv-accent)]" />
      <div className="hive-scroll max-h-[55vh] space-y-4 overflow-y-auto">
        {GROUPS.map((g) => {
          const rows = g.rows.filter(([k, v]) => !q.trim() || `${k} ${v} ${g.title}`.toLowerCase().includes(q.trim().toLowerCase()))
          if (!rows.length) return null
          return (
            <section key={g.title} aria-label={g.title}>
              <h3 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--hv-text-3)]">{g.title}</h3>
              <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-6 gap-y-1.5 text-[13px]">
                {rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt>
                      <span className="hive-kbd">{k}</span>
                    </dt>
                    <dd className="text-[var(--hv-text-2)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
      <label className="mt-5 flex items-center gap-2 border-t border-[var(--hv-border)] pt-4 text-[13px]">
        <input type="checkbox" checked={on} onChange={toggle} className="size-4 accent-[var(--hv-accent)]" />
        Single-key shortcuts (C, G then a letter, /, [, ?)
      </label>
    </Modal>
  )
}
