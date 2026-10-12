import { useId, useMemo } from 'react'
import katex from 'katex'
import { AnimatePresence, motion } from 'motion/react'
import { Inline } from '@/learn/md'
import type { BarsFrame, EquationFrame, NumberLineFrame, Tone, VennFrame } from '../types'
import { Pop, Svg } from './common'
import { EASE, show } from './geometry'

function tex(src: string) {
  try {
    return katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false })
  } catch {
    return src
  }
}

/* ── Equation chain ──────────────────────────────────────────────────────── */

function EqLine({ src }: { src: string }) {
  const html = useMemo(() => tex(src), [src])
  return <div className="md-display min-w-0 [&_.katex-display]:!my-0" dangerouslySetInnerHTML={{ __html: html }} />
}

export function EquationScene({ f }: { f: EquationFrame }) {
  const lines = f.lines.slice(0, f.reveal ?? f.lines.length)
  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {lines.map((l, i) => (
          <motion.div
            key={`${i}:${l.tex}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={EASE}
            data-tone={l.tone ?? (i === lines.length - 1 && (f.reveal ?? 0) > 0 ? 'accent' : 'default')}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-r-xl rounded-l-[3px] border-l-[3px] px-3 py-1"
            style={{ borderColor: 'var(--t)', background: l.tone && l.tone !== 'default' ? 'var(--sc-fill)' : undefined }}
          >
            <EqLine src={l.tex} />
            {l.note && (
              <span className="max-w-[14rem] text-right text-[12px] leading-snug text-[var(--color-text-muted)]">
                <Inline text={l.note} />
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ── Number line ─────────────────────────────────────────────────────────── */

function niceStep(span: number) {
  const raw = span / 10
  const p = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw) ?? p * 10
}

export function NumberLineScene({ f }: { f: NumberLineFrame }) {
  const W = 600
  const step = f.step ?? niceStep(f.max - f.min)
  const X = (v: number) => 20 + ((v - f.min) / (f.max - f.min)) * (W - 40)
  const ticks: number[] = []
  for (let v = Math.ceil(f.min / step) * step; v <= f.max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  const ivs = f.intervals ?? []
  const axisY = 30 + ivs.length * 20
  return (
    <Svg width={W} height={axisY + 56} label="number line">
      {ivs.map((iv, i) => {
        const y = 18 + i * 20
        const tone = iv.tone ?? 'accent'
        return (
          <motion.g key={i} data-tone={tone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={EASE}>
            <motion.line initial={false} animate={{ x1: X(iv.from), x2: X(iv.to) }} y1={y} y2={y} transition={EASE} style={{ stroke: 'var(--t)', strokeWidth: 5, strokeLinecap: 'round' }} />
            {[iv.from, iv.to].map((v, k) => (
              <circle key={k} cx={X(v)} cy={y} r={5} style={{ stroke: 'var(--t)', strokeWidth: 2, fill: iv.open?.[k] ? 'var(--color-bg-surface)' : 'var(--t)' }} />
            ))}
            {iv.label && (
              <text x={(X(iv.from) + X(iv.to)) / 2} y={y - 8} textAnchor="middle" className="sc-svg-small" style={{ fill: 'var(--t)', fontWeight: 700 }}>
                {iv.label}
              </text>
            )}
          </motion.g>
        )
      })}
      <line x1={8} y1={axisY} x2={W - 8} y2={axisY} className="sc-axis" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={axisY - 4} x2={X(t)} y2={axisY + 4} className="sc-axis" />
          <text x={X(t)} y={axisY + 18} textAnchor="middle" className="sc-svg-small sc-mono">
            {t}
          </text>
        </g>
      ))}
      {(f.points ?? []).map((p, i) => (
        <motion.g key={i} data-tone={p.tone ?? 'accent'} initial={false} animate={{ x: X(p.x) }} transition={EASE}>
          <circle cx={0} cy={axisY} r={6.5} className="sc-node" data-tone={p.tone ?? 'accent'} style={{ fill: 'var(--t)' }} />
          {p.label && (
            <text x={0} y={axisY + 36} textAnchor="middle" className="sc-svg-small" style={{ fill: 'var(--t)', fontWeight: 700 }}>
              {p.label}
            </text>
          )}
        </motion.g>
      ))}
    </Svg>
  )
}

/* ── Venn ────────────────────────────────────────────────────────────────── */

const VENN_GEOM: Record<number, { c: { x: number; y: number }[]; r: number; label: { x: number; y: number }[]; regions: Record<string, { x: number; y: number }> }> = {
  2: {
    c: [
      { x: 150, y: 120 },
      { x: 260, y: 120 },
    ],
    r: 95,
    label: [
      { x: 95, y: 22 },
      { x: 315, y: 22 },
    ],
    regions: { '0': { x: 105, y: 124 }, '1': { x: 305, y: 124 }, '01': { x: 205, y: 124 }, '-': { x: 385, y: 222 } },
  },
  3: {
    c: [
      { x: 160, y: 120 },
      { x: 255, y: 120 },
      { x: 207, y: 200 },
    ],
    r: 88,
    label: [
      { x: 92, y: 30 },
      { x: 325, y: 30 },
      { x: 207, y: 306 },
    ],
    regions: {
      '0': { x: 125, y: 102 },
      '1': { x: 290, y: 102 },
      '2': { x: 207, y: 245 },
      '01': { x: 207, y: 88 },
      '02': { x: 158, y: 180 },
      '12': { x: 256, y: 180 },
      '012': { x: 207, y: 150 },
      '-': { x: 385, y: 300 },
    },
  },
}

export function VennScene({ f }: { f: VennFrame }) {
  const uid = useId().replace(/:/g, '')
  const g = VENN_GEOM[f.sets.length]
  const ids = f.sets.map((s) => s.id)
  // "AB" → "01"
  const idx = (region: string) => (region === '-' ? '-' : [...region].map((ch) => ids.indexOf(ch)).sort().join(''))
  const H = f.sets.length === 3 ? 320 : 240
  const W = 410
  const hl = f.hl ?? []
  return (
    <Svg width={W} height={H} label="Venn diagram">
      <defs>
        {g.c.map((c, i) => (
          <clipPath key={i} id={`${uid}-c${i}`}>
            <circle cx={c.x} cy={c.y} r={g.r} />
          </clipPath>
        ))}
        {hl.map((h, k) => {
          const inside = idx(h.region)
          return (
            <mask key={k} id={`${uid}-m${k}`}>
              <rect x={0} y={0} width={W} height={H} fill="white" />
              {g.c.map((c, i) => (inside === '-' || !inside.includes(String(i)) ? <circle key={i} cx={c.x} cy={c.y} r={g.r} fill="black" /> : null))}
            </mask>
          )
        })}
      </defs>
      <rect x={2} y={2} width={W - 4} height={H - 4} rx={14} style={{ fill: 'none', stroke: 'var(--color-border)', strokeWidth: 1.25 }} />
      <AnimatePresence>
        {hl.map((h, k) => {
          const inside = idx(h.region)
          const clips = inside === '-' ? [] : [...inside].map(Number)
          let body = <rect x={0} y={0} width={W} height={H} style={{ fill: 'color-mix(in oklab, var(--t) 34%, transparent)' }} />
          for (const i of clips) body = <g clipPath={`url(#${uid}-c${i})`}>{body}</g>
          return (
            <motion.g key={`${h.region}-${k}`} data-tone={(h.tone ?? 'accent') as Tone} mask={`url(#${uid}-m${k})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
              {body}
            </motion.g>
          )
        })}
      </AnimatePresence>
      {g.c.map((c, i) => (
        <g key={i} data-tone={(['accent', 'cat1', 'cat2'] as Tone[])[i]}>
          <circle cx={c.x} cy={c.y} r={g.r} style={{ fill: 'color-mix(in oklab, var(--t) 7%, transparent)', stroke: 'var(--t)', strokeWidth: 2 }} />
          <text x={g.label[i].x} y={g.label[i].y} textAnchor="middle" className="sc-svg-label" style={{ fill: 'var(--t)' }}>
            {f.sets[i].label}
          </text>
        </g>
      ))}
      {Object.entries(f.regions ?? {}).map(([region, v]) => {
        const p = g.regions[idx(region)]
        if (!p) return null
        return (
          <text key={region} x={p.x} y={p.y + 5} textAnchor="middle" className="sc-svg-label sc-mono" style={{ fontSize: 15 }}>
            {show(v)}
          </text>
        )
      })}
    </Svg>
  )
}

/* ── Bars ────────────────────────────────────────────────────────────────── */

export function BarsScene({ f }: { f: BarsFrame }) {
  const max = f.max ?? (Math.max(...f.bars.map((b) => b.value), 0) * 1.08 || 1)
  const h = 170
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex w-max items-end gap-2 px-2 pt-6">
        {f.bars.map((b, i) => {
          const tone = b.tone ?? 'default'
          return (
            <div key={`${i}-${b.label}`} className="flex w-12 flex-col items-center gap-1" data-tone={tone}>
              <span className="text-[11.5px] font-bold" style={{ color: tone === 'default' ? 'var(--color-text-secondary)' : 'var(--t)' }}>
                <Pop value={b.display ?? b.value} />
              </span>
              <div className="flex w-full items-end" style={{ height: h }}>
                <motion.div
                  className="sc-cell w-full !min-w-0 !rounded-b-sm !rounded-t-lg"
                  data-tone={tone}
                  initial={false}
                  animate={{ height: Math.max(2, (b.value / max) * h) }}
                  transition={EASE}
                  style={{ height: 0 }}
                />
              </div>
              <span className="max-w-[4rem] truncate text-center text-[11.5px] font-semibold text-[var(--color-text-secondary)]">{b.label}</span>
            </div>
          )
        })}
      </div>
      {f.unit && <div className="mt-1 text-center text-[11px] text-[var(--color-text-muted)]">{f.unit}</div>}
    </div>
  )
}
