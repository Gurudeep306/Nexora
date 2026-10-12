/*
  Pure, dependency-free logic shared by the solution page and the Node
  validator (scripts/gate/validate-solutions.mjs imports this file directly —
  Node strips the types). No DOM, no React, only `import type`.
*/
import type { CircuitFrame, Frame, FramePatch, GateType, KmapFrame, PagingFrame, Solution } from './types.ts'

/* ── Step frames ─────────────────────────────────────────────────────────── */

function applyPatch(prev: Frame, patch: FramePatch): Frame {
  if (prev.kind === 'panels' && Array.isArray(patch.panels)) {
    // Panels merge element-wise: each entry patches the panel at that index
    // (null keeps it; an entry with `kind` replaces it).
    const panels = prev.panels.map((p, i) => {
      const q = (patch.panels as (FramePatch | null)[])[i]
      return q ? (q.kind ? (q as unknown as Frame) : applyPatch(p, q)) : p
    })
    const extra = (patch.panels as unknown as (Frame | null)[]).slice(prev.panels.length).filter((x): x is Frame => !!x)
    return { ...prev, ...patch, kind: 'panels', panels: [...panels, ...extra] } as Frame
  }
  return { ...prev, ...patch, kind: prev.kind } as Frame
}

/**
 * The frame shown at every step: the animation base, patched cumulatively by
 * each step's `scene`. A scene with `kind` starts a fresh frame. Null when the
 * solution has no animation at all.
 */
export function stepFrames(sol: Pick<Solution, 'animation' | 'steps'>): (Frame | null)[] {
  let cur: Frame | null = sol.animation ?? null
  return sol.steps.map((s) => {
    if (s.scene) {
      if (s.scene.kind) cur = s.scene as unknown as Frame
      else if (cur) cur = applyPatch(cur, s.scene)
    }
    return cur
  })
}

/** Does the solution animate (more than one distinct frame)? */
export function isAnimated(frames: (Frame | null)[]): boolean {
  const seen = new Set<Frame>()
  for (const f of frames) if (f) seen.add(f)
  return seen.size > 1
}

/* ── Paging ──────────────────────────────────────────────────────────────── */

export interface PagingColumn {
  ref: string
  /** Frame slots after this reference (null = empty). */
  slots: (string | null)[]
  hit: boolean
  /** Slot that was loaded (fault) or hit. */
  slot: number
  /** Page evicted on this reference, if any. */
  evicted: string | null
}

/**
 * Simulates FIFO / LRU / OPT with pages kept in fixed slots (the usual GATE
 * drawing). OPT evicts the page whose next use is farthest away; pages never
 * used again tie-break by FIFO (earliest loaded first).
 */
export function simulatePaging(f: Pick<PagingFrame, 'policy' | 'frames' | 'refs'>): { cols: PagingColumn[]; faults: number } {
  const refs = f.refs.map(String)
  const slots: (string | null)[] = Array(f.frames).fill(null)
  const loadedAt: number[] = Array(f.frames).fill(-1)
  const usedAt: number[] = Array(f.frames).fill(-1)
  const cols: PagingColumn[] = []
  let faults = 0
  refs.forEach((r, t) => {
    let slot = slots.indexOf(r)
    let evicted: string | null = null
    const hit = slot >= 0
    if (!hit) {
      faults++
      slot = slots.indexOf(null)
      if (slot < 0) {
        const idx = slots.map((_, i) => i)
        if (f.policy === 'FIFO') slot = idx.reduce((a, b) => (loadedAt[b] < loadedAt[a] ? b : a))
        else if (f.policy === 'LRU') slot = idx.reduce((a, b) => (usedAt[b] < usedAt[a] ? b : a))
        else {
          const next = (p: string) => {
            const k = refs.indexOf(p, t + 1)
            return k < 0 ? Infinity : k
          }
          slot = idx.reduce((a, b) => {
            const na = next(slots[a]!)
            const nb = next(slots[b]!)
            if (nb !== na) return nb > na ? b : a
            return loadedAt[b] < loadedAt[a] ? b : a
          })
        }
        evicted = slots[slot]
      }
      slots[slot] = r
      loadedAt[slot] = t
    }
    usedAt[slot] = t
    cols.push({ ref: r, slots: [...slots], hit, slot, evicted })
  })
  return { cols, faults }
}

/* ── K-map ───────────────────────────────────────────────────────────────── */

const GRAY: Record<number, number[]> = { 0: [0], 1: [0, 1], 2: [0, 1, 3, 2] }

/** Row / column bit counts: rows take the first half of the variables. */
export function kmapShape(nVars: number): { rowBits: number; colBits: number } {
  const rowBits = Math.floor(nVars / 2)
  return { rowBits, colBits: nVars - rowBits }
}

export function kmapAxes(nVars: number): { rows: number[]; cols: number[] } {
  const { rowBits, colBits } = kmapShape(nVars)
  return { rows: GRAY[rowBits], cols: GRAY[colBits] }
}

/** Grid position of a minterm. */
export function kmapPos(nVars: number, m: number): { r: number; c: number } {
  const { colBits } = kmapShape(nVars)
  const { rows, cols } = kmapAxes(nVars)
  return { r: rows.indexOf(m >> colBits), c: cols.indexOf(m & ((1 << colBits) - 1)) }
}

/** Splits a set of cyclic positions into contiguous linear runs, or null if not one cyclic run. */
export function cyclicRuns(pos: number[], n: number): [number, number][] | null {
  const s = [...new Set(pos)].sort((a, b) => a - b)
  if (s.length === n) return [[0, n - 1]]
  // find a gap; the run starts right after it
  const inSet = new Set(s)
  const start = s.find((p) => !inSet.has((p - 1 + n) % n))
  if (start === undefined) return null
  const run: number[] = []
  for (let k = 0, p = start; k < s.length; k++, p = (p + 1) % n) {
    if (!inSet.has(p)) return null
    run.push(p)
  }
  const out: [number, number][] = []
  let a = run[0]
  let prev = run[0]
  for (const p of run.slice(1)) {
    if (p !== prev + 1) {
      out.push([a, prev])
      a = p
    }
    prev = p
  }
  out.push([a, prev])
  return out
}

/** Validates a K-map group: power-of-two size, a cyclic rectangle. Returns an error or null. */
export function kmapGroupError(f: Pick<KmapFrame, 'variables'>, cells: number[]): string | null {
  const n = f.variables.length
  const max = 1 << n
  if (!cells.length) return 'group is empty'
  for (const m of cells) if (!Number.isInteger(m) || m < 0 || m >= max) return `minterm ${m} is out of range 0..${max - 1}`
  const uniq = new Set(cells)
  if (uniq.size !== cells.length) return 'group repeats a minterm'
  if (uniq.size & (uniq.size - 1)) return `group size ${uniq.size} is not a power of two`
  const { rows, cols } = kmapAxes(n)
  const ps = cells.map((m) => kmapPos(n, m))
  const rs = [...new Set(ps.map((p) => p.r))]
  const cs = [...new Set(ps.map((p) => p.c))]
  if (rs.length * cs.length !== uniq.size) return 'group is not a rectangle'
  if (!cyclicRuns(rs, rows.length) || !cyclicRuns(cs, cols.length)) return 'group is not a contiguous (wrap-around) rectangle'
  if (rs.length & (rs.length - 1) || cs.length & (cs.length - 1)) return 'group sides must be powers of two'
  return null
}

/* ── Circuit ─────────────────────────────────────────────────────────────── */

const GATE_FN: Record<GateType, (xs: number[]) => number> = {
  AND: (xs) => (xs.every((x) => x === 1) ? 1 : 0),
  OR: (xs) => (xs.some((x) => x === 1) ? 1 : 0),
  NOT: (xs) => 1 - xs[0],
  BUF: (xs) => xs[0],
  NAND: (xs) => (xs.every((x) => x === 1) ? 0 : 1),
  NOR: (xs) => (xs.some((x) => x === 1) ? 0 : 1),
  XOR: (xs) => xs.reduce((a, b) => a ^ b, 0),
  XNOR: (xs) => 1 - xs.reduce((a, b) => a ^ b, 0),
}

/** Topological depth of every node (inputs 0) or an error string on a cycle / unknown id. */
export function circuitDepths(f: Pick<CircuitFrame, 'inputs' | 'gates'>): Map<string, number> | string {
  const depth = new Map<string, number>()
  for (const i of f.inputs) depth.set(i.id, 0)
  const gates = new Map(f.gates.map((g) => [g.id, g]))
  const visiting = new Set<string>()
  const visit = (id: string): number | string => {
    if (depth.has(id)) return depth.get(id)!
    const g = gates.get(id)
    if (!g) return `unknown signal "${id}"`
    if (visiting.has(id)) return `cycle through gate "${id}"`
    visiting.add(id)
    let d = 0
    for (const x of g.in) {
      const r = visit(x)
      if (typeof r === 'string') return r
      d = Math.max(d, r)
    }
    visiting.delete(id)
    depth.set(id, d + 1)
    return d + 1
  }
  for (const g of f.gates) {
    const r = visit(g.id)
    if (typeof r === 'string') return r
  }
  return depth
}

/** Signal values when every input has a value, else null. */
export function evaluateCircuit(f: Pick<CircuitFrame, 'inputs' | 'gates'>): Map<string, number> | null {
  if (f.inputs.some((i) => i.value !== 0 && i.value !== 1)) return null
  const depth = circuitDepths(f)
  if (typeof depth === 'string') return null
  const val = new Map<string, number>(f.inputs.map((i) => [i.id, i.value as number]))
  const order = [...f.gates].sort((a, b) => depth.get(a.id)! - depth.get(b.id)!)
  for (const g of order) val.set(g.id, GATE_FN[g.type](g.in.map((x) => val.get(x)!)))
  return val
}

/* ── Answers ─────────────────────────────────────────────────────────────── */

/** Option letters in a stored key ("A", "A; B", "B,D", ["A","C"]). */
export function keyLetters(answer: unknown): string[] {
  if (Array.isArray(answer)) return answer.map((x) => String(x).trim().toUpperCase()).sort()
  if (typeof answer !== 'string') return []
  const parts = answer.split(/[\s,;/]+|\band\b/i).map((x) => x.trim().toUpperCase()).filter(Boolean)
  return parts.every((p) => /^[A-E]$/.test(p)) ? parts.sort() : []
}

/** Numeric range of a stored NAT key: 12, "1.51", "0.49 to 0.51", "2:3". */
export function keyRange(answer: unknown): [number, number] | null {
  if (typeof answer === 'number' && Number.isFinite(answer)) return [answer, answer]
  if (typeof answer !== 'string') return null
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*(?:to|:|–|-(?=\s)|~)\s*(-?\d+(?:\.\d+)?)\s*$/i.exec(answer)
  if (m) return [Number(m[1]), Number(m[2])]
  const n = Number(answer.trim())
  return answer.trim() && Number.isFinite(n) ? [n, n] : null
}

/** Does a computed NAT value fall in the key range (with GATE-style rounding slack)? */
export function numberMatchesKey(x: number, answer: unknown): boolean {
  const r = keyRange(answer)
  if (!r) return false
  const [lo, hi] = r
  const slack = lo === hi ? Math.max(0.005, Math.abs(lo) * 1e-6) : 0.0051
  return x >= lo - slack && x <= hi + slack
}
