import { Fragment } from 'react'
import { motion } from 'motion/react'
import type { BitsFrame, CacheFrame, GridMark, KmapFrame, MatrixFrame, PagingFrame, PipelineFrame, TableFrame, Tone } from '../types'
import { cyclicRuns, kmapAxes, kmapPos, kmapShape, simulatePaging } from '../engine'
import { Pop, Scroll } from './common'
import { EASE, arrowHead, cellObj, show } from './geometry'

const GAP = 4
const textW = (s: string, per = 8.4, pad = 22, min = 40) => Math.max(min, s.length * per + pad)

/** Tone for body cell (r, c) from grid marks; later marks win. */
function markTone(marks: GridMark[] | undefined, r: number, c: number): Tone | undefined {
  let t: Tone | undefined
  for (const m of marks ?? []) {
    if ((m.r == null || m.r === r) && (m.c == null || m.c === c) && (m.r != null || m.c != null)) t = m.tone ?? 'accent'
  }
  return t
}

/** Cumulative centres of fixed-size tracks. */
function centres(sizes: number[], offset: number) {
  const out: number[] = []
  let x = offset
  for (const s of sizes) {
    out.push(x + s / 2)
    x += s + GAP
  }
  return out
}

function ArrowOverlay({ arrows, xs, ys, width, height }: { arrows: { from: [number, number]; to: [number, number]; tone?: Tone }[]; xs: number[]; ys: number[]; width: number; height: number }) {
  return (
    <svg className="pointer-events-none absolute left-0 top-0" width={width} height={height} aria-hidden>
      {arrows.map((a, i) => {
        const p = { x: xs[a.from[1]], y: ys[a.from[0]] }
        const q = { x: xs[a.to[1]], y: ys[a.to[0]] }
        const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
        const u = { x: (q.x - p.x) / len, y: (q.y - p.y) / len }
        const s = { x: p.x + u.x * 12, y: p.y + u.y * 12 }
        const e = { x: q.x - u.x * 12, y: q.y - u.y * 12 }
        return (
          <motion.g key={i} data-tone={a.tone ?? 'accent'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={EASE}>
            <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} className="sc-edge" data-tone={a.tone ?? 'accent'} style={{ strokeWidth: 2 }} />
            <polygon points={arrowHead(e, u, 7)} className="sc-arrowhead" data-tone={a.tone ?? 'accent'} />
          </motion.g>
        )
      })}
    </svg>
  )
}

/* ── Table ───────────────────────────────────────────────────────────────── */

export function TableScene({ f }: { f: TableFrame }) {
  const w = Math.max(...f.rows.map((r) => r.length))
  const ch = 34
  const colW = Array.from({ length: w }, (_, c) => {
    const len = Math.max(f.cols?.[c]?.length ?? 0, ...f.rows.map((r) => show(cellObj(r[c] ?? null).v).length))
    return textW('x'.repeat(len), f.mono ? 9 : 8.4)
  })
  const labelW = f.rowLabels ? textW('x'.repeat(Math.max(...f.rowLabels.map((l) => l.length), (f.corner ?? '').length)), 7.6, 18, 34) : 0
  const headH = f.cols ? 26 : 0
  const template = [...(f.rowLabels ? [`${labelW}px`] : []), ...colW.map((x) => `${x}px`)].join(' ')
  const xs = centres(colW, f.rowLabels ? labelW + GAP : 0)
  const ys = centres(Array(f.rows.length).fill(ch), f.cols ? headH + GAP : 0)
  const width = (f.rowLabels ? labelW + GAP : 0) + colW.reduce((a, b) => a + b + GAP, 0) - GAP
  const height = (f.cols ? headH + GAP : 0) + f.rows.length * (ch + GAP) - GAP
  const reveal = f.reveal ?? Infinity
  return (
    <Scroll>
      <div className="relative" style={{ width, height }}>
        <div className="sc-grid-table" style={{ gridTemplateColumns: template, gridAutoRows: `${ch}px`, gridTemplateRows: f.cols ? `${headH}px` : undefined }}>
          {f.cols && (
            <>
              {f.rowLabels && <div className="sc-th sc-mono text-[var(--color-text-muted)]">{f.corner ?? ''}</div>}
              {f.cols.map((c, i) => (
                <div key={`h${i}`} className={`sc-th ${f.mono ? 'sc-mono' : ''}`}>
                  {c}
                </div>
              ))}
            </>
          )}
          {f.rows.map((row, r) => (
            <Fragment key={r}>
              {f.rowLabels && <div className="sc-th sc-mono justify-end">{f.rowLabels[r]}</div>}
              {Array.from({ length: w }, (_, c) => {
                const o = cellObj(row[c] ?? null)
                const hidden = r * w + c >= reveal
                const hl = markTone(f.hl, r, c)
                return (
                  <div
                    key={c}
                    className="sc-gcell"
                    data-tone={hl ?? o.tone ?? 'default'}
                    data-hl={hl ? '' : undefined}
                    data-hidden={hidden ? 'true' : undefined}
                  >
                    {!hidden && <Pop value={o.v ?? ''} />}
                    {!hidden && o.sub && <span className="sc-cell-sub">{o.sub}</span>}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        {f.arrows && f.arrows.length > 0 && <ArrowOverlay arrows={f.arrows} xs={xs} ys={ys} width={width} height={height} />}
      </div>
    </Scroll>
  )
}

/* ── Matrix ──────────────────────────────────────────────────────────────── */

export function MatrixScene({ f }: { f: MatrixFrame }) {
  return (
    <Scroll>
      <div className="flex items-center gap-3">
        {f.terms.map((t, i) =>
          typeof t === 'string' ? (
            <span key={i} className="text-xl font-semibold text-[var(--color-text-secondary)]">
              {t}
            </span>
          ) : (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="relative px-2 py-1">
                <span className="absolute inset-y-0 left-0 w-2 rounded-l-md border-y-2 border-l-2 border-[var(--color-text-secondary)]" />
                <span className="absolute inset-y-0 right-0 w-2 rounded-r-md border-y-2 border-r-2 border-[var(--color-text-secondary)]" />
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${t.rows[0].length}, minmax(2.2rem, auto))` }}>
                  {t.rows.map((row, r) =>
                    row.map((v, c) => {
                      const hl = markTone(t.hl, r, c)
                      return (
                        <div key={`${r}-${c}`} className="sc-gcell h-8 border-transparent bg-transparent" data-tone={hl ?? 'default'} data-hl={hl ? '' : undefined}>
                          <Pop value={v} />
                        </div>
                      )
                    }),
                  )}
                </div>
              </div>
              {t.name && <span className="sc-label">{t.name}</span>}
            </div>
          ),
        )}
      </div>
    </Scroll>
  )
}

/* ── Pipeline ────────────────────────────────────────────────────────────── */

const STAGE_TONES: Tone[] = ['accent', 'cat1', 'info', 'cat2', 'warning', 'cat3', 'success']
const isStall = (s: string) => s === '-' || s === '' || /^stall$/i.test(s)

export function PipelineScene({ f }: { f: PipelineFrame }) {
  const last = Math.max(...f.rows.map((r) => r.start + r.cells.length - 1))
  const stageTone = new Map<string, Tone>()
  for (const r of f.rows) for (const s of r.cells) if (!isStall(s) && !stageTone.has(s)) stageTone.set(s, STAGE_TONES[stageTone.size % STAGE_TONES.length])
  const cw = Math.max(40, ...[...stageTone.keys()].map((s) => textW(s, 8, 14)))
  const ch = 32
  const labelW = textW('x'.repeat(Math.max(...f.rows.map((r) => r.label.length))), 7.6, 16, 36)
  const upto = f.upto ?? Infinity
  const xs = centres(Array(last).fill(cw), labelW + GAP)
  const ys = centres(Array(f.rows.length).fill(ch), 24 + GAP)
  const width = labelW + GAP + last * (cw + GAP) - GAP
  const height = 24 + GAP + f.rows.length * (ch + GAP) - GAP
  return (
    <Scroll>
      <div className="relative" style={{ width, height }}>
        <div className="sc-grid-table" style={{ gridTemplateColumns: `${labelW}px repeat(${last}, ${cw}px)`, gridTemplateRows: `24px repeat(${f.rows.length}, ${ch}px)` }}>
          <div className="sc-th justify-end text-[var(--color-text-muted)]">cycle</div>
          {Array.from({ length: last }, (_, k) => (
            <div key={k} className="sc-th sc-mono" style={k + 1 > upto ? { opacity: 0.35 } : k + 1 === upto ? { color: 'var(--color-accent-brand)' } : undefined}>
              {k + 1}
            </div>
          ))}
          {f.rows.map((row, r) => (
            <Fragment key={r}>
              <div className="sc-th sc-mono justify-end">{row.label}</div>
              {Array.from({ length: last }, (_, k) => {
                const cyc = k + 1
                const idx = cyc - row.start
                const s = idx >= 0 && idx < row.cells.length ? row.cells[idx] : null
                const hl = markTone(f.hl, r, cyc)
                if (s === null || cyc > upto) return <div key={k} className="sc-gcell" style={{ background: 'transparent', borderColor: 'transparent' }} data-tone={hl} data-hl={hl ? '' : undefined} />
                const stall = isStall(s)
                return (
                  <motion.div
                    key={k}
                    className="sc-gcell"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={EASE}
                    data-tone={hl ?? (stall ? 'default' : stageTone.get(s))}
                    data-hl={hl ? '' : undefined}
                    data-stall={stall ? 'true' : undefined}
                  >
                    {stall ? 'stall' : s}
                  </motion.div>
                )
              })}
            </Fragment>
          ))}
        </div>
        {f.forwards && f.forwards.length > 0 && (
          <ArrowOverlay
            arrows={f.forwards.filter((fw) => fw.to[1] <= upto).map((fw) => ({ from: [fw.from[0], fw.from[1] - 1], to: [fw.to[0], fw.to[1] - 1], tone: 'success' as Tone }))}
            xs={xs}
            ys={ys}
            width={width}
            height={height}
          />
        )}
      </div>
    </Scroll>
  )
}

/* ── Paging ──────────────────────────────────────────────────────────────── */

export function PagingScene({ f }: { f: PagingFrame }) {
  const { cols } = simulatePaging(f)
  const upto = Math.min(f.upto ?? cols.length, cols.length)
  const shown = cols.slice(0, upto)
  const faults = shown.filter((c) => !c.hit).length
  const cw = Math.max(36, ...f.refs.map((r) => textW(String(r), 9, 16, 36)))
  const ch = 32
  return (
    <div className="flex flex-col gap-2">
      <Scroll>
        <div className="sc-grid-table" style={{ gridTemplateColumns: `52px repeat(${cols.length}, ${cw}px)`, gridTemplateRows: `26px repeat(${f.frames}, ${ch}px) 24px` }}>
          <div className="sc-th justify-end text-[var(--color-text-muted)]">ref</div>
          {cols.map((c, t) => (
            <div
              key={t}
              className="sc-th sc-mono rounded-md"
              style={{
                opacity: t < upto ? 1 : 0.4,
                color: t === upto - 1 ? 'var(--color-on-accent-brand)' : undefined,
                background: t === upto - 1 ? 'var(--color-accent-brand)' : undefined,
                transition: 'all 380ms ease',
              }}
            >
              {c.ref}
            </div>
          ))}
          {Array.from({ length: f.frames }, (_, s) => (
            <Fragment key={s}>
              <div className="sc-th justify-end">F{s + 1}</div>
              {cols.map((c, t) => {
                if (t >= upto) return <div key={t} className="sc-gcell" data-hidden="true" />
                const page = c.slots[s]
                const touched = c.slot === s
                const tone: Tone | undefined = touched ? (c.hit ? 'success' : 'error') : undefined
                return (
                  <div key={t} className="sc-gcell" data-tone={tone ?? 'default'} data-hl={touched && t === upto - 1 ? '' : undefined} style={t < upto - 1 && !touched ? { opacity: 0.7 } : undefined}>
                    {page ?? ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
          <div className="sc-th justify-end text-[var(--color-text-muted)]" />
          {cols.map((c, t) => (
            <div key={t} className="sc-th sc-mono" style={{ color: t >= upto ? 'transparent' : c.hit ? 'var(--color-state-success)' : 'var(--color-state-error)' }}>
              {c.hit ? 'hit' : 'F'}
            </div>
          ))}
        </div>
      </Scroll>
      <div className="flex flex-wrap justify-center gap-2 text-[12px]">
        <span className="sc-var">
          <span className="sc-var-k">policy</span>
          {f.policy}
        </span>
        <span className="sc-var">
          <span className="sc-var-k">faults</span>
          <Pop value={faults} />
        </span>
        <span className="sc-var">
          <span className="sc-var-k">hits</span>
          <Pop value={upto - faults} />
        </span>
        {upto > 0 && cols[upto - 1].evicted && (
          <span className="sc-var" data-changed="true">
            <span className="sc-var-k">evicted</span>
            {cols[upto - 1].evicted}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Cache ───────────────────────────────────────────────────────────────── */

export function CacheScene({ f }: { f: CacheFrame }) {
  const ways = Math.max(...f.sets.map((s) => s.lines.length))
  const cw = Math.max(70, ...f.sets.flatMap((s) => s.lines.map((l) => (l ? textW(l.tag + (l.note ? ` ${l.note}` : ''), 8, 20) : 0))))
  return (
    <Scroll>
      <div className="sc-grid-table" style={{ gridTemplateColumns: `64px repeat(${ways}, ${cw}px) 56px`, gridAutoRows: '34px', gridTemplateRows: '24px' }}>
        <div className="sc-th justify-end text-[var(--color-text-muted)]">set</div>
        {Array.from({ length: ways }, (_, w) => (
          <div key={w} className="sc-th">
            way {w}
          </div>
        ))}
        <div />
        {f.sets.map((s, i) => {
          const acc = f.access && f.access.set === i ? f.access : null
          return (
            <Fragment key={i}>
              <div className="sc-th sc-mono justify-end" style={acc ? { color: 'var(--color-accent-brand)' } : undefined}>
                {s.label ?? i}
              </div>
              {Array.from({ length: ways }, (_, w) => {
                const l = s.lines[w] ?? null
                const hit = acc && acc.way === w
                const tone: Tone | undefined = hit ? (acc.result === 'hit' ? 'success' : 'error') : (l?.tone ?? undefined)
                return (
                  <div key={w} className="sc-gcell" data-tone={tone ?? (acc ? 'accent' : 'default')} data-hl={hit ? '' : undefined} data-hidden={!l && !hit ? undefined : undefined}>
                    {l ? (
                      <span>
                        <Pop value={l.tag} />
                        {l.note && <span className="ml-1 text-[0.7rem] font-medium text-[var(--color-text-muted)]">{l.note}</span>}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </div>
                )
              })}
              <div className="sc-th sc-mono" style={{ color: acc ? (acc.result === 'hit' ? 'var(--color-state-success)' : 'var(--color-state-error)') : 'transparent' }}>
                {acc ? acc.result.toUpperCase() : ''}
              </div>
            </Fragment>
          )
        })}
      </div>
    </Scroll>
  )
}

/* ── K-map ───────────────────────────────────────────────────────────────── */

const bitsOf = (v: number, n: number) => (n === 0 ? '' : v.toString(2).padStart(n, '0'))

export function KmapScene({ f }: { f: KmapFrame }) {
  const n = f.variables.length
  const { rowBits, colBits } = kmapShape(n)
  const { rows, cols } = kmapAxes(n)
  const cs = 50
  const head = 30
  const ones = new Set(f.ones)
  const dcs = new Set(f.dcs ?? [])
  const rowVars = f.variables.slice(0, rowBits).join('')
  const colVars = f.variables.slice(rowBits).join('')
  const hl = new Map((f.hl ?? []).map((h) => [h.cell, h.tone ?? 'accent']))
  const x0 = head + GAP
  const y0 = head + GAP
  const W = x0 + cols.length * (cs + GAP) - GAP
  const H = y0 + rows.length * (cs + GAP) - GAP
  const rects: { key: string; x: number; y: number; w: number; h: number; tone: Tone; label?: string; first: boolean }[] = []
  ;(f.groups ?? []).forEach((g, gi) => {
    const ps = g.cells.map((m) => kmapPos(n, m))
    const rr = cyclicRuns(ps.map((p) => p.r), rows.length) ?? []
    const cr = cyclicRuns(ps.map((p) => p.c), cols.length) ?? []
    const inset = 4 + (gi % 4) * 3
    let first = true
    for (const [r0, r1] of rr)
      for (const [c0, c1] of cr) {
        rects.push({
          key: `${gi}-${r0}-${c0}`,
          x: x0 + c0 * (cs + GAP) + inset - 2,
          y: y0 + r0 * (cs + GAP) + inset - 2,
          w: (c1 - c0 + 1) * (cs + GAP) - GAP - 2 * inset + 4,
          h: (r1 - r0 + 1) * (cs + GAP) - GAP - 2 * inset + 4,
          tone: g.tone ?? (['accent', 'cat1', 'cat2', 'cat3', 'info', 'warning'] as Tone[])[gi % 6],
          label: first ? g.label : undefined,
          first,
        })
        first = false
      }
  })
  return (
    <Scroll>
      <div className="relative" style={{ width: W, height: H + 8 }}>
        <div className="sc-grid-table" style={{ gridTemplateColumns: `${head}px repeat(${cols.length}, ${cs}px)`, gridTemplateRows: `${head}px repeat(${rows.length}, ${cs}px)` }}>
          <div className="relative">
            <svg width={head} height={head} className="absolute inset-0" aria-hidden>
              <line x1="2" y1="2" x2={head} y2={head} className="sc-axis" />
              <text x={head - 2} y="11" textAnchor="end" className="sc-svg-small sc-mono">
                {colVars}
              </text>
              <text x="2" y={head - 2} className="sc-svg-small sc-mono">
                {rowVars}
              </text>
            </svg>
          </div>
          {cols.map((c) => (
            <div key={c} className="sc-th sc-mono">
              {bitsOf(c, colBits)}
            </div>
          ))}
          {rows.map((r) => (
            <Fragment key={r}>
              <div className="sc-th sc-mono">{bitsOf(r, rowBits)}</div>
              {cols.map((c) => {
                const m = (r << colBits) | c
                const v = ones.has(m) ? '1' : dcs.has(m) ? 'X' : '0'
                const t = hl.get(m)
                return (
                  <div key={c} className="sc-gcell text-base" data-tone={t ?? 'default'} data-hl={t ? '' : undefined} style={v === '0' ? { color: 'var(--color-text-muted)', opacity: 0.55 } : undefined}>
                    <span className="absolute left-1 top-0.5 text-[9px] font-medium text-[var(--color-text-muted)]">{m}</span>
                    {v}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        <svg className="pointer-events-none absolute left-0 top-0" width={W} height={H + 8} aria-hidden>
          {rects.map((g) => (
            <motion.g key={g.key} data-tone={g.tone} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={EASE} style={{ transformOrigin: `${g.x + g.w / 2}px ${g.y + g.h / 2}px` }}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={14} style={{ fill: 'color-mix(in oklab, var(--t) 12%, transparent)', stroke: 'var(--t)', strokeWidth: 2.5 }} />
              {g.label && (
                <text x={g.x + g.w - 6} y={g.y + g.h - 5} textAnchor="end" className="sc-svg-small" style={{ fill: 'var(--t)', fontWeight: 700 }}>
                  {g.label}
                </text>
              )}
            </motion.g>
          ))}
        </svg>
      </div>
    </Scroll>
  )
}

/* ── Bits ────────────────────────────────────────────────────────────────── */

export function BitsScene({ f }: { f: BitsFrame }) {
  const labelW = Math.max(0, ...f.rows.map((r) => textW(r.label ?? '', 7.4, 14, 0)))
  return (
    <Scroll>
      <div className="flex flex-col gap-3">
        {f.rows.map((row, ri) => {
          let bit = 0
          return (
            <div key={ri} className="flex items-start gap-2">
              {labelW > 0 && (
                <div className="sc-label pt-1.5 text-right" style={{ width: labelW }}>
                  {row.label}
                </div>
              )}
              <div className="flex items-start">
                {row.fields.map((fl, fi) => {
                  const start = bit
                  bit += fl.bits.length
                  return (
                    <div key={fi} className="flex flex-col items-center" data-tone={fl.tone ?? 'default'}>
                      <div className="flex">
                        {[...fl.bits].map((b, k) => {
                          const g = f.group && (start + k + 1) % f.group === 0 && start + k + 1 < row.fields.reduce((a, x) => a + x.bits.length, 0)
                          return (
                            <div
                              key={k}
                              className="sc-gcell h-7 w-[1.35rem] rounded-[5px] px-0 text-[0.82rem]"
                              data-tone={fl.tone ?? 'default'}
                              style={{ marginRight: g ? 10 : 2 }}
                            >
                              <Pop value={b} />
                            </div>
                          )
                        })}
                      </div>
                      {fl.label && (
                        <div className="mt-1 w-full border-t-2 pt-0.5 text-center text-[11px] font-semibold" style={{ borderColor: 'var(--t)', color: 'var(--color-text-secondary)' }}>
                          {fl.label}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {row.value && <div className="sc-label sc-mono whitespace-nowrap pl-2 pt-1.5 text-[var(--color-text-primary)]">{row.value}</div>}
            </div>
          )
        })}
      </div>
    </Scroll>
  )
}
