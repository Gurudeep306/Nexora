import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kbd, Modal } from '@/components/ui'
import { GO_SHORTCUTS } from '@/config/nav'
import { openCommandPalette } from './CommandPalette'

export const openShortcuts = () => window.dispatchEvent(new Event('nexora:shortcuts'))

const LABELS: Record<string, string> = {
  '/hub': 'Hub',
  '/problems': 'Problems',
  '/contests': 'Contests',
  '/nexus': 'Nexus',
  '/analytics': 'Analytics',
  '/learn': 'Learn',
  '/social': 'Social',
  '/bookmarks': 'Bookmarks',
  '/submissions': 'Submissions',
  '/ailab': 'AI Lab',
  '/settings': 'Settings',
}

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('.monaco-editor'))
}

/** Global "g + key" navigation and the "?" cheat-sheet. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pendingG = useRef<number | null>(null)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === '?') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (pendingG.current != null) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        const to = GO_SHORTCUTS[e.key.toLowerCase()]
        if (to) {
          e.preventDefault()
          navigate(to)
        }
        return
      }
      if (e.key === 'g') pendingG.current = window.setTimeout(() => (pendingG.current = null), 900)
    }
    window.addEventListener('nexora:shortcuts', onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('nexora:shortcuts', onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate])

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" description="Move around Nexora without touching the mouse." size="md">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-foreground-faint uppercase">General</h3>
          <ul className="space-y-1.5 text-sm">
            <Row label="Search / command palette" keys={['⌘', 'K']} onClick={() => { setOpen(false); openCommandPalette() }} />
            <Row label="Quick search" keys={['/']} />
            <Row label="This cheat-sheet" keys={['?']} />
            <Row label="Close dialogs" keys={['Esc']} />
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-foreground-faint uppercase">Go to</h3>
          <ul className="space-y-1.5 text-sm">
            {Object.entries(GO_SHORTCUTS).map(([k, to]) => (
              <Row key={k} label={LABELS[to] ?? to} keys={['G', k.toUpperCase()]} />
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  )
}

function Row({ label, keys, onClick }: { label: string; keys: string[]; onClick?: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-1 py-0.5">
      {onClick ? (
        <button onClick={onClick} className="cursor-pointer text-left text-foreground-dim hover:text-foreground">
          {label}
        </button>
      ) : (
        <span className="text-foreground-dim">{label}</span>
      )}
      <span className="flex gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </li>
  )
}
