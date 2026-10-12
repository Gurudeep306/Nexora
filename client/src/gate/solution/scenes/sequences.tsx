import { AnimatePresence, motion } from 'motion/react'
import type { ArrayFrame, Cell, QueueFrame, StackFrame, Tone } from '../types'
import { Pop, Scroll } from './common'
import { EASE, cellObj, show } from './geometry'

const cellWidth = (cells: Cell[]) => Math.max(42, Math.max(...cells.map((c) => show(cellObj(c).v).length), 1) * 9 + 24)

/** Stable keys for list items: explicit id, else value + occurrence (so shifts glide). */
function itemKeys(cells: Cell[]) {
  const seen = new Map<string, number>()
  return cells.map((c) => {
    const o = cellObj(c)
    if (o.id) return o.id
    const v = show(o.v)
    const k = seen.get(v) ?? 0
    seen.set(v, k + 1)
    return `${v}#${k}`
  })
}

function CellBox({ c, tone, w, layoutKey }: { c: Cell; tone?: Tone; w: number; layoutKey: string }) {
  const o = cellObj(c)
  const t = tone ?? o.tone ?? 'default'
  return (
    <motion.div
      layout
      layoutId={layoutKey}
      transition={EASE}
      className="sc-cell"
      data-tone={t}
      data-empty={o.v === null ? 'true' : undefined}
      style={{ width: w }}
    >
      <Pop value={o.v === null ? '' : o.v} />
      {o.sub && <span className="sc-cell-sub">{o.sub}</span>}
    </motion.div>
  )
}

export function ArrayScene({ f }: { f: ArrayFrame }) {
  const n = f.cells.length
  const w = cellWidth(f.cells)
  const linked = f.variant === 'linked'
  const col = (i: number) => (linked ? 2 * i + 1 : i + 1) + (f.label ? 1 : 0)
  const tones: (Tone | undefined)[] = Array(n).fill(undefined)
  for (const h of f.hl ?? []) {
    const [a, b] = Array.isArray(h.at) ? h.at : [h.at, h.at]
    for (let i = Math.max(0, a); i <= Math.min(n - 1, b); i++) tones[i] = h.tone ?? 'accent'
  }
  const byAt = new Map<number, NonNullable<ArrayFrame['pointers']>>()
  for (const p of f.pointers ?? []) {
    const at = Math.min(Math.max(p.at, 0), n - 1)
    byAt.set(at, [...(byAt.get(at) ?? []), p])
  }
  const template = [f.label ? 'auto' : '', ...Array.from({ length: n }, (_, i) => (linked && i < n - 1 ? `${w}px 28px` : linked ? `${w}px 40px` : `${w}px`))]
    .filter(Boolean)
    .join(' ')
  const base = f.indexBase ?? 0
  return (
    <Scroll>
      <div className="grid items-center gap-x-1.5 gap-y-1.5" style={{ gridTemplateColumns: template }}>
        {f.label && (
          <div className="sc-label pr-2" style={{ gridColumn: 1, gridRow: 1 }}>
            {f.label}
          </div>
        )}
        {f.cells.map((c, i) => (
          <div key={cellObj(c).id ?? `i${i}`} style={{ gridColumn: col(i), gridRow: 1 }}>
            <CellBox c={c} tone={tones[i]} w={w} layoutKey={`cell-${cellObj(c).id ?? i}`} />
          </div>
        ))}
        {linked &&
          f.cells.map((_, i) => (
            <svg key={`a${i}`} width={i < n - 1 ? 28 : 40} height="16" style={{ gridColumn: col(i) + 1, gridRow: 1 }} aria-hidden>
              <line x1="2" y1="8" x2={i < n - 1 ? 20 : 14} y2="8" className="sc-edge" data-tone="default" />
              <polygon points={i < n - 1 ? '26,8 19,4 19,12' : '20,8 13,4 13,12'} className="sc-arrowhead" data-tone="default" />
              {i === n - 1 && (
                <text x="23" y="12" className="sc-svg-small">
                  ∅
                </text>
              )}
            </svg>
          ))}
        {f.showIndex !== false &&
          f.cells.map((_, i) => (
            <div key={`ix${i}`} className="sc-idx" style={{ gridColumn: col(i), gridRow: 2 }}>
              {i + base}
            </div>
          ))}
        {[...byAt.entries()].map(([at, ps]) => (
          <div key={`p${at}`} className="flex flex-col items-center gap-0.5" style={{ gridColumn: col(at), gridRow: 3 }}>
            {ps.map((p) => (
              <motion.span key={p.name} layoutId={`ptr-${p.name}`} transition={EASE} className="sc-ptr" data-tone={p.tone ?? 'accent'}>
                {p.name}
              </motion.span>
            ))}
          </div>
        ))}
        {(f.ranges ?? []).map((r, i) => (
          <motion.div
            key={`r${i}`}
            layout
            transition={EASE}
            data-tone={r.tone ?? 'info'}
            className="flex flex-col items-center"
            style={{ gridColumn: `${col(r.from)} / ${col(r.to) + 1}`, gridRow: 4 + i }}
          >
            <div className="h-2 w-full rounded-b-md border-x-2 border-b-2" style={{ borderColor: 'var(--t)' }} />
            {r.label && <span className="sc-label mt-0.5" style={{ color: 'var(--t)' }}>{r.label}</span>}
          </motion.div>
        ))}
      </div>
    </Scroll>
  )
}

export function StackScene({ f }: { f: StackFrame }) {
  const keys = itemKeys(f.items)
  const w = Math.max(84, cellWidth(f.items) + 30)
  const tones = new Map((f.hl ?? []).map((h) => [h.at, h.tone ?? 'accent']))
  return (
    <div className="flex items-end justify-center gap-4">
      <div className="flex flex-col items-center">
        <div className="relative h-10" style={{ width: w }}>
          <AnimatePresence>
            {f.popped !== undefined && (
              <motion.div
                key={`popped-${show(f.popped)}`}
                className="sc-cell absolute inset-x-0"
                data-tone="muted"
                initial={{ opacity: 0.9, y: 30 }}
                animate={{ opacity: 0.55, y: 0 }}
                exit={{ opacity: 0 }}
                transition={EASE}
              >
                {show(f.popped)} ↑
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col-reverse gap-1.5 rounded-b-xl border-x-2 border-b-2 border-[var(--color-border-strong)] p-1.5" style={{ minHeight: 56, width: w + 16 }}>
          <AnimatePresence initial={false}>
            {f.items.map((c, i) => (
              <motion.div
                key={keys[i]}
                layout
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={EASE}
                className="sc-cell"
                data-tone={tones.get(i) ?? cellObj(c).tone ?? (i === f.items.length - 1 ? 'accent' : 'default')}
                style={{ width: w }}
              >
                {show(cellObj(c).v)}
                {cellObj(c).sub && <span className="sc-cell-sub">{cellObj(c).sub}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <span className="sc-label mt-1">{f.label ?? 'stack'}</span>
      </div>
      {f.items.length > 0 && <span className="sc-ptr mb-12" data-tone="accent" style={{ transform: 'rotate(-90deg)' }}>top</span>}
    </div>
  )
}

export function QueueScene({ f }: { f: QueueFrame }) {
  const keys = itemKeys(f.items)
  const w = cellWidth(f.items)
  const tones = new Map((f.hl ?? []).map((h) => [h.at, h.tone ?? 'accent']))
  return (
    <Scroll>
      <div className="flex items-center gap-3">
        <AnimatePresence>
          {f.dequeued !== undefined && (
            <motion.div
              key={`dq-${show(f.dequeued)}`}
              className="sc-cell"
              data-tone="muted"
              initial={{ opacity: 0.9, x: 40 }}
              animate={{ opacity: 0.55, x: 0 }}
              exit={{ opacity: 0 }}
              transition={EASE}
              style={{ width: w }}
            >
              ← {show(f.dequeued)}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col items-center gap-1">
          <div className="flex min-h-[3.2rem] min-w-[6rem] items-center gap-1.5 rounded-xl border-y-2 border-[var(--color-border-strong)] px-2 py-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {f.items.map((c, i) => (
                <motion.div
                  key={keys[i]}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={EASE}
                  className="sc-cell"
                  data-tone={tones.get(i) ?? cellObj(c).tone ?? 'default'}
                  style={{ width: w }}
                >
                  {show(cellObj(c).v)}
                  {cellObj(c).sub && <span className="sc-cell-sub">{cellObj(c).sub}</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex w-full justify-between px-1">
            <span className="sc-ptr" data-tone="accent">front</span>
            <span className="sc-label">{f.label ?? 'queue'}</span>
            <span className="sc-ptr" data-tone="info">rear</span>
          </div>
        </div>
      </div>
    </Scroll>
  )
}
