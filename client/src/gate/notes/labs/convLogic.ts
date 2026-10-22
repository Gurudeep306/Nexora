/*
  Data converters — the pure logic behind the Chapter 7 Live Lab
  (Converter Bench, Digital Logic).

  This module is the TypeScript twin of
  content/gate-notes/_checks/dl/convlib.py: every function below follows the
  rules of the Python function of the same name (in camelCase), with the same
  algorithm and the same order of operations, and
  content/gate-notes/_checks/dl/l7_lab_vectors.py writes vectors computed
  with convlib (lab_vectors_ch7.json) that tests/gate-notes.test.js checks
  this module against. Change the two together.

    - exact numbers: rational values Q (BigInt numerator and denominator,
      always reduced, denominator > 0); parseQ is convlib.frac for decimal
      strings, qStr prints like Python's str(Fraction);
    - solveNodes: nodal analysis (KCL at every unknown node, Gaussian
      elimination over the rationals);
    - DACs: ladder (current-switched R-2R), ladderVoltageMode, weighted,
      dacIdeal, stepSize, fullScale, resolutionPercent, staircase;
    - ADCs: lsb, idealCode, sar (step by step), flash, counterAdc,
      dualSlope, conversionClocks.

  Units: volts, kilo-ohms, milliamperes. Bit i has weight 2^i; bits are
  listed MSB first. Dependency-free, erasable-syntax only (Node imports it
  type-stripped in the tests).
*/

/* ── Exact numbers ──────────────────────────────────────────────────── */

export interface Q {
  n: bigint
  d: bigint
}

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}

/** The rational n / d, reduced (d ≠ 0). */
export function q(n: bigint | number, d: bigint | number = 1n): Q {
  let N = BigInt(n)
  let D = BigInt(d)
  if (D === 0n) throw new Error('division by zero')
  if (D < 0n) {
    N = -N
    D = -D
  }
  const g = gcd(N, D) || 1n
  return { n: N / g, d: D / g }
}

export const ZERO = q(0)
export const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d)
export const sub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d)
export const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d)
export const div = (a: Q, b: Q): Q => q(a.n * b.d, a.d * b.n)
export const neg = (a: Q): Q => q(-a.n, a.d)
/** −1, 0 or 1 as a < b, a = b, a > b. */
export const cmp = (a: Q, b: Q): number => {
  const x = a.n * b.d - b.n * a.d
  return x < 0n ? -1 : x > 0n ? 1 : 0
}
export const eq = (a: Q, b: Q): boolean => cmp(a, b) === 0
export const isZero = (a: Q): boolean => a.n === 0n
/** The greatest integer ≤ a. */
export const floorQ = (a: Q): number => {
  const f = a.n >= 0n ? a.n / a.d : -((-a.n + a.d - 1n) / a.d)
  return Number(f)
}
/** Like Python's str(Fraction): "3", "-5/8". */
export const qStr = (a: Q): string => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`)
export const qNum = (a: Q): number => Number(a.n) / Number(a.d)

/** convlib.frac for text: an exact value from a decimal string such as "3.37", "-0.5", ".25"; null if it is not one. */
export function parseQ(text: string): Q | null {
  const s0 = text.trim().replace('−', '-')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s0)) return null
  const negative = s0.startsWith('-')
  const s = s0.replace(/^[+-]/, '')
  let v: Q
  if (s.includes('.')) {
    const [a, b] = s.split('.')
    const p = 10n ** BigInt(b.length)
    v = q(BigInt(a || '0') * p + BigInt(b || '0'), p)
  } else v = q(BigInt(s))
  return negative ? neg(v) : v
}

/** convlib.dec: a short decimal (up to `places` decimals, trailing zeros dropped). */
export function dec(a: Q, places = 6): string {
  const s = qNum(a).toFixed(places).replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' || s === '' ? '0' : s
}

/** code as n bits, MSB first. */
export const bits = (code: number, n: number): number[] => Array.from({ length: n }, (_, i) => (code >> (n - 1 - i)) & 1)
export const bstr = (code: number, n: number): string => bits(code, n).join('')
const pow2 = (k: number): Q => q(2n ** BigInt(k))

/* ── Nodal analysis ─────────────────────────────────────────────────── */

export type Resistor = [string, string, Q]

/**
 * Node voltages of a resistor network: `unknown` nodes (in order) are solved
 * by Kirchhoff's current law, `fixed` nodes have given voltages. Returns every
 * node's voltage.
 */
export function solveNodes(unknown: string[], resistors: Resistor[], fixed: Record<string, Q>): Record<string, Q> {
  const idx = new Map(unknown.map((u, k) => [u, k]))
  const m = unknown.length
  const G: Q[][] = Array.from({ length: m }, () => Array.from({ length: m }, () => ZERO))
  const I: Q[] = Array.from({ length: m }, () => ZERO)
  for (const [a, b, r] of resistors) {
    const g = div(q(1), r)
    for (const [p, o] of [
      [a, b],
      [b, a],
    ]) {
      const ip = idx.get(p)
      if (ip === undefined) continue
      G[ip][ip] = add(G[ip][ip], g)
      const io = idx.get(o)
      if (io !== undefined) G[ip][io] = sub(G[ip][io], g)
      else I[ip] = add(I[ip], mul(g, fixed[o]))
    }
  }
  for (let c = 0; c < m; c++) {
    let p = c
    while (isZero(G[p][c])) p++
    ;[G[c], G[p]] = [G[p], G[c]]
    ;[I[c], I[p]] = [I[p], I[c]]
    for (let r = 0; r < m; r++) {
      if (r === c || isZero(G[r][c])) continue
      const f = div(G[r][c], G[c][c])
      for (let k = c; k < m; k++) G[r][k] = sub(G[r][k], mul(f, G[c][k]))
      I[r] = sub(I[r], mul(f, I[c]))
    }
  }
  const out: Record<string, Q> = { ...fixed }
  for (const [u, k] of idx) out[u] = div(I[k], G[k][k])
  return out
}

/* ── DACs ───────────────────────────────────────────────────────────── */

export interface Ladder {
  n: number
  code: number
  bits: number[]
  /** Node voltages A_{n-1} … A_0 (MSB first). */
  volts: Q[]
  /** 2R leg currents, MSB first. */
  legs: Q[]
  /** Current in the 2R terminator at A_0. */
  term: Q
  /** Series currents A_i → A_{i-1}, MSB first. */
  series: Q[]
  iref: Q
  iout: Q
  ignd: Q
  vo: Q
}

/**
 * Current-switched R-2R ladder: V_ref drives A_{n-1}; series R between
 * neighbouring nodes; each node's 2R leg goes to the summing node OUT
 * (virtual ground) when its bit is 1, to ground when 0; a 2R terminator at
 * A_0; V_o = −R_f · I_out.
 */
export function ladder(n: number, code: number, vref: Q, r: Q, rf: Q): Ladder {
  const b = bits(code, n)
  const names = Array.from({ length: n }, (_, k) => `A${n - 1 - k}`)
  const two = mul(q(2), r)
  const res: Resistor[] = []
  for (let k = 0; k < n - 1; k++) res.push([names[k], names[k + 1], r])
  for (let k = 0; k < n; k++) res.push([names[k], b[k] ? 'OUT' : 'GND', two])
  res.push([names[n - 1], 'GND', two])
  const v = solveNodes(names.slice(1), res, { [names[0]]: vref, OUT: ZERO, GND: ZERO })
  const volts = names.map((x) => v[x])
  const legs = volts.map((x) => div(x, two))
  const term = div(volts[n - 1], two)
  const series = Array.from({ length: n - 1 }, (_, k) => div(sub(volts[k], volts[k + 1]), r))
  const iref = add(legs[0], n > 1 ? series[0] : term)
  let iout = ZERO
  let ignd = ZERO
  for (let k = 0; k < n; k++) if (b[k]) iout = add(iout, legs[k])
  for (let k = 0; k < n; k++) if (!b[k]) ignd = add(ignd, legs[k])
  ignd = add(ignd, term)
  return { n, code, bits: b, volts, legs, term, series, iref, iout, ignd, vo: neg(mul(rf, iout)) }
}

/** Voltage-switched R-2R ladder: 2R legs to V_ref (bit 1) or ground (bit 0); output at the MSB node, unloaded. */
export function ladderVoltageMode(n: number, code: number, vref: Q, r: Q): { volts: Q[]; vout: Q } {
  const b = bits(code, n)
  const names = Array.from({ length: n }, (_, k) => `N${n - 1 - k}`)
  const two = mul(q(2), r)
  const res: Resistor[] = []
  for (let k = 0; k < n - 1; k++) res.push([names[k], names[k + 1], r])
  for (let k = 0; k < n; k++) res.push([names[k], b[k] ? 'REF' : 'GND', two])
  res.push([names[n - 1], 'GND', two])
  const v = solveNodes(names, res, { REF: vref, GND: ZERO })
  return { volts: names.map((x) => v[x]), vout: v[names[0]] }
}

/** Binary-weighted resistor DAC: resistors R, 2R, 4R, … (MSB first) from V_ref or ground into a virtual ground. */
export function weighted(n: number, code: number, vref: Q, r: Q, rf: Q): { resistors: Q[]; currents: Q[]; iout: Q; vo: Q; spread: Q } {
  const b = bits(code, n)
  const rs = Array.from({ length: n }, (_, k) => mul(r, pow2(k)))
  const v = solveNodes([], [], { REF: vref, SUM: ZERO })
  const cur = rs.map((x, k) => (b[k] ? div(sub(v.REF, v.SUM), x) : ZERO))
  const iout = cur.reduce(add, ZERO)
  return { resistors: rs, currents: cur, iout, vo: neg(mul(rf, iout)), spread: div(rs[n - 1], rs[0]) }
}

export const dacIdeal = (n: number, code: number, vref: Q): Q => div(mul(vref, q(code)), pow2(n))
export const stepSize = (n: number, vref: Q): Q => div(vref, pow2(n))
export const fullScale = (n: number, vref: Q): Q => div(mul(vref, sub(pow2(n), q(1))), pow2(n))
export const resolutionPercent = (n: number): Q => div(q(100), sub(pow2(n), q(1)))
export const staircase = (n: number, vref: Q, r: Q, rf: Q): Q[] => Array.from({ length: 2 ** n }, (_, c) => ladder(n, c, vref, r, rf).vo)

/* ── ADCs ───────────────────────────────────────────────────────────── */

export const lsb = (n: number, vref: Q): Q => div(vref, pow2(n))

/** floor(V_in / LSB), or floor(V_in / LSB + 1/2) with the ½-LSB offset, clipped to 0 … 2^n − 1. */
export function idealCode(n: number, vref: Q, vin: Q, offset = false): number {
  const x = add(div(vin, lsb(n, vref)), offset ? q(1, 2) : ZERO)
  return Math.max(0, Math.min(2 ** n - 1, floorQ(x)))
}

export interface SarStep {
  bit: number
  trial: number
  v: Q
  keep: boolean
  code: number
  /** Codes still possible before this step: lo ≤ code < hi. */
  range: [number, number]
}
export interface Sar {
  n: number
  lsb: Q
  steps: SarStep[]
  code: number
  vq: Q
  err: Q
  errLsb: Q
}

/** Successive approximation: one bit per clock, MSB first; keep the trial bit when V_in ≥ V_DAC. */
export function sar(n: number, vref: Q, vin: Q, offset = false): Sar {
  const qq = lsb(n, vref)
  const half = div(qq, q(2))
  let code = 0
  let lo = 0
  let hi = 2 ** n
  const steps: SarStep[] = []
  for (let k = n - 1; k >= 0; k--) {
    const trial = code | (1 << k)
    const v = sub(mul(q(trial), qq), offset ? half : ZERO)
    const keep = cmp(vin, v) >= 0
    const range: [number, number] = [lo, hi]
    if (keep) {
      code = trial
      lo = trial
    } else hi = trial
    steps.push({ bit: k, trial, v, keep, code, range })
  }
  const vq = mul(q(code), qq)
  return { n, lsb: qq, steps, code, vq, err: sub(vin, vq), errLsb: div(sub(vin, vq), qq) }
}

/** Flash ADC: thresholds k·LSB (k = 1 … 2^n − 1, minus ½ LSB with the offset); outputs listed from the top comparator down. */
export function flash(n: number, vref: Q, vin: Q, offset = false): { thresholds: Q[]; outputs: number[]; code: number; comparators: number; resistors: number } {
  const qq = lsb(n, vref)
  const half = div(qq, q(2))
  const th = Array.from({ length: 2 ** n - 1 }, (_, k) => sub(mul(q(k + 1), qq), offset ? half : ZERO))
  const c = th.map((t): number => (cmp(vin, t) >= 0 ? 1 : 0))
  return { thresholds: th, outputs: [...c].reverse(), code: c.reduce((s, x) => s + x, 0), comparators: 2 ** n - 1, resistors: 2 ** n }
}

/** Counter (ramp) ADC: advance while the next step (count + 1)·LSB is still ≤ V_in; code k costs k clocks. */
export function counterAdc(n: number, vref: Q, vin: Q): { code: number; clocks: number; levels: Q[] } {
  const qq = lsb(n, vref)
  let count = 0
  const levels: Q[] = [ZERO]
  while (count < 2 ** n - 1 && cmp(mul(q(count + 1), qq), vin) <= 0) {
    count++
    levels.push(mul(q(count), qq))
  }
  return { code: count, clocks: count, levels }
}

/** Dual-slope ADC: N2 = N1 · V_in / V_ref clocks of de-integration (counted: floor). */
export function dualSlope(n1: number, vref: Q, vin: Q): { exact: Q; count: number; total: number } {
  const exact = div(mul(q(n1), vin), vref)
  return { exact, count: floorQ(exact), total: n1 + floorQ(exact) }
}

/** Clocks for one conversion: flash 1, SAR n, counter type the code (worst case 2^n − 1). */
export function conversionClocks(kind: 'flash' | 'sar' | 'counter', n: number, code: number | null = null): number {
  if (kind === 'flash') return 1
  if (kind === 'sar') return n
  return code === null ? 2 ** n - 1 : code
}

/* ── Lab presets (also checked against the vectors) ─────────────────── */

export interface SarPreset {
  id: string
  label: string
  n: number
  vref: string
  vin: string
  offset: boolean
}
export const SAR_PRESETS: SarPreset[] = [
  { id: 'lesson', label: '4 bits, 10 V, V_in = 6.4 V', n: 4, vref: '10', vin: '6.4', offset: false },
  { id: 'byte', label: '8 bits, 5.12 V, V_in = 3.37 V', n: 8, vref: '5.12', vin: '3.37', offset: false },
  { id: 'tie', label: 'Tie: 4 bits, 16 V, V_in = 10 V', n: 4, vref: '16', vin: '10', offset: false },
  { id: 'round', label: '½-LSB offset: 4 bits, 10 V, 6.6 V', n: 4, vref: '10', vin: '6.6', offset: true },
  { id: 'over', label: 'Over range: 4 bits, 8 V, 7.9 V', n: 4, vref: '8', vin: '7.9', offset: false },
]

export interface DacPreset {
  id: string
  label: string
  n: number
  vref: string
  r: string
  rf: string
  code: number
}
export const DAC_PRESETS: DacPreset[] = [
  { id: 'c397', label: '3 bits, 5 V, R = R_f = 2 kΩ, code 001', n: 3, vref: '5', r: '2', rf: '2', code: 1 },
  { id: 'full', label: 'Same ladder, code 111', n: 3, vref: '5', r: '2', rf: '2', code: 7 },
  { id: 'four', label: '4 bits, 10 V, R = R_f = 5 kΩ, code 0101', n: 4, vref: '10', r: '5', rf: '5', code: 5 },
  { id: 'byte', label: '8 bits, 2.56 V, R = R_f = 10 kΩ, code 10000000', n: 8, vref: '2.56', r: '10', rf: '10', code: 128 },
]
