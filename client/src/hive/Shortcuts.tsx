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

const ROWS: [string, string][] = [
  ['⌘K  or  /', 'Search or run a command'],
  ['⌘I', 'Open or close the Copilot panel'],
  ['⌘J', 'New chat'],
  ['C', 'New task (Copilot)'],
  ['⌘B  or  [', 'Show or hide the sidebar'],
  ...Object.entries(GO).map(([k, v]): [string, string] => [`G then ${k.toUpperCase()}`, `Go to ${v.label}`]),
  ['J / K', 'Next / previous item in lists'],
  ['Enter / Esc', 'Open / close'],
  ['⌘Enter', 'Send'],
  ['?', 'This sheet'],
]

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [on, setOn] = useState(singleKeysOn)
  useEffect(() => {
    if (open) setOn(singleKeysOn())
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
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
        {ROWS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <span className="hive-kbd">{k}</span>
            </dt>
            <dd className="text-[var(--hv-text-2)]">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="mt-5 flex items-center gap-2 border-t border-[var(--hv-border)] pt-4 text-[13px]">
        <input type="checkbox" checked={on} onChange={toggle} className="size-4 accent-[var(--hv-accent)]" />
        Single-key shortcuts (C, G then a letter, /, [, ?)
      </label>
    </Modal>
  )
}
