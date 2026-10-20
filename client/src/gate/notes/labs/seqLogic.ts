/*
  Sequential circuits — the pure logic behind the Chapter 6 Live Labs
  (Flip-flop Scope and Counter & FSM Simulator, Digital Logic).

  This module is the TypeScript twin of
  content/gate-notes/_checks/dl/seqlib.py: every function below follows the
  rules of the Python function of the same name (in camelCase), and
  content/gate-notes/_checks/dl/l6_lab_vectors.py writes vectors computed
  with seqlib (lab_vectors_ch6.json) that tests/gate-notes.test.js checks
  this module against. Change the two together.

    - flip-flops: ffNext, charTable, charEquation, excitation,
      excitationTable, convert (minimal SOPs from ./kmapLogic's minCovers,
      which lists the same covers in the same order as minlib.min_covers);
    - waveforms: scope (latch, positive / negative edge, master–slave; setup
      and hold windows, t_pd, race-around, the unknown state 'X');
    - registers and counters: ringStep, johnsonStep, lfsrStep, cycleFrom,
      registerCycle, autonomousCycles, selfStarting, rippleEvents,
      settledStates, designCounter, designedStep;
    - finite state machines: fromTable, run, shortest, reachable,
      partitions, implication, minimalStates, detector.

  Dependency-free apart from ./kmapLogic, erasable-syntax only (Node imports
  it type-stripped in the tests).
*/
import { cubeCells, minCovers, sopText } from './kmapLogic.ts'

export type Kind = 'SR' | 'JK' | 'D' | 'T'
export type Mode = 'latch' | 'pos' | 'neg' | 'ms'
export type Level = 0 | 1 | 'X'
export type Exc = 0 | 1 | 'x'
export type Ins = Record<string, number>

export const KINDS: Kind[] = ['SR', 'JK', 'D', 'T']
export const MODES: Mode[] = ['latch', 'pos', 'neg', 'ms']
export const INPUTS: Record<Kind, string[]> = { SR: ['S', 'R'], JK: ['J', 'K'], D: ['D'], T: ['T'] }

/** v as n bits, MSB first. */
export const bits = (v: number, n: number): number[] => Array.from({ length: n }, (_, i) => (v >> (n - 1 - i)) & 1)
export const val = (bs: number[]): number => bs.reduce((v, b) => 2 * v + b, 0)
export const binText = (v: number, n: number): string => v.toString(2).padStart(n, '0')

/* ── Flip-flop characteristics ─────────────────────────────────────────── */

/** Next state of a `kind` flip-flop from q; SR with S = R = 1 gives null (forbidden). */
export function ffNext(kind: Kind, q: number, inp: Ins): number | null {
  if (kind === 'SR') {
    const s = inp.S!
    const r = inp.R!
    if (s && r) return null
    return s ? 1 : r ? 0 : q
  }
  if (kind === 'JK') return (inp.J! & (1 - q)) | ((1 - inp.K!) & q)
  if (kind === 'D') return inp.D!
  return inp.T! ^ q
}

const insOf = (kind: Kind, b: number[]): Ins => Object.fromEntries(INPUTS[kind].map((nm, i) => [nm, b[i]!]))

/** Rows [inputs…, Q, Q+] of the characteristic table (Q+ null = forbidden). */
export function charTable(kind: Kind): (number | null)[][] {
  const k = INPUTS[kind].length
  const out: (number | null)[][] = []
  for (let m = 0; m < 1 << k; m++) {
    const b = bits(m, k)
    for (const q of [0, 1]) out.push([...b, q, ffNext(kind, q, insOf(kind, b))])
  }
  return out
}

/** Every minimal SOP of Q+ over (inputs…, Q), the forbidden row a don't-care. */
export function charEquation(kind: Kind): string[] {
  const vars = [...INPUTS[kind], 'Q']
  const n = vars.length
  const ones: number[] = []
  const dcs: number[] = []
  for (let m = 0; m < 1 << n; m++) {
    const b = bits(m, n)
    const qn = ffNext(kind, b[n - 1]!, insOf(kind, b))
    if (qn === null) dcs.push(m)
    else if (qn) ones.push(m)
  }
  return minCovers(ones, dcs, n).covers.map((c) => sopText(c, vars))
}

/** Inputs that take a `kind` flip-flop from q to qn ('x' when both values work). */
export function excitation(kind: Kind, q: number, qn: number): Record<string, Exc> {
  const names = INPUTS[kind]
  const ok: number[][] = []
  for (let m = 0; m < 1 << names.length; m++) {
    const b = bits(m, names.length)
    if (ffNext(kind, q, insOf(kind, b)) === qn) ok.push(b)
  }
  if (!ok.length) throw new Error(`no excitation for ${kind} ${q} → ${qn}`)
  const res: Record<string, Exc> = {}
  names.forEach((nm, i) => {
    const vs = new Set(ok.map((o) => o[i]!))
    res[nm] = vs.size === 2 ? 'x' : (([...vs][0]! as 0 | 1))
  })
  return res
}

export function excitationTable(kind: Kind): [number, number, Record<string, Exc>][] {
  const out: [number, number, Record<string, Exc>][] = []
  for (const q of [0, 1]) for (const qn of [0, 1]) out.push([q, qn, excitation(kind, q, qn)])
  return out
}

/**
 * Build a `target` flip-flop from a `have` flip-flop: for every input of
 * `have`, its minimal SOPs over (target inputs…, Q), with the excitation
 * don't-cares and, for an SR target, S = R = 1 as a don't-care row.
 */
export function convert(target: Kind, have: Kind): Record<string, string[]> {
  const tin = INPUTS[target]
  const vars = [...tin, 'Q']
  const n = vars.length
  const cols: Record<string, [number[], number[]]> = {}
  for (const nm of INPUTS[have]) cols[nm] = [[], []]
  for (let m = 0; m < 1 << n; m++) {
    const b = bits(m, n)
    const q = b[n - 1]!
    const qn = ffNext(target, q, insOf(target, b))
    for (const nm of INPUTS[have]) {
      if (qn === null) {
        cols[nm]![1].push(m)
        continue
      }
      const e = excitation(have, q, qn)[nm]
      if (e === 'x') cols[nm]![1].push(m)
      else if (e === 1) cols[nm]![0].push(m)
    }
  }
  const out: Record<string, string[]> = {}
  for (const nm of INPUTS[have]) out[nm] = minCovers(cols[nm]![0], cols[nm]![1], n).covers.map((c) => sopText(c, vars))
  return out
}

/* ── Waveform model ────────────────────────────────────────────────────── */

function defined(kind: Kind, ins: Ins): Level {
  if (kind === 'D') return ins.D! as 0 | 1
  if (kind === 'SR' && ins.S !== ins.R) return ins.S! as 0 | 1
  if (kind === 'JK' && ins.J !== ins.K) return ins.J! as 0 | 1
  return 'X'
}

/** ffNext that also handles the unknown state 'X' and reports S = R = 1 as 'F'. */
export function ffStep(kind: Kind, q: Level, ins: Ins): Level | 'F' {
  if (kind === 'SR' && ins.S && ins.R) return 'F'
  if (q === 'X') return defined(kind, ins)
  return ffNext(kind, q, ins) as 0 | 1
}

export type ViolationKind = 'setup' | 'hold' | 'forbidden'
export type Violation = [number, ViolationKind, string]

export interface ScopeResult {
  S: Level[]
  Q: Level[]
  M: Level[]
  viol: Violation[]
  edges: number[]
}

export interface ScopeOptions {
  q0?: Level
  tsu?: number
  th?: number
  tpd?: number
}

/**
 * The tick model of seqlib.scope. An edge happens at the start of tick t when
 * clk[t − 1] ≠ clk[t]; an edge-triggered flip-flop samples the inputs of tick
 * t − 1; an input change at tick c violates setup at edge t when
 * t − tsu < c < t and hold when t ≤ c < t + th (the state becomes 'X');
 * Q[t] = S[t − tpd]. A level latch (transparent while clk = 1) computes a JK
 * or T next state from its own delayed output (race-around); S = R = 1 is
 * flagged and drives 0, releasing it leaves 'X'. A master–slave flip-flop's
 * master follows the inputs while clk = 1, gated by the slave, and the slave
 * copies it at the falling edge.
 */
export function scope(kind: Kind, mode: Mode, clk: number[], inp: Record<string, number[]>, opts: ScopeOptions = {}): ScopeResult {
  const { q0 = 0, tsu = 0, th = 0, tpd = 1 } = opts
  const N = clk.length
  const names = INPUTS[kind]
  for (const nm of names) if (inp[nm]?.length !== N) throw new Error(`input ${nm} needs ${N} ticks`)
  if (tpd < 1) throw new Error('tpd ≥ 1')
  const ch: Record<string, number[]> = {}
  for (const nm of names) {
    ch[nm] = []
    for (let c = 1; c < N; c++) if (inp[nm]![c] !== inp[nm]![c - 1]) ch[nm]!.push(c)
  }
  const S: Level[] = []
  const M: Level[] = []
  const viol: Violation[] = []
  const edges: number[] = []
  const prev = (t: number): Level => (t > 0 ? S[t - 1]! : q0)
  const out = (t: number): Level => (t - tpd >= 0 ? S[t - tpd]! : q0)
  let forb = false
  let m: Level = q0
  for (let t = 0; t < N; t++) {
    const ins: Ins = {}
    for (const nm of names) ins[nm] = inp[nm]![t]!
    let s: Level | 'F' = prev(t)
    if (mode === 'pos' || mode === 'neg') {
      const want = mode === 'pos' ? 1 : 0
      if (t > 0 && clk[t] === want && clk[t - 1] !== want) {
        edges.push(t)
        const smp: Ins = {}
        for (const nm of names) smp[nm] = inp[nm]![t - 1]!
        const keys = new Set<string>()
        const bad: Violation[] = []
        const add = (kindV: ViolationKind, nm: string) => {
          const key = `${kindV}|${nm}`
          if (!keys.has(key)) {
            keys.add(key)
            bad.push([t, kindV, nm])
          }
        }
        for (const nm of names) for (const c of ch[nm]!) if (t - tsu < c && c < t) add('setup', nm)
        for (const nm of names) for (const c of ch[nm]!) if (t <= c && c < t + th) add('hold', nm)
        bad.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0))
        if (bad.length) {
          viol.push(...bad)
          s = 'X'
        } else {
          s = ffStep(kind, s, smp)
          if (s === 'F') {
            viol.push([t, 'forbidden', 'S,R'])
            s = 'X'
          }
        }
      }
    } else if (mode === 'latch') {
      if (clk[t]) {
        if (kind === 'SR' && ins.S && ins.R) {
          if (!forb) viol.push([t, 'forbidden', 'S,R'])
          forb = true
          s = 0
        } else if (forb) {
          forb = false
          s = !(ins.S || ins.R) ? 'X' : (ins.S as 0 | 1)
        } else if (kind === 'JK' || kind === 'T') {
          s = ffStep(kind, out(t), ins)
        } else {
          s = ffStep(kind, s, ins)
        }
      } else if (forb) {
        forb = false
        s = 'X'
      }
    } else {
      if (clk[t]) {
        const qs = prev(t)
        if (kind === 'D') m = ins.D! as 0 | 1
        else {
          const a = kind === 'JK' ? ins.J! : kind === 'T' ? ins.T! : ins.S!
          const b = kind === 'JK' ? ins.K! : kind === 'T' ? ins.T! : ins.R!
          if (kind === 'SR') {
            if (a && b) {
              if (m !== 'X') viol.push([t, 'forbidden', 'S,R'])
              m = 'X'
            } else if (a || b) m = a as 0 | 1
          } else if (qs === 'X') {
            if (a !== b) m = a as 0 | 1
            else if (a && b) m = 'X'
          } else if (a && qs === 0) m = 1
          else if (b && qs === 1) m = 0
        }
      }
      if (t > 0 && clk[t - 1] === 1 && clk[t] === 0) {
        edges.push(t)
        s = m
      }
      M.push(m)
    }
    S.push(s as Level)
  }
  return { S, Q: Array.from({ length: N }, (_, t) => out(t)), M, viol, edges }
}

/** The labs' generated clock: low for period/2 ticks, then high (50 % duty), from tick 0. */
export const clockWave = (n: number, period: number): number[] => Array.from({ length: n }, (_, t) => Math.floor(t / Math.floor(period / 2)) % 2)

/** Waveform text ('0', '1', 'X' per tick) ⇄ arrays. */
export const waveText = (xs: (number | string)[]): string => xs.join('')
export const waveOf = (s: string): number[] => [...s].map((c) => (c === '1' ? 1 : 0))

/* ── Registers, cycles and the self-start check ────────────────────────── */

export const ringStep = (reg: number[]): number[] => [reg[reg.length - 1]!, ...reg.slice(0, -1)]
export const johnsonStep = (reg: number[]): number[] => [1 - reg[reg.length - 1]!, ...reg.slice(0, -1)]

/** Fibonacci LFSR shifting right: the new leftmost bit is din ⊕ the tapped cells (0 = leftmost). */
export function lfsrStep(reg: number[], taps: number[], din = 0): number[] {
  let fb = din
  for (const t of taps) fb ^= reg[t]!
  return [fb, ...reg.slice(0, -1)]
}

/** Run an autonomous machine from s0: the tail before the loop and the loop itself. */
export function cycleFrom<T>(step: (s: T) => T, s0: T, key: (s: T) => string = String, limit = 10000): { prefix: T[]; cycle: T[] } {
  const seq: T[] = []
  const pos = new Map<string, number>()
  let s = s0
  while (!pos.has(key(s))) {
    pos.set(key(s), seq.length)
    seq.push(s)
    s = step(s)
    if (seq.length > limit) throw new Error('no cycle within the limit')
  }
  const k = pos.get(key(s))!
  return { prefix: seq.slice(0, k), cycle: seq.slice(k) }
}

export const registerCycle = (step: (r: number[]) => number[], init: number[]): number[][] => cycleFrom(step, init, (r) => r.join('')).cycle

/** A register step on the state read as a number (leftmost cell = MSB). */
export const intStep = (n: number, f: (r: number[]) => number[]) => (s: number) => val(f(bits(s, n)))

/** Every cycle of an autonomous next-state map, each starting at its smallest state, sorted. */
export function autonomousCycles(step: (s: number) => number, states: number[]): number[][] {
  const cycles: number[][] = []
  const seen = new Set<number>()
  for (const s of states) {
    const cyc = cycleFrom(step, s).cycle
    const key = Math.min(...cyc)
    if (!seen.has(key)) {
      seen.add(key)
      const i = cyc.indexOf(key)
      cycles.push([...cyc.slice(i), ...cyc.slice(0, i)])
    }
  }
  return cycles.sort((a, b) => a[0]! - b[0]!)
}

/** True when every state eventually enters the cycle `main`. */
export function selfStarting(step: (s: number) => number, states: number[], main: number[]): boolean {
  const m = new Set(main)
  return states.every((s) => cycleFrom(step, s).cycle.every((x) => m.has(x)))
}

/* ── Ripple counters ───────────────────────────────────────────────────── */

export interface RippleOptions {
  start?: number
  down?: boolean
  edge?: 'neg' | 'pos'
  clear?: ((q: number) => boolean) | null
  tclr?: number | null
}

/**
 * Event simulation of an n-bit ripple counter (seqlib.ripple_events): stage 0
 * toggles tpd after each clock in `clocks`; stage i toggles tpd after stage
 * i − 1 makes the transition that carries (up: 1 → 0, down: 0 → 1, reversed
 * for positive-edge stages). An asynchronous clear resets every stage tclr
 * after a state satisfying `clear` appears. Returns [time, state] after every
 * change (bit 0 = Q0), so the transient states show up.
 */
export function rippleEvents(n: number, tpd: number, clocks: number[], opts: RippleOptions = {}): [number, number][] {
  const { start = 0, down = false, edge = 'neg', clear = null } = opts
  const tclr = opts.tclr ?? tpd
  let q = start
  let ev: [number, number][] = clocks.map((c) => [c + tpd, 0])
  const out: [number, number][] = [[0, q]]
  let pendingClear: number | null = null
  const order = (a: [number, number], b: [number, number]) => a[0] - b[0] || a[1] - b[1]
  while (ev.length || pendingClear !== null) {
    ev.sort(order)
    if (pendingClear !== null && (!ev.length || pendingClear <= ev[0]![0])) {
      const t: number = pendingClear
      pendingClear = null
      if (q !== 0) {
        q = 0
        out.push([t, q])
      }
      ev = ev.filter((e) => e[0] > t)
      continue
    }
    const [t, i] = ev.shift()!
    const old = (q >> i) & 1
    q ^= 1 << i
    out.push([t, q])
    let carry = !down ? old === 1 : old === 0
    if (edge === 'pos') carry = !carry
    if (i + 1 < n && carry) ev.push([t + tpd, i + 1])
    if (clear && clear(q) && pendingClear === null) pendingClear = t + tclr
  }
  return out
}

/** The state just before each later clock (and before periodEnd), after settling. */
export function settledStates(events: [number, number][], clocks: number[], periodEnd: number = Infinity): (number | null)[] {
  return [...clocks.slice(1), periodEnd].map((c) => {
    let s: number | null = null
    for (const [t, q] of events) if (t < c) s = q
    return s
  })
}

/* ── Synchronous counter design ────────────────────────────────────────── */

/** Minimum number of flip-flops for n distinct states. */
export const ffCount = (nStates: number): number => (nStates > 1 ? Math.max(1, Math.ceil(Math.log2(nStates))) : 0)

export interface CounterDesign {
  vars: string[]
  n: number
  names: string[]
  inputs: Record<string, [number[], number[]]>
  sop: Record<string, string[]>
  covers: Record<string, string[]>
  /** next[s] for every state; null = an unused state left as a don't-care. */
  next: (number | null)[]
}

/**
 * The excitation-table design of a synchronous counter through `seq` (distinct
 * values, cyclic), flip-flops Q_{n−1} … Q0; unused states are don't-cares
 * ('dc') or forced to a next state (a number, or a per-state map).
 */
export function designCounter(seq: number[], kind: Kind, nbits?: number | null, unused: 'dc' | number | Record<number, number> = 'dc'): CounterDesign {
  if (new Set(seq).size !== seq.length) throw new Error('repeated values need extra state bits')
  const n = nbits || ffCount(Math.max(...seq) + 1)
  const vars = Array.from({ length: n }, (_, i) => `Q${n - 1 - i}`)
  const nxt = new Map<number, number>()
  seq.forEach((s, k) => nxt.set(s, seq[(k + 1) % seq.length]!))
  if (unused !== 'dc') for (let s = 0; s < 1 << n; s++) if (!nxt.has(s)) nxt.set(s, typeof unused === 'number' ? unused : unused[s]!)
  const names: string[] = []
  const inputs: Record<string, [number[], number[]]> = {}
  for (let i = 0; i < n; i++) for (const nm of INPUTS[kind]) {
    names.push(`${nm}${n - 1 - i}`)
    inputs[`${nm}${n - 1 - i}`] = [[], []]
  }
  for (let s = 0; s < 1 << n; s++) {
    for (let i = 0; i < n; i++) {
      const bit = n - 1 - i
      for (const nm of INPUTS[kind]) {
        const [ones, dcs] = inputs[`${nm}${bit}`]!
        if (!nxt.has(s)) {
          dcs.push(s)
          continue
        }
        const e = excitation(kind, (s >> bit) & 1, (nxt.get(s)! >> bit) & 1)[nm]
        if (e === 'x') dcs.push(s)
        else if (e === 1) ones.push(s)
      }
    }
  }
  const sop: Record<string, string[]> = {}
  const covers: Record<string, string[]> = {}
  for (const k of names) {
    const cs = minCovers(inputs[k]![0], inputs[k]![1], n).covers
    sop[k] = cs.map((c) => sopText(c, vars))
    covers[k] = cs[0]!
  }
  return { vars, n, names, inputs, sop, covers, next: Array.from({ length: 1 << n }, (_, s) => (nxt.has(s) ? nxt.get(s)! : null)) }
}

/** The next-state map of the circuit built from each input's first minimal cover. */
export function designedStep(design: CounterDesign, kind: Kind): (s: number) => number {
  const n = design.n
  const funcs: Record<string, Set<number>> = {}
  for (const [k, c] of Object.entries(design.covers)) funcs[k] = new Set(c.flatMap(cubeCells))
  return (s: number) => {
    let out = 0
    for (let bit = 0; bit < n; bit++) {
      const q = (s >> bit) & 1
      const ins: Ins = {}
      for (const nm of INPUTS[kind]) ins[nm] = funcs[`${nm}${bit}`]!.has(s) ? 1 : 0
      const r = ffNext(kind, q, ins)
      if (r === null) throw new Error('S = R = 1 in a designed counter')
      out |= r << bit
    }
    return out
  }
}

/* ── Finite state machines ─────────────────────────────────────────────── */

/** A Mealy machine (out keyed by input and state) or a Moore machine (out keyed by state). */
export interface Fsm {
  states: string[]
  alphabet: number[]
  delta: Record<string, string>
  out: Record<string, number>
  moore: boolean
  start: string
}

/** Key of (state, input) in delta and in a Mealy machine's out. */
export const sx = (s: string, x: number) => `${x}:${s}`

/** A state table row: next state per input, then the output per input (Mealy) or the state's output (Moore). */
export type FsmRow = (string | number)[]

export function fromTable(rows: [string, FsmRow][], alphabet: number[] = [0, 1], moore = false, start?: string): Fsm {
  const k = alphabet.length
  const delta: Record<string, string> = {}
  const out: Record<string, number> = {}
  for (const [s, r] of rows) {
    alphabet.forEach((x, i) => {
      delta[sx(s, x)] = String(r[i])
      if (!moore) out[sx(s, x)] = Number(r[k + i])
    })
    if (moore) out[s] = Number(r[k])
  }
  const states = rows.map((r) => r[0])
  for (const s of states) for (const x of alphabet) if (!states.includes(delta[sx(s, x)]!)) throw new Error(`${s}: unknown next state ${delta[sx(s, x)]}`)
  return { states, alphabet, delta, out, moore, start: start ?? states[0]! }
}

/** The table rows of a machine (inverse of fromTable). */
export const tableOf = (f: Fsm): [string, FsmRow][] =>
  f.states.map((s) => [s, [...f.alphabet.map((x) => f.delta[sx(s, x)]!), ...(f.moore ? [f.out[s]!] : f.alphabet.map((x) => f.out[sx(s, x)]!))]])

export const next = (f: Fsm, s: string, x: number): string => f.delta[sx(s, x)]!

/** The output produced with input x in state s (Moore: the output of the state entered). */
export const outOf = (f: Fsm, s: string, x: number): number => (f.moore ? f.out[next(f, s, x)]! : f.out[sx(s, x)]!)

export interface Run {
  states: string[]
  outs: number[]
  first: number | null
}

export function run(f: Fsm, xs: number[], s0?: string): Run {
  let s = s0 ?? f.start
  const states = [s]
  const outs: number[] = []
  for (const x of xs) {
    outs.push(outOf(f, s, x))
    s = next(f, s, x)
    states.push(s)
  }
  return { states, outs, first: f.moore ? f.out[states[0]!]! : null }
}

/** Shortest input string after which pred(state, last output) holds (breadth first). */
export function shortest(f: Fsm, pred: (s: string, y: number) => boolean, s0?: string): number[] | null {
  const start = s0 ?? f.start
  const q: [string, number[]][] = [[start, []]]
  const seen = new Set<string>([`${start}\u0000null`])
  while (q.length) {
    const [s, w] = q.shift()!
    for (const x of f.alphabet) {
      const t = next(f, s, x)
      const y = outOf(f, s, x)
      if (pred(t, y)) return [...w, x]
      const key = `${t}\u0000${y}`
      if (!seen.has(key)) {
        seen.add(key)
        q.push([t, [...w, x]])
      }
    }
  }
  return null
}

export function reachable(f: Fsm, s0?: string): Set<string> {
  const start = s0 ?? f.start
  const seen = new Set([start])
  const todo = [start]
  while (todo.length) {
    const s = todo.pop()!
    for (const x of f.alphabet) {
      const t = next(f, s, x)
      if (!seen.has(t)) {
        seen.add(t)
        todo.push(t)
      }
    }
  }
  return seen
}

export const signature = (f: Fsm, s: string): number[] => (f.moore ? [f.out[s]!] : f.alphabet.map((x) => f.out[sx(s, x)]!))

/**
 * Partition refinement: P0 groups states by output; each next round splits a
 * block by the blocks its states' next states fall in. Every round is
 * returned, until the number of blocks stops growing.
 */
export function partitions(f: Fsm): string[][][] {
  const idx = (s: string) => f.states.indexOf(s)
  const tidy = (P: string[][]) => P.map((b) => [...b].sort((a, c) => idx(a) - idx(c))).sort((a, c) => idx(a[0]!) - idx(c[0]!))
  const group = (items: string[], key: (s: string) => string) => {
    const m = new Map<string, string[]>()
    for (const s of items) {
      const k = key(s)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(s)
    }
    return [...m.values()]
  }
  let P = tidy(group(f.states, (s) => signature(f, s).join(',')))
  const rounds = [P]
  for (;;) {
    const where = new Map<string, number>()
    P.forEach((b, i) => b.forEach((s) => where.set(s, i)))
    const nw = tidy(P.flatMap((b) => group(b, (s) => f.alphabet.map((x) => where.get(next(f, s, x))).join(','))))
    if (nw.length === P.length) return rounds
    P = nw
    rounds.push(P)
  }
}

/** The pairwise implication table: [a, b, pass] for every distinguishable pair (pass 0 = outputs differ). */
export function implication(f: Fsm): [string, string, number][] {
  const st = f.states
  const key = (a: string, b: string) => (st.indexOf(a) < st.indexOf(b) ? `${a}\u0000${b}` : `${b}\u0000${a}`)
  const mark = new Map<string, number>()
  for (let i = 0; i < st.length; i++)
    for (const b of st.slice(i + 1)) if (signature(f, st[i]!).join(',') !== signature(f, b).join(',')) mark.set(key(st[i]!, b), 0)
  for (let k = 1; ; k++) {
    const nw = new Map<string, number>()
    for (let i = 0; i < st.length; i++) {
      const a = st[i]!
      for (const b of st.slice(i + 1)) {
        if (mark.has(key(a, b))) continue
        for (const x of f.alphabet) {
          const p = next(f, a, x)
          const q = next(f, b, x)
          if (p !== q && mark.has(key(p, q))) {
            nw.set(key(a, b), k)
            break
          }
        }
      }
    }
    if (!nw.size) break
    for (const [p, v] of nw) mark.set(p, v)
  }
  const out: [string, string, number][] = []
  for (let i = 0; i < st.length; i++) for (const b of st.slice(i + 1)) if (mark.has(key(st[i]!, b))) out.push([st[i]!, b, mark.get(key(st[i]!, b))!])
  return out
}

/** The part of a machine reachable from its start state. */
export function reachableMachine(f: Fsm): Fsm {
  const keep = reachable(f)
  const states = f.states.filter((s) => keep.has(s))
  const delta: Record<string, string> = {}
  const out: Record<string, number> = {}
  for (const s of states) {
    for (const x of f.alphabet) {
      delta[sx(s, x)] = next(f, s, x)
      if (!f.moore) out[sx(s, x)] = f.out[sx(s, x)]!
    }
    if (f.moore) out[s] = f.out[s]!
  }
  return { states, alphabet: f.alphabet, delta, out, moore: f.moore, start: f.start }
}

/** Number of states of the minimal machine (reachable part only, by default). */
export const minimalStates = (f: Fsm, reachableOnly = true): number => partitions(reachableOnly ? reachableMachine(f) : f).at(-1)!.length

/** The merged table of the last partition, each block named by its first state. */
export function merged(f: Fsm): [string, FsmRow][] {
  const P = partitions(f).at(-1)!
  const rep = new Map<string, string>()
  for (const b of P) for (const s of b) rep.set(s, b[0]!)
  return P.map((b) => {
    const s = b[0]!
    return [s, [...f.alphabet.map((x) => rep.get(next(f, s, x))!), ...signature(f, s)]] as [string, FsmRow]
  })
}

/**
 * seqlib.detector: the minimal detector of `pattern` (output 1 when the input
 * so far ends with it, overlapping, or when a non-overlapping occurrence
 * completes). States are the prefix lengths 0 … L − 1 (Mealy) or 0 … L
 * (Moore, state L outputs 1), named '0', '1', ….
 */
export function detector(pattern: string, overlap = true, moore = false): Fsm {
  const p = [...pattern].map(Number)
  const L = p.length
  const eq = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])
  const fail = (seq: number[]) => {
    for (let k = Math.min(seq.length, moore ? L : L - 1); k >= 0; k--) if (eq(seq.slice(seq.length - k), p.slice(0, k)) && k < L) return k
    return 0
  }
  const tail = (seq: number[]) => seq.slice(Math.max(0, seq.length - L))
  const states = Array.from({ length: moore ? L + 1 : L }, (_, i) => i)
  const delta: Record<string, string> = {}
  const out: Record<string, number> = {}
  for (const s of states) {
    for (const x of [0, 1]) {
      const seq = s < L ? [...p.slice(0, s), x] : [...p, x]
      const hit = eq(tail(seq), p) && seq.length >= L
      let nxt: number
      if (hit) {
        nxt = moore ? L : overlap ? fail(seq) : 0
        if (moore && !overlap) nxt = L
      } else nxt = fail(seq)
      if (moore && s === L) {
        const seq2 = overlap ? [...p, x] : [x]
        const h2 = seq2.length >= L && eq(tail(seq2), p)
        nxt = h2 ? L : fail(seq2)
      }
      delta[sx(String(s), x)] = String(nxt)
      if (!moore) out[sx(String(s), x)] = hit ? 1 : 0
    }
    if (moore) out[String(s)] = s === L ? 1 : 0
  }
  return { states: states.map(String), alphabet: [0, 1], delta, out, moore, start: '0' }
}

/** Rename a machine's states (for display: detector states 0, 1, … → S0, S1, …). */
export function renamed(f: Fsm, name: (s: string) => string): Fsm {
  return fromTable(
    tableOf(f).map(([s, r]) => [name(s), r.map((v, i) => (i < f.alphabet.length ? name(String(v)) : v))]),
    f.alphabet,
    f.moore,
    name(f.start),
  )
}

/* ── Lab presets (the same tables and waveforms as l6_lab_vectors.py) ── */

export interface ScopePreset {
  id: string
  label: string
  kind: Kind
  mode: Mode
  compare: Mode | ''
  period: number
  inputs: Record<string, string>
  tsu: number
  th: number
  tpd: number
  q0: Level
}

const runs = (...rs: [number, number][]) => rs.map(([v, k]) => String(v).repeat(k)).join('')

export const SCOPE_PRESETS: ScopePreset[] = [
  {
    id: 'latch-vs-edge',
    label: 'D latch vs edge',
    kind: 'D',
    mode: 'latch',
    compare: 'pos',
    period: 8,
    inputs: { D: '00111100' + '00000110' + '01111111' + '00000010' },
    tsu: 0,
    th: 0,
    tpd: 1,
    q0: 0,
  },
  {
    id: 'race-around',
    label: 'Race-around, 3-tick pulse (JK latch, J = K = 1)',
    kind: 'JK',
    mode: 'latch',
    compare: 'ms',
    period: 6,
    inputs: { J: '1'.repeat(32), K: '1'.repeat(32) },
    tsu: 0,
    th: 0,
    tpd: 1,
    q0: 0,
  },
  {
    id: 'race-around-8',
    label: 'Race-around, 4-tick pulse (period 8)',
    kind: 'JK',
    mode: 'latch',
    compare: 'ms',
    period: 8,
    inputs: { J: '1'.repeat(32), K: '1'.repeat(32) },
    tsu: 0,
    th: 0,
    tpd: 1,
    q0: 0,
  },
  {
    id: 'ms-jk',
    label: 'Master–slave JK',
    kind: 'JK',
    mode: 'ms',
    compare: 'neg',
    period: 8,
    inputs: { J: runs([0, 5], [1, 1], [0, 12], [1, 14]), K: runs([0, 13], [1, 1], [0, 4], [1, 14]) },
    tsu: 0,
    th: 0,
    tpd: 1,
    q0: 0,
  },
  {
    id: 'setup',
    label: 'Setup and hold violations',
    kind: 'D',
    mode: 'pos',
    compare: '',
    period: 8,
    inputs: { D: runs([0, 1], [1, 10], [0, 9], [1, 6], [0, 6]) },
    tsu: 2,
    th: 1,
    tpd: 1,
    q0: 0,
  },
  {
    id: 'sr-forbidden',
    label: 'SR forbidden, then released',
    kind: 'SR',
    mode: 'latch',
    compare: '',
    period: 8,
    inputs: {
      S: runs([0, 5], [1, 1], [0, 6], [1, 2], [0, 8], [1, 4], [0, 3], [1, 1], [0, 2]),
      R: runs([0, 12], [1, 2], [0, 6], [1, 1], [0, 1], [1, 4], [0, 6]),
    },
    tsu: 0,
    th: 0,
    tpd: 1,
    q0: 0,
  },
]

export interface FsmPreset {
  id: string
  label: string
  moore: boolean
  start: string
  rows: [string, FsmRow][]
}

export const FSM_PRESETS: FsmPreset[] = [
  { id: 'det101', label: 'Overlapping 101 detector (Mealy)', moore: false, start: 'S0', rows: tableOf(renamed(detector('101'), (s) => `S${s}`)) },
  {
    id: 'comp2',
    label: 'Serial 2’s complementer',
    moore: false,
    start: 'Q0',
    rows: [
      ['Q0', ['Q0', 'Q1', 0, 1]],
      ['Q1', ['Q1', 'Q1', 1, 0]],
    ],
  },
  {
    id: 'gate1996',
    label: 'GATE 1996 table',
    moore: false,
    start: 'A',
    rows: [
      ['A', ['D', 'B', 0, 1]],
      ['B', ['A', 'C', 0, 1]],
      ['C', ['A', 'B', 0, 1]],
      ['D', ['A', 'C', 1, 1]],
    ],
  },
  {
    id: 'gate2025',
    label: 'GATE 2025 table',
    moore: false,
    start: 'A',
    rows: [
      ['A', ['F', 'B', 0, 0]],
      ['B', ['D', 'C', 0, 0]],
      ['C', ['F', 'E', 0, 0]],
      ['D', ['G', 'A', 1, 0]],
      ['E', ['D', 'C', 0, 0]],
      ['F', ['F', 'B', 1, 1]],
      ['G', ['G', 'H', 0, 1]],
      ['H', ['G', 'A', 1, 0]],
    ],
  },
]

/** Maximal-length LFSR taps (shift right, cells numbered from the left) for n = 2 … 5. */
export const MAX_TAPS: Record<number, number[]> = { 2: [0, 1], 3: [1, 2], 4: [2, 3], 5: [2, 4] }
