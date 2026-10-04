import { Minus, Plus, RotateCcw } from 'lucide-react'
import { motion, Reorder, useReducedMotion } from 'motion/react'
import { Button, Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  DEFAULT_DOCK,
  DOCK_BY_ID,
  DOCK_ITEMS,
  MAX_PINNED,
  setDock,
  tileStyle,
  useDock,
  type DockItem,
} from './dockStore'

function Tile({ item, mono, size = 44 }: { item: DockItem; mono: boolean; size?: number }) {
  const Icon = item.icon
  return (
    <span
      className={cn('flex items-center justify-center rounded-[28%]', mono ? 'bg-bg-surface-3 ring-1 ring-border' : 'dock-tile')}
      style={{ width: size, height: size, ...(mono ? {} : tileStyle(item)) }}
    >
      <Icon className={cn('size-[46%]', mono ? 'text-text-primary' : 'text-white')} aria-hidden="true" />
    </span>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors hover:!scale-100',
        on ? 'bg-accent-brand' : 'bg-bg-surface-4 ring-1 ring-border',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow', on ? 'right-[2px]' : 'left-[2px]')}
      />
    </button>
  )
}

/**
 * Customize Dock. The top row is the Dock itself in edit mode: drag icons to
 * reorder them (they wiggle, as on a phone home screen), tap the minus badge
 * to take one out. Below is everything that can be added. Changes apply to
 * the live Dock immediately and are saved to the account.
 */
export function DockEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dock = useDock()
  const reduce = useReducedMotion()
  const mono = dock.iconStyle === 'mono'
  const available = DOCK_ITEMS.filter((i) => !dock.pinned.includes(i.id))
  const full = dock.pinned.length >= MAX_PINNED

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Customize Dock"
      description="Drag to reorder. Your first tabs also become the phone tab bar."
    >
      <div className="space-y-6 p-5">
        {/* The Dock, in edit mode */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="mb-0 text-[11px] font-semibold tracking-[0.08em] text-text-secondary uppercase">In your Dock</h3>
            <span className="font-mono text-[11px] text-text-muted tabular-nums">
              {dock.pinned.length} / {MAX_PINNED}
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-bg-surface-2 px-3 pt-4 pb-3 ring-1 ring-border">
            <Reorder.Group
              axis="x"
              values={dock.pinned}
              onReorder={(pinned) => setDock({ pinned })}
              className="flex min-w-max items-start gap-2.5"
            >
              {dock.pinned.map((id, i) => {
                const item = DOCK_BY_ID.get(id)
                if (!item) return null
                return (
                  <Reorder.Item
                    key={id}
                    value={id}
                    className="relative flex w-[58px] cursor-grab touch-none flex-col items-center gap-1.5 select-none active:cursor-grabbing"
                    whileDrag={{ scale: 1.12, zIndex: 10 }}
                  >
                    <motion.span
                      className="block"
                      animate={reduce ? undefined : { rotate: [-1.6, 1.6, -1.6] }}
                      transition={{ duration: 0.32 + (i % 3) * 0.04, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Tile item={item} mono={mono} />
                    </motion.span>
                    <span className="w-full truncate text-center text-[10.5px] text-text-secondary">{item.label}</span>
                    {dock.pinned.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${item.label} from the Dock`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setDock({ pinned: dock.pinned.filter((p) => p !== id) })}
                        className="absolute -top-1.5 left-0.5 flex size-[20px] cursor-pointer items-center justify-center rounded-full bg-[oklch(0.42_0.01_265)] text-white shadow-md ring-2 ring-[var(--color-bg-surface-2)] hover:!scale-110 hover:bg-state-error hover:text-white"
                      >
                        <Minus className="size-3" strokeWidth={3} aria-hidden="true" />
                      </button>
                    )}
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </div>
        </section>

        {/* Everything else */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-text-secondary uppercase">
            Add to Dock{full && <span className="ml-2 font-normal tracking-normal normal-case text-text-muted">— the Dock is full, remove one first</span>}
          </h3>
          {available.length === 0 ? (
            <p className="text-[12.5px] text-text-muted">Everything is already in your Dock.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={full}
                  onClick={() => setDock({ pinned: [...dock.pinned, item.id] })}
                  className="group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors hover:!scale-100 hover:bg-bg-surface-3 disabled:cursor-not-allowed"
                >
                  <span className="relative">
                    <Tile item={item} mono={mono} size={40} />
                    <span className="absolute -top-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-state-success text-white shadow ring-2 ring-[var(--color-bg-surface)] transition-transform group-hover:scale-110">
                      <Plus className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-text-secondary group-hover:text-text-primary">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Behaviour */}
        <section className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-2 px-4 py-3 ring-1 ring-border">
            <div>
              <p className="mb-0 text-[13px] font-medium text-text-primary">Magnification</p>
              <p className="mb-0 text-[11.5px] text-text-muted">Icons swell as the pointer passes over.</p>
            </div>
            <Toggle on={dock.magnify} onChange={(magnify) => setDock({ magnify })} label="Magnification" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-2 px-4 py-3 ring-1 ring-border">
            <div>
              <p className="mb-0 text-[13px] font-medium text-text-primary">Colour icons</p>
              <p className="mb-0 text-[11.5px] text-text-muted">Off for plain monochrome glyphs.</p>
            </div>
            <Toggle on={!mono} onChange={(c) => setDock({ iconStyle: c ? 'colour' : 'mono' })} label="Colour icons" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-2 px-4 py-3 ring-1 ring-border">
            <div>
              <p className="mb-0 text-[13px] font-medium text-text-primary">Auto-hide</p>
              <p className="mb-0 text-[11.5px] text-text-muted">
                Slips away until your cursor nears the bottom. Always hidden while solving a problem or reading a lesson.
              </p>
            </div>
            <Toggle on={dock.autoHide} onChange={(autoHide) => setDock({ autoHide })} label="Auto-hide the Dock" />
          </div>
        </section>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setDock(DEFAULT_DOCK)}>
            <RotateCcw aria-hidden="true" /> Reset to default
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
