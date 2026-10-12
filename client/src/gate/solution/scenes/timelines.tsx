import { AnimatePresence, motion } from 'motion/react'
import type { GanttFrame, SequenceFrame, Tone } from '../types'
import { Svg } from './common'
import { EASE, arrowHead } from './geometry'

const CYCLE: Tone[] = ['accent', 'cat1', 'cat2', 'info', 'cat3', 'warning', 'success']

/** Same label → same colour across every lane and frame. */
function labelTones(labels: string[]) {
  const m = new Map<string, Tone>()
  for (const l of labels) if (!m.has(l)) m.set(l, CYCLE[m.size % CYCLE.length])
  return m
}

export function GanttScene({ f }: { f: GanttFrame }) {
  const bars = f.lanes.flatMap((l) => l.bars)
  const times = [...bars.flatMap((b) => [b.start, b.end]), ...(f.marks ?? []).map((m) => m.t), ...(f.cursor != null ? [f.cursor] : [])]
  const t0 = Math.min(0, ...times)
  const t1 = Math.max(...times, t0 + 1)
  const px = Math.min(64, Math.max(16, 600 / (t1 - t0)))
  const labelW = f.lanes.some((l) => l.label) ? Math.max(52, ...f.lanes.map((l) => (l.label ?? '').length * 7.5 + 16)) : 6
  const laneH = 40
  const lanesH = f.lanes.length * (laneH + 8)
  const upto = f.upto ?? Infinity
  const X = (t: number) => labelW + (t - t0) * px
  const tones = labelTones(bars.map((b) => b.label))
  const ticks = [...new Set(bars.flatMap((b) => [b.start, Math.min(b.end, upto)]).filter((t) => t <= upto && t >= t0))].sort((a, b) => a - b)
  // stagger marks that share an instant
  const markRow = new Map<number, number>()
  const marks = (f.marks ?? []).map((m) => {
    const k = markRow.get(m.t) ?? 0
    markRow.set(m.t, k + 1)
    return { ...m, row: k }
  })
  const markRows = Math.max(0, ...marks.map((m) => m.row + 1))
  const axisY = lanesH + 4
  const H = axisY + 22 + markRows * 18 + (markRows ? 8 : 0)
  const W = X(t1) + 18
  return (
    <Svg width={W} height={H} label="Gantt chart" minScale={0.7}>
      {f.lanes.map((lane, li) => {
        const y = li * (laneH + 8)
        return (
          <g key={li}>
            <rect x={labelW} y={y} width={X(t1) - labelW} height={laneH} rx={8} style={{ fill: 'var(--color-bg-surface-2)', opacity: 0.6 }} />
            {lane.label && (
              <text x={labelW - 8} y={y + laneH / 2 + 4} textAnchor="end" className="sc-svg-small" style={{ fontWeight: 600 }}>
                {lane.label}
              </text>
            )}
            <AnimatePresence initial={false}>
              {lane.bars
                .filter((b) => b.start < upto)
                .map((b) => {
                  const end = Math.min(b.end, upto)
                  const w = Math.max(0, (end - b.start) * px)
                  const tone = b.tone ?? tones.get(b.label) ?? 'accent'
                  const fits = w > b.label.length * 7.5 + 6
                  return (
                    <motion.g key={`${b.start}-${b.label}`} data-tone={tone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                      <motion.rect
                        x={X(b.start) + 1}
                        y={y + 3}
                        height={laneH - 6}
                        rx={6}
                        initial={{ width: 0 }}
                        animate={{ width: Math.max(0, w - 2) }}
                        transition={EASE}
                        className="sc-node"
                        data-tone={tone}
                        style={{ strokeWidth: 1.75 }}
                      />
                      {fits && (
                        <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} x={X(b.start) + w / 2} y={y + laneH / 2 + 4.5} textAnchor="middle" className="sc-svg-label sc-mono">
                          {b.label}
                        </motion.text>
                      )}
                    </motion.g>
                  )
                })}
            </AnimatePresence>
          </g>
        )
      })}
      <line x1={labelW} y1={axisY} x2={X(t1)} y2={axisY} className="sc-axis" />
      {ticks.map((t) => (
        <motion.g key={`t${t}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={EASE}>
          <line x1={X(t)} y1={axisY - 3} x2={X(t)} y2={axisY + 3} className="sc-axis" />
          <text x={X(t)} y={axisY + 15} textAnchor="middle" className="sc-svg-small sc-mono">
            {t}
          </text>
        </motion.g>
      ))}
      {f.unit && (
        <text x={X(t1) + 4} y={axisY + 15} className="sc-svg-small sc-svg-muted">
          {f.unit}
        </text>
      )}
      {marks.map((m, i) => {
        const y = axisY + 24 + m.row * 18
        return (
          <g key={`m${i}`} data-tone={m.tone ?? 'info'}>
            <polygon points={`${X(m.t)},${y - 8} ${X(m.t) - 4},${y - 1} ${X(m.t) + 4},${y - 1}`} style={{ fill: 'var(--t)' }} />
            <text x={X(m.t) + 7} y={y + 1} className="sc-svg-small" style={{ fill: 'var(--t)', fontWeight: 700 }}>
              {m.label}
            </text>
          </g>
        )
      })}
      {f.cursor != null && (
        <motion.line initial={false} animate={{ x1: X(f.cursor), x2: X(f.cursor) }} y1={-4} y2={axisY + 4} transition={EASE} className="sc-cursor" />
      )}
    </Svg>
  )
}

export function SequenceScene({ f }: { f: SequenceFrame }) {
  const colW = 150
  const n = f.actors.length
  const ts = f.messages.flatMap((m) => [m.t0, m.t1 ?? m.t0 + 1])
  const t0 = Math.min(0, ...ts)
  const t1 = Math.max(1, ...ts)
  const py = Math.min(48, Math.max(22, 300 / (t1 - t0)))
  const top = 34
  const Y = (t: number) => top + (t - t0) * py
  const X = (a: string) => 60 + f.actors.indexOf(a) * colW
  const W = 60 + (n - 1) * colW + 70
  const H = Y(t1) + 20
  const upto = f.upto ?? Infinity
  return (
    <Svg width={W} height={H} label="message sequence">
      {f.actors.map((a) => (
        <g key={a}>
          <rect x={X(a) - 42} y={0} width={84} height={24} rx={8} className="sc-node" data-tone="default" />
          <text x={X(a)} y={16} textAnchor="middle" className="sc-svg-label">
            {a}
          </text>
          <line x1={X(a)} y1={24} x2={X(a)} y2={H - 6} className="sc-grid" />
        </g>
      ))}
      {[...new Set(ts)].sort((a, b) => a - b).map((t) => (
        <text key={t} x={8} y={Y(t) + 4} className="sc-svg-small sc-mono sc-svg-muted">
          {t}
          {f.unit && t === t1 ? ` ${f.unit}` : ''}
        </text>
      ))}
      <AnimatePresence initial={false}>
        {f.messages
          .filter((m) => m.t0 <= upto)
          .map((m, i) => {
            const a = { x: X(m.from), y: Y(m.t0) }
            const end = m.t1 ?? m.t0 + 1
            const b = { x: X(m.to), y: Y(end) }
            const tip = m.lost ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : b
            const len = Math.hypot(tip.x - a.x, tip.y - a.y) || 1
            const u = { x: (tip.x - a.x) / len, y: (tip.y - a.y) / len }
            const tone = m.tone ?? (m.lost ? 'error' : 'accent')
            const mid = { x: (a.x + tip.x) / 2, y: (a.y + tip.y) / 2 }
            return (
              <motion.g key={`${i}-${m.t0}`} data-tone={tone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                <motion.line x1={a.x} y1={a.y} initial={{ x2: a.x, y2: a.y }} animate={{ x2: tip.x, y2: tip.y }} transition={EASE} className="sc-edge" data-tone={tone} strokeDasharray={m.lost ? '6 5' : undefined} />
                {m.lost ? (
                  <text x={tip.x} y={tip.y + 5} textAnchor="middle" className="sc-svg-label" style={{ fill: 'var(--t)' }}>
                    ✕
                  </text>
                ) : (
                  <polygon points={arrowHead(tip, u, 8)} className="sc-arrowhead" data-tone={tone} />
                )}
                {m.label && (
                  <text x={mid.x} y={mid.y - 6} textAnchor="middle" className="sc-svg-small" style={{ fontWeight: 700, fill: 'var(--color-text-primary)' }}>
                    {m.label}
                  </text>
                )}
              </motion.g>
            )
          })}
      </AnimatePresence>
    </Svg>
  )
}
