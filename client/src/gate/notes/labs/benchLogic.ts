/*
  Gate Bench — the pure logic behind the Chapter 2 Live Lab (Digital Logic).

  A bench is a list of named inputs and a list of gates; each gate reads
  inputs or *earlier* gates, so a bench is always acyclic and evaluates in
  list order. Truth tables use the notes' convention: row index = the input
  values read as a binary number with the first input most significant.

  Dependency-free and erasable-syntax only: tests/gate-notes.test.js imports
  it in Node and checks it against vectors that
  content/gate-notes/_checks/dl/l2_lab_vectors.py computes with boollib.
*/

export type GateType = 'AND' | 'OR' | 'NOT' | 'BUF' | 'NAND' | 'NOR' | 'XOR' | 'XNOR'
export const GATE_TYPES: GateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF']

export interface BenchGate {
  id: string
  type: GateType
  in: string[]
}
export interface Bench {
  inputs: string[]
  gates: BenchGate[]
  /** The signal shown as the output F (an input or a gate id). */
  output: string
}

export const arity = (t: GateType) => (t === 'NOT' || t === 'BUF' ? 1 : 2)

/** One gate on 0/1 inputs (multi-input forms: all / any / odd parity). */
export function applyGate(t: GateType, xs: number[]): number {
  const all = xs.every((x) => x === 1)
  const any = xs.some((x) => x === 1)
  const odd = xs.reduce((a, b) => a ^ b, 0)
  switch (t) {
    case 'AND':
      return all ? 1 : 0
    case 'OR':
      return any ? 1 : 0
    case 'NAND':
      return all ? 0 : 1
    case 'NOR':
      return any ? 0 : 1
    case 'XOR':
      return odd
    case 'XNOR':
      return 1 - odd
    case 'NOT':
      return 1 - (xs[0] ?? 0)
    case 'BUF':
      return xs[0] ?? 0
  }
}

/** Problems with a bench: unknown or forward references, wrong input counts, a missing output. */
export function benchErrors(b: Bench): string[] {
  const errs: string[] = []
  const seen = new Set(b.inputs)
  for (const g of b.gates) {
    if (seen.has(g.id)) errs.push(`${g.id}: duplicate name`)
    if (g.in.length !== arity(g.type)) errs.push(`${g.id}: a ${g.type} gate here takes ${arity(g.type)} input${arity(g.type) === 1 ? '' : 's'}`)
    for (const s of g.in) if (!seen.has(s)) errs.push(`${g.id}: input "${s || '—'}" is not an earlier signal`)
    seen.add(g.id)
  }
  if (!seen.has(b.output)) errs.push(`output "${b.output}" is not a signal`)
  return errs
}

/** Every signal's value for one assignment of the inputs (in bench order). */
export function evaluate(b: Bench, values: Record<string, number>): Map<string, number> {
  const v = new Map<string, number>(b.inputs.map((i) => [i, values[i] ? 1 : 0]))
  for (const g of b.gates) v.set(g.id, applyGate(g.type, g.in.map((s) => v.get(s) ?? 0)))
  return v
}

/** Input values of truth-table row r (first input = most significant bit). */
export function rowValues(inputs: string[], r: number): Record<string, number> {
  const n = inputs.length
  return Object.fromEntries(inputs.map((name, k) => [name, (r >> (n - 1 - k)) & 1]))
}

/** The output column: one 0/1 per row, rows 0 … 2ⁿ − 1. */
export function truthTable(b: Bench, signal = b.output): number[] {
  const rows = 2 ** b.inputs.length
  return Array.from({ length: rows }, (_, r) => evaluate(b, rowValues(b.inputs, r)).get(signal) ?? 0)
}

export const minterms = (col: number[]) => col.flatMap((v, i) => (v ? [i] : []))
export const maxterms = (col: number[]) => col.flatMap((v, i) => (v ? [] : [i]))
export const formatSigma = (list: number[]) => `Σm(${list.join(', ')})`
export const formatPi = (list: number[]) => `ΠM(${list.join(', ')})`

/** Column depth of every gate (inputs are level 0): 1 + the deepest signal it reads. */
export function levels(b: Bench): Map<string, number> {
  const lv = new Map<string, number>(b.inputs.map((i) => [i, 0]))
  for (const g of b.gates) lv.set(g.id, 1 + Math.max(0, ...g.in.map((s) => lv.get(s) ?? 0)))
  return lv
}

/** Gates the output actually depends on (unused gates are not counted). */
export function usedGates(b: Bench): BenchGate[] {
  const byId = new Map(b.gates.map((g) => [g.id, g]))
  const need = new Set<string>()
  const walk = (s: string) => {
    const g = byId.get(s)
    if (!g || need.has(s)) return
    need.add(s)
    g.in.forEach(walk)
  }
  walk(b.output)
  return b.gates.filter((g) => need.has(g.id))
}

/* ── Minterm-set calculator ─────────────────────────────────────────── */

/** Parse "1, 3 5-7" into a sorted, de-duplicated list of row numbers below 2ⁿ. */
export function parseIndexList(text: string, n: number): { list: number[]; error?: string } {
  const max = 2 ** n - 1
  const out = new Set<number>()
  const parts = text.split(/[\s,;]+/).filter(Boolean)
  for (const p of parts) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(p)
    if (!m) return { list: [...out].sort((a, b) => a - b), error: `"${p}" is not a row number` }
    const lo = Number(m[1])
    const hi = m[2] === undefined ? lo : Number(m[2])
    if (hi < lo) return { list: [...out].sort((a, b) => a - b), error: `"${p}" runs backwards` }
    if (hi > max) return { list: [...out].sort((a, b) => a - b), error: `${hi} is not a row of a ${n}-variable table (0–${max})` }
    for (let k = lo; k <= hi; k++) out.add(k)
  }
  return { list: [...out].sort((a, b) => a - b) }
}

/** AND = ∩, OR = ∪, XOR = symmetric difference, NOT = complement (all over rows 0 … 2ⁿ − 1). */
export function setOps(f: number[], g: number[], n: number) {
  const F = new Set(f)
  const G = new Set(g)
  const rows = Array.from({ length: 2 ** n }, (_, i) => i)
  return {
    and: rows.filter((i) => F.has(i) && G.has(i)),
    or: rows.filter((i) => F.has(i) || G.has(i)),
    xor: rows.filter((i) => F.has(i) !== G.has(i)),
    notF: rows.filter((i) => !F.has(i)),
    notG: rows.filter((i) => !G.has(i)),
  }
}

/* ── NAND-only / NOR-only challenge ─────────────────────────────────── */

export interface Challenge {
  id: string
  /** Plain-text name of the target function. */
  label: string
  inputs: string[]
  /** Target output column. */
  table: number[]
  /** Proven minimum number of 2-input gates (exhaustive search in boollib). */
  min: { NAND: number; NOR: number }
}

const col = (inputs: string[], f: (v: Record<string, number>) => number) =>
  Array.from({ length: 2 ** inputs.length }, (_, r) => f(rowValues(inputs, r)) & 1)
const AB = ['A', 'B']
const ABC = ['A', 'B', 'C']

export const CHALLENGES: Challenge[] = [
  { id: 'not', label: 'NOT A', inputs: ['A'], table: col(['A'], (v) => 1 - v.A!), min: { NAND: 1, NOR: 1 } },
  { id: 'and', label: 'A AND B', inputs: AB, table: col(AB, (v) => v.A! & v.B!), min: { NAND: 2, NOR: 3 } },
  { id: 'or', label: 'A OR B', inputs: AB, table: col(AB, (v) => v.A! | v.B!), min: { NAND: 3, NOR: 2 } },
  { id: 'nand', label: 'A NAND B', inputs: AB, table: col(AB, (v) => 1 - (v.A! & v.B!)), min: { NAND: 1, NOR: 4 } },
  { id: 'nor', label: 'A NOR B', inputs: AB, table: col(AB, (v) => 1 - (v.A! | v.B!)), min: { NAND: 4, NOR: 1 } },
  { id: 'xor', label: 'A XOR B', inputs: AB, table: col(AB, (v) => v.A! ^ v.B!), min: { NAND: 4, NOR: 5 } },
  { id: 'xnor', label: 'A XNOR B', inputs: AB, table: col(AB, (v) => 1 - (v.A! ^ v.B!)), min: { NAND: 5, NOR: 4 } },
  { id: 'inhibit', label: "A′B (B AND NOT A)", inputs: AB, table: col(AB, (v) => (1 - v.A!) & v.B!), min: { NAND: 3, NOR: 2 } },
  { id: 'ab-c', label: 'AB + C', inputs: ABC, table: col(ABC, (v) => (v.A! & v.B!) | v.C!), min: { NAND: 3, NOR: 3 } },
]

export interface ChallengeResult {
  match: boolean
  /** Rows (as input strings like "01") where the bench differs from the target. */
  wrongRows: string[]
  count: number
  /** Gate types used that are not the chosen family. */
  foreign: GateType[]
  min: number
}

export function checkChallenge(b: Bench, c: Challenge, family: 'NAND' | 'NOR'): ChallengeResult {
  const got = benchErrors(b).length ? [] : truthTable(b)
  const n = c.inputs.length
  const wrongRows = c.table.flatMap((want, r) => (got[r] === want ? [] : [r.toString(2).padStart(n, '0')]))
  const used = usedGates(b)
  return {
    match: got.length === c.table.length && wrongRows.length === 0,
    wrongRows,
    count: used.length,
    foreign: [...new Set(used.map((g) => g.type).filter((t) => t !== family))],
    min: c.min[family],
  }
}

/* ── Bench presets ──────────────────────────────────────────────────── */

export const PRESETS: { id: string; label: string; bench: Bench }[] = [
  {
    id: 'xor4',
    label: 'XOR from four NANDs',
    bench: {
      inputs: AB,
      gates: [
        { id: 'G1', type: 'NAND', in: ['A', 'B'] },
        { id: 'G2', type: 'NAND', in: ['A', 'G1'] },
        { id: 'G3', type: 'NAND', in: ['B', 'G1'] },
        { id: 'G4', type: 'NAND', in: ['G2', 'G3'] },
      ],
      output: 'G4',
    },
  },
  {
    id: 'majority',
    label: 'Majority AB + BC + CA',
    bench: {
      inputs: ABC,
      gates: [
        { id: 'G1', type: 'AND', in: ['A', 'B'] },
        { id: 'G2', type: 'AND', in: ['B', 'C'] },
        { id: 'G3', type: 'AND', in: ['C', 'A'] },
        { id: 'G4', type: 'OR', in: ['G1', 'G2'] },
        { id: 'G5', type: 'OR', in: ['G4', 'G3'] },
      ],
      output: 'G5',
    },
  },
  {
    id: 'glitch',
    label: 'X · X′ (the glitch circuit)',
    bench: {
      inputs: ['X'],
      gates: [
        { id: 'G1', type: 'NOT', in: ['X'] },
        { id: 'G2', type: 'AND', in: ['X', 'G1'] },
      ],
      output: 'G2',
    },
  },
  {
    id: 'nor4',
    label: 'Four NORs: the 1993 circuit',
    bench: {
      inputs: AB,
      gates: [
        { id: 'G1', type: 'NOR', in: ['A', 'B'] },
        { id: 'G2', type: 'NOR', in: ['A', 'G1'] },
        { id: 'G3', type: 'NOR', in: ['G1', 'B'] },
        { id: 'G4', type: 'NOR', in: ['G2', 'G3'] },
      ],
      output: 'G4',
    },
  },
]

/** A fresh name for the next gate (G1, G2, …, skipping names in use). */
export function nextGateId(b: Bench): string {
  const used = new Set([...b.inputs, ...b.gates.map((g) => g.id)])
  let k = 1
  while (used.has(`G${k}`)) k++
  return `G${k}`
}

/** Remove a gate; anything that read it is rewired to the first input, and the output falls back likewise. */
export function removeGate(b: Bench, id: string): Bench {
  const first = b.inputs[0] ?? ''
  const gates = b.gates.filter((g) => g.id !== id).map((g) => ({ ...g, in: g.in.map((s) => (s === id ? first : s)) }))
  return { ...b, gates, output: b.output === id ? (gates[gates.length - 1]?.id ?? first) : b.output }
}
