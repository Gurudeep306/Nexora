/*
  Truth Table Lab logic (Discrete Mathematics, Chapter 1). A TypeScript twin
  of content/gate-notes/_checks/dm/logiclib.py: the same grammar, precedence
  and row order, tested against lab_vectors_ch1.json in tests/gate-notes.test.js.

  Grammar (tightest first): ¬ (~ ! not)  ∧ (& and /\)  ∨ (| or \/)  ⊕ (xor)
  and the custom operator ⊙ (both at the ⊕ level)  → (-> => implies)  ↔ (<-> <=> iff ≡).
  → is right-associative; the others are left-associative. Constants T/F/1/0.
  Rows are listed with T first and the first (alphabetical) variable slowest;
  minterm i is the row whose bits (T = 1, first variable = most significant)
  spell i.
*/

export type Formula =
  | { k: 'var'; name: string }
  | { k: 'const'; value: boolean }
  | { k: 'not'; a: Formula }
  | { k: 'and' | 'or' | 'xor' | 'imp' | 'iff' | 'op'; a: Formula; b: Formula }

/** Truth table of the custom operator ⊙ in the order TT, TF, FT, FF. */
export type OpTable = [boolean, boolean, boolean, boolean]

type Tok = { t: 'lp' | 'rp' | 'not' | 'and' | 'or' | 'xor' | 'imp' | 'iff' | 'op' | 'const' | 'var'; v: string }

const PATTERNS: [Tok['t'], RegExp][] = [
  ['lp', /^[([{]/],
  ['rp', /^[)\]}]/],
  ['iff', /^(↔|⟷|⇔|<->|<=>|≡|\\leftrightarrow|\\Leftrightarrow|\\iff|\\equiv|iff\b)/],
  ['imp', /^(→|⇒|->|=>|\\rightarrow|\\Rightarrow|\\implies|\\to(?![a-zA-Z])|implies\b)/],
  ['xor', /^(⊕|\\oplus|xor\b)/],
  ['op', /^(⊙|\\odot)/],
  ['or', /^(∨|\\vee|\\lor|\|\||\||or\b|\\\/)/],
  ['and', /^(∧|\\wedge|\\land|&&|&|and\b|\/\\)/],
  ['not', /^(¬|~|!|\\neg|\\lnot|\\sim|not\b)/],
  ['const', /^(true\b|false\b|True\b|False\b|T\b|F\b|1\b|0\b)/],
  ['var', /^[A-Za-z][A-Za-z0-9_]*/],
]

export function tokenize(src: string): Tok[] {
  let s = src.replace(/\$/g, '').replace(/\\(left|right|big|Big|bigl|bigr)(?![a-zA-Z])/g, '')
  s = s.replace(/\\[,; ]/g, ' ')
  const out: Tok[] = []
  while (s.length) {
    const ws = /^\s+/.exec(s)
    if (ws) {
      s = s.slice(ws[0].length)
      continue
    }
    let hit = false
    for (const [t, re] of PATTERNS) {
      const m = re.exec(s)
      if (m) {
        out.push({ t, v: m[0] })
        s = s.slice(m[0].length)
        hit = true
        break
      }
    }
    if (!hit) throw new Error(`Cannot read “${s.slice(0, 8)}”`)
  }
  return out
}

const PREC: Record<string, number> = { iff: 1, imp: 2, xor: 3, op: 3, or: 4, and: 5 }

export function parse(src: string): Formula {
  const toks = tokenize(src)
  let pos = 0
  const peek = () => toks[pos]
  const atom = (): Formula => {
    const t = peek()
    if (!t) throw new Error('The formula ends too early')
    if (t.t === 'not') {
      pos++
      return { k: 'not', a: atom() }
    }
    if (t.t === 'lp') {
      pos++
      const e = expr(0)
      if (peek()?.t !== 'rp') throw new Error('A bracket is not closed')
      pos++
      return e
    }
    if (t.t === 'const') {
      pos++
      return { k: 'const', value: ['T', 'true', 'True', '1'].includes(t.v) }
    }
    if (t.t === 'var') {
      pos++
      return { k: 'var', name: t.v }
    }
    throw new Error(`Unexpected “${t.v}”`)
  }
  const expr = (minp: number): Formula => {
    let left = atom()
    for (;;) {
      const t = peek()
      if (!t || !(t.t in PREC) || PREC[t.t]! < minp) break
      pos++
      const p = PREC[t.t]!
      const right = expr(t.t === 'imp' ? p : p + 1)
      left = { k: t.t as 'and' | 'or' | 'xor' | 'imp' | 'iff' | 'op', a: left, b: right }
    }
    return left
  }
  if (!toks.length) throw new Error('Type a formula')
  const e = expr(0)
  if (pos !== toks.length) throw new Error(`Unexpected “${toks[pos]!.v}”`)
  return e
}

export function variables(e: Formula): string[] {
  const acc = new Set<string>()
  const walk = (x: Formula) => {
    if (x.k === 'var') acc.add(x.name)
    else if (x.k === 'not') walk(x.a)
    else if (x.k !== 'const') {
      walk(x.a)
      walk(x.b)
    }
  }
  walk(e)
  return [...acc].sort()
}

export const DEFAULT_OP: OpTable = [true, true, false, true]

export function evaluate(e: Formula, env: Record<string, boolean>, op: OpTable = DEFAULT_OP): boolean {
  switch (e.k) {
    case 'var':
      return env[e.name] ?? false
    case 'const':
      return e.value
    case 'not':
      return !evaluate(e.a, env, op)
    default: {
      const a = evaluate(e.a, env, op)
      const b = evaluate(e.b, env, op)
      if (e.k === 'and') return a && b
      if (e.k === 'or') return a || b
      if (e.k === 'xor') return a !== b
      if (e.k === 'imp') return !a || b
      if (e.k === 'iff') return a === b
      return op[(a ? 0 : 2) + (b ? 0 : 1)]!
    }
  }
}

/** Assignments with T first, the first variable alternating slowest. */
export function rows(vars: string[]): Record<string, boolean>[] {
  const n = vars.length
  const out: Record<string, boolean>[] = []
  for (let i = 0; i < 2 ** n; i++) {
    const r: Record<string, boolean> = {}
    vars.forEach((v, j) => {
      r[v] = ((i >> (n - 1 - j)) & 1) === 0
    })
    out.push(r)
  }
  return out
}

const SYM: Record<string, string> = { and: '∧', or: '∨', xor: '⊕', imp: '→', iff: '↔', op: '⊙' }

/** Canonical text with full brackets on binary sub-formulas (outer brackets dropped). */
export function show(e: Formula, top = true): string {
  if (e.k === 'var') return e.name
  if (e.k === 'const') return e.value ? 'T' : 'F'
  if (e.k === 'not') return '¬' + show(e.a, false)
  const s = `${show(e.a, false)} ${SYM[e.k]} ${show(e.b, false)}`
  return top ? s : `(${s})`
}

/** Sub-formulas that get their own column: every non-variable node, innermost first, no repeats. */
export function columns(e: Formula): Formula[] {
  const out: Formula[] = []
  const seen = new Set<string>()
  const walk = (x: Formula) => {
    if (x.k === 'var' || x.k === 'const') return
    if (x.k === 'not') walk(x.a)
    else {
      walk(x.a)
      walk(x.b)
    }
    const key = show(x)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(x)
    }
  }
  walk(e)
  return out
}

export function table(e: Formula, vars = variables(e), op: OpTable = DEFAULT_OP): boolean[] {
  return rows(vars).map((r) => evaluate(e, r, op))
}

export type Kind = 'tautology' | 'contradiction' | 'contingency'

export function classify(col: boolean[]): Kind {
  return col.every(Boolean) ? 'tautology' : col.some(Boolean) ? 'contingency' : 'contradiction'
}

/** Minterm index of row i (rows() order): T = 1, first variable most significant. */
export function rowIndex(i: number, n: number): number {
  return 2 ** n - 1 - i
}

export function minterms(col: boolean[], n: number): number[] {
  return col.flatMap((v, i) => (v ? [rowIndex(i, n)] : [])).sort((a, b) => a - b)
}

export function maxterms(col: boolean[], n: number): number[] {
  return col.flatMap((v, i) => (v ? [] : [rowIndex(i, n)])).sort((a, b) => a - b)
}

export function dnfText(ms: number[], vars: string[]): string {
  if (!ms.length) return 'F'
  return ms
    .map((m) => '(' + vars.map((v, j) => ((m >> (vars.length - 1 - j)) & 1 ? v : '¬' + v)).join(' ∧ ') + ')')
    .join(' ∨ ')
}

export function cnfText(Ms: number[], vars: string[]): string {
  if (!Ms.length) return 'T'
  return Ms.map((m) => '(' + vars.map((v, j) => ((m >> (vars.length - 1 - j)) & 1 ? '¬' + v : v)).join(' ∨ ') + ')').join(' ∧ ')
}

export type Comparison = { vars: string[]; a: boolean[]; b: boolean[]; equivalent: boolean; aImpliesB: boolean; bImpliesA: boolean; differ: number[] }

export function compare(a: Formula, b: Formula, op: OpTable = DEFAULT_OP): Comparison {
  const vars = [...new Set([...variables(a), ...variables(b)])].sort()
  const ta = table(a, vars, op)
  const tb = table(b, vars, op)
  const differ = ta.flatMap((x, i) => (x !== tb[i] ? [i] : []))
  return {
    vars,
    a: ta,
    b: tb,
    equivalent: differ.length === 0,
    aImpliesB: ta.every((x, i) => !x || tb[i]),
    bImpliesA: tb.every((x, i) => !x || ta[i]),
    differ,
  }
}

export type Argument = { vars: string[]; premises: boolean[][]; conclusion: boolean[]; critical: number[]; counter: number[]; valid: boolean }

/** Valid iff every critical row (all premises true) makes the conclusion true. */
export function argument(premises: Formula[], conclusion: Formula, op: OpTable = DEFAULT_OP): Argument {
  const vars = [...new Set([...premises.flatMap(variables), ...variables(conclusion)])].sort()
  const ps = premises.map((p) => table(p, vars, op))
  const c = table(conclusion, vars, op)
  const critical = c.flatMap((_, i) => (ps.every((p) => p[i]) ? [i] : []))
  const counter = critical.filter((i) => !c[i])
  return { vars, premises: ps, conclusion: c, critical, counter, valid: counter.length === 0 }
}

export const PRESETS: { id: string; label: string; formula: string; op?: OpTable }[] = [
  { id: 'chain', label: '(p → q) ∧ (q → r)', formula: '(p -> q) & (q -> r)' },
  { id: 'assoc', label: 'p → q → r (right-associative)', formula: 'p -> q -> r' },
  { id: 'unless', label: '“If X then Y unless Z”', formula: '(X & ~Z) -> Y' },
  { id: 'exactly2', label: 'Exactly two of p, q, r (GATE 2014)', formula: '(~(p <-> q) & r) | (p & q & ~r)' },
  { id: 'gate2006', label: '∼(∼A ⊙ B) with ⊙ = T, T, F, T (GATE 2006)', formula: '~(~A ⊙ B)', op: [true, true, false, true] },
  { id: 'contra', label: 'Contrapositive check', formula: '(p -> q) <-> (~q -> ~p)' },
  { id: 'peirce', label: 'Peirce: ((p → q) → p) → p', formula: '((p -> q) -> p) -> p' },
]

export const MAX_VARS = 5
