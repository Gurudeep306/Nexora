/* ────────────────────────────────────────────────────────────────────────
   Hive launcher — every feature in one honeycomb grid, grouped by what you
   want to do, searchable, one keystroke away (⌘. or the grid button in the
   rail). The rail keeps only the places you use all the time; nothing is
   hidden or removed — it's all here.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LaunchItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; hint?: string; hue: number; badge?: number }
export type LaunchGroup = { title: string; blurb: string; items: LaunchItem[] }

export function Launcher({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: LaunchGroup[] }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  useEffect(() => {
    if (!open) setQ('')
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  const shown = useMemo(() => {
    const w = q.toLowerCase().trim()
    if (!w) return groups
    return groups.map((g) => ({ ...g, items: g.items.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(w)) })).filter((g) => g.items.length)
  }, [q, groups])
  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  let n = 0
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[950] flex items-start justify-center overflow-y-auto p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]" role="dialog" aria-label="All of Hive">
          <motion.button type="button" aria-label="Close" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-bg-app/70 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="hive-card relative w-full max-w-4xl overflow-hidden rounded-3xl">
            <div className="flex items-center gap-3 border-b hive-line px-4 py-3">
              <Search className="size-4 text-text-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find any part of Hive…" className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted" aria-label="Search features" />
              <span className="hive-kbd hidden sm:inline">esc</span>
              <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06]" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="hive-scroll max-h-[72vh] overflow-y-auto p-4 sm:p-5">
              {!shown.length && <p className="py-10 text-center text-[13px] text-text-muted">Nothing called “{q}”.</p>}
              <div className="space-y-6">
                {shown.map((g) => (
                  <section key={g.title}>
                    <div className="mb-2.5 flex items-baseline gap-2">
                      <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-secondary">{g.title}</h3>
                      <span className="truncate text-[12px] text-text-muted">{g.blurb}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {g.items.map((it) => {
                        const i = n++
                        return (
                          <motion.button
                            key={it.to + it.label}
                            type="button"
                            onClick={() => go(it.to)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 24) * 0.012, duration: 0.2 } }}
                            className="hive-launcher-tile group flex items-start gap-3 rounded-2xl border border-transparent p-3 text-left hover:border-[var(--hive-line-strong)] hover:bg-text-primary/[0.03]"
                          >
                            <span className="hive-hex-tile relative grid size-11 shrink-0 place-items-center" style={{ background: `linear-gradient(140deg, oklch(70% 0.15 ${it.hue}), oklch(58% 0.17 ${it.hue + 30}))` }}>
                              <it.icon className="size-[18px] text-white" />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-text-primary">
                                {it.label}
                                {it.badge ? <span className="rounded-full bg-state-warning px-1.5 text-[10px] font-bold text-white">{it.badge}</span> : null}
                              </span>
                              {it.hint && <span className={cn('mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-text-muted')}>{it.hint}</span>}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
