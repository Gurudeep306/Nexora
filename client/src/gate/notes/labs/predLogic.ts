/*
  Quantifier Lab logic (Discrete Mathematics, Chapter 2). A TypeScript twin of
  content/gate-notes/_checks/dm/predlib.py: the same grammar, the same
  "a quantifier binds as tightly as ¬" scope rule, finite-domain evaluation and
  the exhaustive counter-model search, tested against lab_vectors_ch2.json.
*/

export type PForm =
  | { k: 'const'; v: boolean }
  | { k: 'pred'; name: string; args: string[] }
  | { k: 'eq'; a: string; b: string }
  | { k: 'not'; a: PForm }
  | { k: 'forall' | 'exists' | 'exists1'; x: string; a: PForm }
  | { k: 'and' | 'or' | 'xor' | 'imp' | 'iff'; a: PForm; b: PForm }

type T = { t: string; v: string }

const PATTERNS: [string, RegExp][] = [
  ['lp', /^[([{]/],
  ['rp', /^[)\]}]/],
  ['comma', /^,/],
  ['forall', /^(∀|\\forall|forall\b)/],
  ['exists1', /^(∃!|\\exists\s*!)/],
  ['exists', /^(∃|\\exists|exists\b)/],
  ['iff', /^(↔|⇔|<->|<=>|\\leftrightarrow|\\Leftrightarrow|\\iff|≡|\\equiv)/],
  ['imp', /^(→|⇒|->|=>|\\rightarrow|\\Rightarrow|\\implies|\\to(?![a-zA-Z]))/],
  ['xor', /^(⊕|\\oplus)/],
  ['or', /^(∨|\\vee|\\lor|\||or\b)/],
  ['and', /^(∧|\\wedge|\\land|&|and\b)/],
  ['not', /^(¬|~|!(?!=)|\\neg|\\lnot|\\sim|not\b)/],
  ['neq', /^(≠|\\neq|!=)/],
  ['eq', /^=/],
  ['const', /^(T\b|F\b|true\b|false\b)/],
  ['name', /^[A-Za-z][A-Za-z0-9_]*/],
]

export function tokenize(src: string): T[] {
  let s = src.replace(/\$/g, '').replace(/\\(left|right|big|Big|bigl|bigr|mathit|mathrm|text|operatorname)(?![a-zA-Z])/g, '')
  s = s.replace(/\\[,; ]/g, ' ').replace(/\\quad/g, ' ')
  const out: T[] = []
  while (s.length) {
    const ws = /^[\s.]+/.exec(s)
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

const PREC: Record<string, number> = { iff: 1, imp: 2, xor: 3, or: 4, and: 5 }
const Q = new Set(['forall', 'exists', 'exists1'])

export function parse(src: string): PForm {
  const toks = tokenize(src)
  let pos = 0
  const peek = (k = 0) => toks[pos + k]
  const quant = (): { k: 'forall' | 'exists' | 'exists1'; x: string } | null => {
    const a = peek()
    if (a && Q.has(a.t) && peek(1)?.t === 'name') {
      pos += 2
      return { k: a.t as 'forall', x: toks[pos - 1]!.v }
    }
    if (a?.t === 'lp' && peek(1) && Q.has(peek(1)!.t) && peek(2)?.t === 'name' && peek(3)?.t === 'rp') {
      pos += 4
      return { k: toks[pos - 3]!.t as 'forall', x: toks[pos - 2]!.v }
    }
    return null
  }
  const term = () => {
    const t = peek()
    if (t?.t !== 'name') throw new Error('Expected a variable')
    pos++
    return t.v
  }
  const atom = (): PForm => {
    const q = quant()
    if (q) return { k: q.k, x: q.x, a: atom() }
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
      return { k: 'const', v: t.v === 'T' || t.v === 'true' }
    }
    if (t.t === 'name') {
      pos++
      if (peek()?.t === 'lp') {
        pos++
        const args = [term()]
        while (peek()?.t === 'comma') {
          pos++
          args.push(term())
        }
        if (peek()?.t !== 'rp') throw new Error('Missing ) after the arguments')
        pos++
        return { k: 'pred', name: t.v, args }
      }
      const op = peek()?.t
      if (op === 'eq' || op === 'neq') {
        pos++
        const e: PForm = { k: 'eq', a: t.v, b: term() }
        return op === 'eq' ? e : { k: 'not', a: e }
      }
      return { k: 'pred', name: t.v, args: [] }
    }
    throw new Error(`Unexpected “${t.v}”`)
  }
  const expr = (minp: number): PForm => {
    let left = atom()
    for (;;) {
      const t = peek()
      if (!t || !(t.t in PREC) || PREC[t.t]! < minp) break
      pos++
      const p = PREC[t.t]!
      left = { k: t.t as 'and', a: left, b: expr(t.t === 'imp' ? p : p + 1) }
    }
    return left
  }
  if (!toks.length) throw new Error('Type a formula')
  const e = expr(0)
  if (pos !== toks.length) throw new Error(`Unexpected “${toks[pos]!.v}”`)
  return e
}

/** {name: arity}, sorted by name. */
export function predicates(e: PForm): Record<string, number> {
  const acc: Record<string, number> = {}
  const walk = (x: PForm) => {
    if (x.k === 'pred') acc[x.name] = x.args.length
    else if (x.k === 'not' || x.k === 'forall' || x.k === 'exists' || x.k === 'exists1') walk(x.a)
    else if (x.k === 'and' || x.k === 'or' || x.k === 'xor' || x.k === 'imp' || x.k === 'iff') {
      walk(x.a)
      walk(x.b)
    }
  }
  walk(e)
  return Object.fromEntries(Object.entries(acc).sort(([a], [b]) => (a < b ? -1 : 1)))
}

export function freeVars(e: PForm, bound: Set<string> = new Set()): string[] {
  const out = new Set<string>()
  const walk = (x: PForm, b: Set<string>) => {
    if (x.k === 'pred') x.args.forEach((a) => !b.has(a) && out.add(a))
    else if (x.k === 'eq') [x.a, x.b].forEach((a) => !b.has(a) && out.add(a))
    else if (x.k === 'not') walk(x.a, b)
    else if (x.k === 'forall' || x.k === 'exists' || x.k === 'exists1') walk(x.a, new Set([...b, x.x]))
    else if (x.k === 'and' || x.k === 'or' || x.k === 'xor' || x.k === 'imp' || x.k === 'iff') {
      walk(x.a, b)
      walk(x.b, b)
    }
  }
  walk(e, bound)
  return [...out].sort()
}

/** An interpretation: for each predicate the set of true argument tuples, as "i,j" keys. */
export type Interp = Record<string, Set<string>>

export function evaluate(e: PForm, n: number, I: Interp, env: Record<string, number> = {}): boolean {
  switch (e.k) {
    case 'const':
      return e.v
    case 'pred':
      return I[e.name]?.has(e.args.map((a) => env[a] ?? -1).join(',')) ?? false
    case 'eq':
      return (env[e.a] ?? -1) === (env[e.b] ?? -2)
    case 'not':
      return !evaluate(e.a, n, I, env)
    case 'forall':
    case 'exists':
    case 'exists1': {
      let count = 0
      for (let d = 0; d < n; d++) if (evaluate(e.a, n, I, { ...env, [e.x]: d })) count++
      return e.k === 'forall' ? count === n : e.k === 'exists' ? count > 0 : count === 1
    }
    default: {
      const a = evaluate(e.a, n, I, env)
      const b = evaluate(e.b, n, I, env)
      return e.k === 'and' ? a && b : e.k === 'or' ? a || b : e.k === 'xor' ? a !== b : e.k === 'imp' ? !a || b : a === b
    }
  }
}

export function tuples(n: number, arity: number): string[] {
  let out: number[][] = [[]]
  for (let i = 0; i < arity; i++) out = out.flatMap((t) => Array.from({ length: n }, (_, d) => [...t, d]))
  return out.map((t) => t.join(','))
}

/** Every interpretation of preds over {0..n-1}, in the same order as predlib.interpretations. */
export function* interpretations(preds: Record<string, number>, n: number): Generator<Interp> {
  const names = Object.keys(preds).sort()
  const spaces = names.map((p) => tuples(n, preds[p]!))
  const sizes = spaces.map((s) => 2 ** s.length)
  const idx = names.map(() => 0)
  if (names.some((_, i) => sizes[i]! > 2 ** 16)) return
  for (;;) {
    const I: Interp = {}
    names.forEach((p, i) => {
      I[p] = new Set(spaces[i]!.filter((_, j) => (idx[i]! >> j) & 1))
    })
    yield I
    let i = names.length - 1
    while (i >= 0) {
      idx[i]!++
      if (idx[i]! < sizes[i]!) break
      idx[i] = 0
      i--
    }
    if (i < 0) return
  }
}

export type Found = { n: number; interp: Interp; env: Record<string, number> } | null

/** First interpretation (domains 1..maxN) on which e has the wanted truth value. */
export function search(e: PForm, want: boolean, maxN = 3, budget = 200000): Found {
  const preds = predicates(e)
  const fv = freeVars(e)
  let steps = 0
  for (let n = 1; n <= maxN; n++) {
    for (const I of interpretations(preds, n)) {
      for (const vals of tuples(n, fv.length)) {
        const env: Record<string, number> = {}
        if (fv.length) vals.split(',').forEach((v, i) => (env[fv[i]!] = Number(v)))
        if (evaluate(e, n, I, env) === want) return { n, interp: I, env }
        if (++steps > budget) return null
      }
    }
  }
  return null
}

export const counterModel = (e: PForm, maxN = 3) => search(e, false, maxN)
export const model = (e: PForm, maxN = 3) => search(e, true, maxN)

export const ELEMENTS = ['a', 'b', 'c', 'd', 'e']

const SYM: Record<string, string> = { and: '∧', or: '∨', xor: '⊕', imp: '→', iff: '↔' }
export function show(e: PForm): string {
  switch (e.k) {
    case 'const':
      return e.v ? 'T' : 'F'
    case 'pred':
      return e.args.length ? `${e.name}(${e.args.join(', ')})` : e.name
    case 'eq':
      return `${e.a} = ${e.b}`
    case 'not':
      return '¬' + show(e.a)
    case 'forall':
      return `∀${e.x} ${show(e.a)}`
    case 'exists':
      return `∃${e.x} ${show(e.a)}`
    case 'exists1':
      return `∃!${e.x} ${show(e.a)}`
    default:
      return `(${show(e.a)} ${SYM[e.k]} ${show(e.b)})`
  }
}

/** For a formula Qx φ, the value of φ at each element (the witnesses / counterexamples). */
export function perElement(e: PForm, n: number, I: Interp): boolean[] | null {
  if (e.k !== 'forall' && e.k !== 'exists' && e.k !== 'exists1') return null
  if (freeVars(e.a).some((v) => v !== e.x)) return null
  return Array.from({ length: n }, (_, d) => evaluate(e.a, n, I, { [e.x]: d }))
}

export const PRESETS: { id: string; label: string; formula: string }[] = [
  { id: 'ae', label: '∀x ∃y R(x, y)', formula: 'forall x exists y R(x, y)' },
  { id: 'ea', label: '∃y ∀x R(x, y)', formula: 'exists y forall x R(x, y)' },
  { id: 'swap', label: '∃x∀y R ⇒ ∀y∃x R (valid)', formula: '(exists x forall y R(x, y)) -> (forall y exists x R(x, y))' },
  { id: 'swapbad', label: '∀y∃x R ⇒ ∃x∀y R (not valid)', formula: '(forall y exists x R(x, y)) -> (exists x forall y R(x, y))' },
  { id: 'distor', label: '∀x(P ∨ Q) ⇒ ∀xP ∨ ∀xQ (not valid)', formula: '(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))' },
  { id: 'distand', label: '∃x(P ∧ Q) ⇒ ∃xP ∧ ∃xQ (valid)', formula: '(exists x (P(x) & Q(x))) -> ((exists x P(x)) & (exists x Q(x)))' },
  { id: 'some', label: 'Some P are Q: ∃x(P ∧ Q)', formula: 'exists x (P(x) & Q(x))' },
  { id: 'all', label: 'All P are Q: ∀x(P → Q)', formula: 'forall x (P(x) -> Q(x))' },
  { id: 'unique', label: 'Exactly one P: ∃x(P(x) ∧ ∀y(P(y) → y = x))', formula: 'exists x (P(x) & forall y (P(y) -> y = x))' },
]
