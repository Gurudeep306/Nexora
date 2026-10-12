import { motion } from 'motion/react'
import { tokenize } from '@/learn/engine/code'
import type { Lang } from '@/learn/engine/types'
import type { CircuitFrame, CodeFrame, GateType } from '../types'
import { circuitDepths, evaluateCircuit } from '../engine'
import { Pop, Svg } from './common'
import { EASE } from './geometry'

/* ── Code trace ──────────────────────────────────────────────────────────── */

export function CodeScene({ f }: { f: CodeFrame }) {
  const lines = f.code.replace(/\s+$/, '').split('\n')
  const lang = (f.lang ?? 'c') as Lang
  const hl = new Set(f.hl ?? [])
  const side = (f.callStack && f.callStack.length > 0) || f.output !== undefined
  return (
    <div className={side ? 'grid gap-3 @lg:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)]' : ''}>
      <div className="sc-code overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-code-bg)] py-2">
        {lines.map((line, i) => (
          <div key={i} className="sc-code-line">
            {hl.has(i + 1) && <span className="sc-code-hl" />}
            {f.line === i + 1 && <motion.span layoutId="code-cur" transition={EASE} className="sc-code-cur" />}
            <span className="sc-code-ln relative">{i + 1}</span>
            <span className="relative">
              {tokenize(line, lang).map((t, k) => (
                <span key={k} className={t.k ? `tok-${t.k}` : undefined}>
                  {t.t}
                </span>
              ))}
              {line === '' ? ' ' : null}
            </span>
          </div>
        ))}
      </div>
      {side && (
        <div className="flex flex-col gap-2">
          {f.callStack && f.callStack.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface-2)] p-2">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Call stack</div>
              <div className="flex flex-col-reverse gap-1">
                {f.callStack.map((fr, i) => (
                  <motion.div
                    key={`${i}-${fr.name}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={EASE}
                    className="rounded-lg border px-2 py-1 font-mono text-[11.5px]"
                    data-tone={i === f.callStack!.length - 1 ? 'accent' : 'default'}
                    style={{ borderColor: 'var(--t)', background: 'var(--sc-fill)' }}
                  >
                    <div className="font-bold text-[var(--color-text-primary)]">{fr.name}</div>
                    {fr.vars &&
                      Object.entries(fr.vars).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 text-[var(--color-text-secondary)]">
                          <span>{k}</span>
                          <Pop value={v} className="font-semibold text-[var(--color-text-primary)]" />
                        </div>
                      ))}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {f.output !== undefined && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-app)] p-2">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Output</div>
              <pre className="whitespace-pre-wrap font-mono text-[12.5px] font-semibold text-[var(--color-text-primary)]">{f.output || ' '}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Logic circuit ───────────────────────────────────────────────────────── */

const GW = 56
const GH = 44

function gateShape(type: GateType) {
  switch (type) {
    case 'AND':
    case 'NAND':
      return `M0,0 H28 A22,22 0 0 1 28,${GH} H0 Z`
    case 'OR':
    case 'NOR':
    case 'XOR':
    case 'XNOR':
      return `M0,0 Q20,${GH / 2} 0,${GH} Q38,${GH} ${GW},${GH / 2} Q38,0 0,0 Z`
    default:
      return `M0,2 L46,${GH / 2} L0,${GH - 2} Z`
  }
}
const bubbled = (t: GateType) => t === 'NAND' || t === 'NOR' || t === 'XNOR' || t === 'NOT'
const outX = (t: GateType) => (t === 'NOT' || t === 'BUF' ? 46 : GW) + (bubbled(t) ? 8 : 0)

export function CircuitScene({ f }: { f: CircuitFrame }) {
  const depth = circuitDepths(f)
  if (typeof depth === 'string') return <div className="text-[13px] text-[var(--color-state-error)]">Circuit error: {depth}</div>
  const values = f.showValues === false ? null : evaluateCircuit(f)
  const maxD = Math.max(1, ...f.gates.map((g) => depth.get(g.id)!))
  const X = (d: number) => 40 + d * 140
  const pos = new Map<string, { x: number; y: number }>()
  f.inputs.forEach((inp, i) => pos.set(inp.id, { x: X(0), y: 30 + i * 62 }))
  for (let d = 1; d <= maxD; d++) {
    const col = f.gates.filter((g) => depth.get(g.id) === d)
    const want = col.map((g) => ({ g, y: g.in.reduce((a, s) => a + (pos.get(s)?.y ?? 0), 0) / g.in.length }))
    want.sort((a, b) => a.y - b.y)
    let last = -Infinity
    for (const w of want) {
      const y = Math.max(w.y, last + 70)
      pos.set(w.g.id, { x: X(d), y })
      last = y
    }
  }
  const outsX = X(maxD) + 150
  const H = Math.max(...[...pos.values()].map((p) => p.y)) + 46
  const sig = (id: string) => (values ? values.get(id) : undefined)
  const wireTone = (v: number | undefined) => (v === undefined ? 'default' : v === 1 ? 'success' : 'muted')
  const srcPoint = (id: string) => {
    const p = pos.get(id)!
    const g = f.gates.find((x) => x.id === id)
    return g ? { x: p.x - GW / 2 + outX(g.type), y: p.y } : { x: p.x + 14, y: p.y }
  }
  return (
    <Svg width={outsX + 70} height={H} label="logic circuit">
      {f.gates.map((g) =>
        g.in.map((s, k) => {
          const a = srcPoint(s)
          const p = pos.get(g.id)!
          const ty = p.y - GH / 2 + ((k + 1) * GH) / (g.in.length + 1)
          const tx = p.x - GW / 2 + (g.type === 'OR' || g.type === 'NOR' || g.type === 'XOR' || g.type === 'XNOR' ? 6 : 0)
          const mx = a.x + Math.max(14, (tx - a.x) / 2) - k * 4
          const v = sig(s)
          return <path key={`${g.id}-${k}`} d={`M${a.x},${a.y} H${mx} V${ty} H${tx}`} className="sc-edge" data-tone={wireTone(v)} style={{ strokeWidth: v === 1 ? 2.75 : 1.75 }} />
        }),
      )}
      {f.outputs.map((o) => {
        const a = srcPoint(o.from)
        const y = pos.get(o.from)!.y
        const v = sig(o.from)
        return (
          <g key={o.id}>
            <path d={`M${a.x},${a.y} H${outsX - 20} V${y}`} className="sc-edge" data-tone={wireTone(v)} />
            <text x={outsX - 14} y={y + 5} className="sc-svg-label">
              {o.label ?? o.id}
              {v !== undefined ? ` = ${v}` : ''}
            </text>
          </g>
        )
      })}
      {f.inputs.map((inp) => {
        const p = pos.get(inp.id)!
        const v = sig(inp.id)
        return (
          <g key={inp.id} data-tone={wireTone(v)}>
            <text x={p.x - 8} y={p.y + 5} textAnchor="end" className="sc-svg-label">
              {inp.label ?? inp.id}
            </text>
            <circle cx={p.x + 4} cy={p.y} r={5} className="sc-node" data-tone={wireTone(v)} />
            {v !== undefined && (
              <text x={p.x + 4} y={p.y - 10} textAnchor="middle" className="sc-svg-small sc-mono" style={{ fontWeight: 700 }}>
                {v}
              </text>
            )}
          </g>
        )
      })}
      {f.gates.map((g) => {
        const p = pos.get(g.id)!
        const tone = g.tone ?? 'default'
        const v = sig(g.id)
        return (
          <motion.g key={g.id} initial={false} animate={{ x: p.x - GW / 2, y: p.y - GH / 2 }} transition={EASE} data-tone={tone}>
            <path d={gateShape(g.type)} className="sc-node" data-tone={tone} />
            {(g.type === 'XOR' || g.type === 'XNOR') && <path d={`M-7,0 Q13,${GH / 2} -7,${GH}`} className="sc-edge" data-tone={tone} />}
            {bubbled(g.type) && <circle cx={outX(g.type) - 4} cy={GH / 2} r={4} className="sc-node" data-tone={tone} />}
            <text x={g.type === 'NOT' || g.type === 'BUF' ? 15 : 24} y={GH / 2 + 4} textAnchor="middle" className="sc-svg-small" style={{ fontWeight: 700, fontSize: 9.5 }}>
              {g.label ?? g.type}
            </text>
            {v !== undefined && (
              <text x={outX(g.type) + 6} y={GH / 2 - 6} className="sc-svg-small sc-mono" style={{ fontWeight: 700, fill: v ? 'var(--color-state-success)' : 'var(--color-text-muted)' }}>
                {v}
              </text>
            )}
          </motion.g>
        )
      })}
    </Svg>
  )
}
