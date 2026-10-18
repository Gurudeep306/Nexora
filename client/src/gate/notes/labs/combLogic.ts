/*
  Combinational Workbench — the pure logic behind the Chapter 4 Live Lab
  (Digital Logic).

  Conventions (as in content/gate-notes/_checks/dl/comblib.py):
    - rows are numbered with the first variable as the most significant bit;
    - a MUX's select list is MSB first, so data input i is chosen when the
      select bits read i in binary; a decoder's address list is MSB first;
    - an enable is "active" when it equals 1 (active high) or 0 (active low);
      a disabled MUX outputs 0, a disabled decoder drives every output
      inactive (0, or 1 for active-low outputs).

  Everything here mirrors comblib:
    - muxOut / muxEquation: the N:1 MUX and Y = Σ mᵢ(S)·Iᵢ;
    - residues / residueName / implTable: the implementation table of a
      function on a MUX with chosen select variables (comblib.residues,
      residue_name, impl_table), names with ′ and the same term order;
    - realiseMux / realiseDecoder / verify: rebuild the realised truth table
      from the residues (or the decoder outputs) and compare with f;
    - decoder, demux, encoder, priorityEncoder (highest index wins).

  Dependency-free and erasable-syntax only: tests/gate-notes.test.js imports
  it in Node and checks it against vectors that
  content/gate-notes/_checks/dl/l4_lab_vectors.py computes with comblib.
*/

export type Cell = 0 | 1 | 'X'
export type CellValue = '0' | '1' | 'X'

export interface Fn {
  n: number
  ones: number[]
  dcs: number[]
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

/** Row m as n bits, MSB first. */
export const bitsOf = (m: number, n: number) => Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1)

/** Bits (MSB first) as an integer. */
export const num = (bits: number[]) => bits.reduce((v, b) => 2 * v + (b ? 1 : 0), 0)

export const log2 = (k: number) => Math.round(Math.log2(k))

/** Whether an enable input lets the block work. */
export const enabled = (en: number, enLow = false) => (enLow ? en === 0 : en === 1)

/* ── Multiplexer ───────────────────────────────────────────────────────── */

/** Output of a 2^k:1 MUX (select bits MSB first); a disabled MUX outputs 0. */
export function muxOut(data: number[], sel: number[], en = 1, enLow = false): number {
  if (data.length !== 1 << sel.length) throw new Error('a 2^k:1 MUX needs 2^k data inputs')
  return enabled(en, enLow) ? (data[num(sel)] ? 1 : 0) : 0
}

/** Select line names S(k−1) … S0, MSB first. */
export const selNames = (k: number) => Array.from({ length: k }, (_, i) => `S${k - 1 - i}`)

/** A product term in the lessons' prime notation (cube over 0, 1, '-'); 1 for the empty cube. */
export function termText(cube: string, vars: string[]): string {
  let s = ''
  for (let i = 0; i < cube.length; i++) {
    if (cube[i] === '1') s += vars[i]
    else if (cube[i] === '0') s += `${vars[i]}′`
  }
  return s || '1'
}

export const cubeOf = (m: number, n: number) => (n ? m.toString(2).padStart(n, '0') : '')

export interface MuxTerm {
  /** Data input index (and select minterm number). */
  i: number
  /** The select minterm mᵢ(S), e.g. S1′S0. */
  minterm: string
  /** The term text mᵢ(S)·Iᵢ. */
  text: string
}

/** The MUX equation Y = Σ mᵢ(S)·Iᵢ: its terms, the full text and the term the select bits pick. */
export function muxEquation(k: number, sel?: number[], names = selNames(k)): { terms: MuxTerm[]; text: string; active: number } {
  const terms = Array.from({ length: 1 << k }, (_, i) => {
    const minterm = termText(cubeOf(i, k), names)
    return { i, minterm, text: `${minterm}·I${i}` }
  })
  return { terms, text: `Y = ${terms.map((t) => t.text).join(' + ')}`, active: sel ? num(sel) : -1 }
}

/* ── Minimal SOP of a small residue (≤ 3 variables, by enumeration) ─────── */

function cubeCells(cube: string): number[] {
  let out = ['']
  for (const c of cube) out = out.flatMap((p) => (c === '-' ? [p + '0', p + '1'] : [p + c]))
  return out.map((s) => (s ? parseInt(s, 2) : 0)).sort((a, b) => a - b)
}

const literals = (cube: string) => [...cube].filter((c) => c !== '-').length

/** minlib.cube_key: fewer literals, then by the covered cells. */
function cubeCompare(a: string, b: string): number {
  const d = literals(a) - literals(b)
  if (d) return d
  const ca = cubeCells(a)
  const cb = cubeCells(b)
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) if (ca[i] !== cb[i]) return ca[i]! - cb[i]!
  return ca.length - cb.length
}

const strCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function allCubes(n: number): string[] {
  let out = ['']
  for (let i = 0; i < n; i++) out = out.flatMap((p) => [p + '0', p + '1', p + '-'])
  return out
}

const contains = (big: string, small: string) => [...big].every((b, i) => b === '-' || b === small[i])

/**
 * The first minimal SOP cover of minlib.min_covers (fewest literals, then fewest
 * terms; ties broken by the cover's cubes in cube_key order compared as
 * strings), found by trying every set of prime implicants. Meant for the small
 * residues of an implementation table (n ≤ 3).
 */
export function minCover(ones: number[], dcs: number[], n: number): string[] {
  if (!ones.length) return []
  const allowed = new Set([...ones, ...dcs])
  const one = new Set(ones)
  const inside = allCubes(n).filter((c) => cubeCells(c).every((m) => allowed.has(m)))
  const ps = inside
    .filter((c) => !inside.some((d) => d !== c && contains(d, c)))
    .filter((c) => cubeCells(c).some((m) => one.has(m)))
    .sort(cubeCompare)
  let best: string[] | null = null
  let bestCost: [number, number] = [Infinity, Infinity]
  for (let mask = 1; mask < 1 << ps.length; mask++) {
    const cover = ps.filter((_, i) => (mask >> i) & 1)
    const cov = new Set(cover.flatMap(cubeCells))
    if (!ones.every((m) => cov.has(m))) continue
    const cost: [number, number] = [cover.reduce((s, c) => s + literals(c), 0), cover.length]
    const better =
      cost[0] < bestCost[0] ||
      (cost[0] === bestCost[0] && cost[1] < bestCost[1]) ||
      (cost[0] === bestCost[0] && cost[1] === bestCost[1] && best !== null && cover.map((c, i) => strCompare(c, best![i]!)).find((d) => d !== 0)! < 0)
    if (better) {
      best = cover
      bestCost = cost
    }
  }
  return best ?? []
}

/* ── Implementation tables ─────────────────────────────────────────────── */

export interface Residue {
  /** Truth table over the residue variables (0, 1 or 'X'). */
  col: Cell[]
  /** 0, 1, x, x′ or a minimal SOP. */
  name: string
  /** The cubes of that SOP over the residue variables ([] for 0, [''…'-'] cube for 1). */
  cover: string[]
}

/** comblib.residues: per data input, the residue column over the remaining variables (original order). */
export function residues(fn: Fn, selIdx: number[]): { cols: Cell[][]; rest: number[] } {
  const { n, ones, dcs } = fn
  const one = new Set(ones)
  const dc = new Set(dcs)
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => !selIdx.includes(i))
  const cols: Cell[][] = []
  for (let s = 0; s < 1 << selIdx.length; s++) {
    const sb = bitsOf(s, selIdx.length)
    const col: Cell[] = []
    for (let r = 0; r < 1 << rest.length; r++) {
      const rb = bitsOf(r, rest.length)
      const bits = new Array<number>(n).fill(0)
      selIdx.forEach((i, j) => (bits[i] = sb[j]!))
      rest.forEach((i, j) => (bits[i] = rb[j]!))
      const m = num(bits)
      col.push(dc.has(m) ? 'X' : one.has(m) ? 1 : 0)
    }
    cols.push(col)
  }
  return { cols, rest }
}

/** comblib.residue_name with its cover: 0, 1, x, x′ for one variable; a minimal SOP for more. */
export function residue(col: Cell[], rvars: string[]): Residue {
  const care = col.filter((v) => v !== 'X')
  if (!care.length || care.every((v) => v === 0)) return { col, name: '0', cover: [] }
  if (care.every((v) => v === 1)) return { col, name: '1', cover: ['-'.repeat(rvars.length)] }
  const ones: number[] = []
  const dcs: number[] = []
  col.forEach((v, i) => {
    if (v === 1) ones.push(i)
    else if (v === 'X') dcs.push(i)
  })
  const key = (c: string) => c.replace(/-/g, '2')
  const cover = minCover(ones, dcs, rvars.length).sort((a, b) => literals(a) - literals(b) || strCompare(key(a), key(b)))
  return { col, name: cover.map((c) => termText(c, rvars)).join(' + '), cover }
}

export const residueName = (col: Cell[], rvars: string[]) => residue(col, rvars).name

export interface ImplTable {
  /** Variables on the select lines, MSB first. */
  selVars: string[]
  /** Residue variables (the rest, in their original order). */
  rvars: string[]
  /** One residue per data input I0 … I(2^k − 1). */
  res: Residue[]
}

/** comblib.impl_table: the residue on every data input. */
export function implTable(fn: Fn, selIdx: number[], vars: string[]): ImplTable {
  const { cols, rest } = residues(fn, selIdx)
  const rvars = rest.map((i) => vars[i]!)
  return { selVars: selIdx.map((i) => vars[i]!), rvars, res: cols.map((c) => residue(c, rvars)) }
}

const coverValue = (cover: string[], bits: number[]) => (cover.some((c) => [...c].every((ch, i) => ch === '-' || Number(ch) === bits[i])) ? 1 : 0)

/** The truth table the wired MUX computes: each row selects a data line and evaluates its residue. */
export function realiseMux(fn: Fn, selIdx: number[], table: ImplTable): number[] {
  const rest = Array.from({ length: fn.n }, (_, i) => i).filter((i) => !selIdx.includes(i))
  return Array.from({ length: 1 << fn.n }, (_, m) => {
    const b = bitsOf(m, fn.n)
    const s = num(selIdx.map((i) => b[i]!))
    return coverValue(table.res[s]!.cover, rest.map((i) => b[i]!))
  })
}

/* ── Decoder + OR / NOR ────────────────────────────────────────────────── */

export const zerosOf = (fn: Fn) => {
  const skip = new Set([...fn.ones, ...fn.dcs])
  return Array.from({ length: 1 << fn.n }, (_, m) => m).filter((m) => !skip.has(m))
}

/** Decoder + gate: OR the minterm outputs, or NOR the 0-row outputs when that list is shorter (ties → OR). */
export function decoderGate(fn: Fn): { gate: 'OR' | 'NOR'; outputs: number[] } {
  const ones = [...fn.ones].sort((a, b) => a - b)
  const zeros = zerosOf(fn)
  return zeros.length < ones.length ? { gate: 'NOR', outputs: zeros } : { gate: 'OR', outputs: ones }
}

/** The truth table of an n:2^n decoder (address = the variables, MSB first) feeding that gate. */
export function realiseDecoder(fn: Fn, g = decoderGate(fn)): number[] {
  return Array.from({ length: 1 << fn.n }, (_, m) => {
    const d = decoder(bitsOf(m, fn.n))
    const any = g.outputs.some((i) => d[i] === 1) ? 1 : 0
    return g.gate === 'OR' ? any : 1 - any
  })
}

/** Compare a realised truth table with f on its care rows. */
export function verify(fn: Fn, table: number[]): { ok: boolean; wrong: number[] } {
  const one = new Set(fn.ones)
  const dc = new Set(fn.dcs)
  const wrong = table.map((v, m) => (dc.has(m) || v === (one.has(m) ? 1 : 0) ? -1 : m)).filter((m) => m >= 0)
  return { ok: wrong.length === 0, wrong }
}

/* ── Decoders, DEMUX, encoders ─────────────────────────────────────────── */

/** Outputs D0 … D(2^n − 1) of an n:2^n decoder (address MSB first). */
export function decoder(addr: number[], en = 1, low = false, enLow = false): number[] {
  const k = num(addr)
  const on = enabled(en, enLow)
  return Array.from({ length: 1 << addr.length }, (_, i) => {
    const o = on && i === k ? 1 : 0
    return low ? 1 - o : o
  })
}

/** A 1:2^n DEMUX: the data bit appears on output num(sel), every other output is 0. */
export const demux = (d: number, sel: number[]) => decoder(sel, d)

/** A 2^n:n binary encoder (OR of the indices with bit j set), code MSB first. */
export function encoder(d: number[]): number[] {
  const n = Math.max(1, Math.ceil(Math.log2(d.length)))
  return Array.from({ length: n }, (_, j) => (d.some((v, i) => v && (i >> (n - 1 - j)) & 1) ? 1 : 0))
}

/** Priority encoder, highest index wins: code (MSB first), valid bit and the winning input (−1 if none). */
export function priorityEncoder(d: number[]): { code: number[]; valid: number; winner: number } {
  const n = Math.max(1, Math.ceil(Math.log2(d.length)))
  for (let i = d.length - 1; i >= 0; i--) if (d[i]) return { code: bitsOf(i, n), valid: 1, winner: i }
  return { code: new Array<number>(n).fill(0), valid: 0, winner: -1 }
}

/* ── Functions, editing and presets ────────────────────────────────────── */

export const VARS: Record<number, string[]> = { 3: ['A', 'B', 'C'], 4: ['A', 'B', 'C', 'D'] }

export const NEXT: Record<CellValue, CellValue> = { '0': '1', '1': 'X', X: '0' }

export function fnOf(values: CellValue[]): Fn {
  const ones: number[] = []
  const dcs: number[] = []
  values.forEach((v, m) => {
    if (v === '1') ones.push(m)
    else if (v === 'X') dcs.push(m)
  })
  return { n: log2(values.length), ones, dcs }
}

export function valuesOf(fn: Fn): CellValue[] {
  const one = new Set(fn.ones)
  const dc = new Set(fn.dcs)
  return Array.from({ length: 1 << fn.n }, (_, m) => (one.has(m) ? '1' : dc.has(m) ? 'X' : '0'))
}

export function sigmaText(fn: Fn): string {
  const s = `Σm(${fn.ones.join(', ')})`
  return fn.dcs.length ? `${s} + d(${fn.dcs.join(', ')})` : s
}

export type Target = 'mux4' | 'mux8' | 'dec'

export interface Preset {
  id: string
  label: string
  vars: string[]
  fn: Fn
  target: Target
  /** Select variables (indices into vars, MSB first) for a MUX target. */
  sel: number[]
}

/** Functions from the lessons and from GATE papers (each solved in the lessons). */
export const PRESETS: Preset[] = [
  { id: 'majority', label: 'Majority of x, y, z', vars: ['x', 'y', 'z'], fn: { n: 3, ones: [3, 5, 6, 7], dcs: [] }, target: 'mux4', sel: [0, 1] },
  { id: 'xor3', label: 'XOR₃: A ⊕ B ⊕ C', vars: ['A', 'B', 'C'], fn: { n: 3, ones: [1, 2, 4, 7], dcs: [] }, target: 'mux4', sel: [0, 1] },
  { id: 'gate2021', label: 'GATE 2021: Σm(0, 1, 3, 4, 5, 6), selects y, z', vars: ['x', 'y', 'z'], fn: { n: 3, ones: [0, 1, 3, 4, 5, 6], dcs: [] }, target: 'mux4', sel: [1, 2] },
  { id: 'gate2023', label: 'GATE 2023: A′ + A′C′ + AB′C', vars: ['A', 'B', 'C'], fn: { n: 3, ones: [0, 1, 2, 3, 5], dcs: [] }, target: 'mux4', sel: [0, 2] },
  { id: 'agtb', label: '2-bit A > B (A1 A0 B1 B0)', vars: ['A1', 'A0', 'B1', 'B0'], fn: { n: 4, ones: [4, 8, 9, 12, 13, 14], dcs: [] }, target: 'mux8', sel: [0, 1, 2] },
  { id: 'fa-sum', label: 'Full-adder sum S', vars: ['x', 'y', 'z'], fn: { n: 3, ones: [1, 2, 4, 7], dcs: [] }, target: 'dec', sel: [0, 1] },
  { id: 'fa-carry', label: 'Full-adder carry C', vars: ['x', 'y', 'z'], fn: { n: 3, ones: [3, 5, 6, 7], dcs: [] }, target: 'dec', sel: [0, 1] },
  { id: 'it2008', label: 'IT 2008: decoder (z = MSB), x ⊕ z', vars: ['z', 'y', 'x'], fn: { n: 3, ones: [1, 3, 4, 6], dcs: [] }, target: 'dec', sel: [0, 1] },
]
