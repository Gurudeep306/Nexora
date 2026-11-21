/*
  Mirror Run, part 1: run the student's pseudocode exactly as written, bugs
  included (docs/voice/BLUEPRINT.md §4.3, lane D). No eval and no AI: a small
  interpreter for the pseudocode our lessons already use.

    lo ← 0; hi ← n − 1
    while lo ≤ hi
      mid ← (lo + hi) / 2
      if a[mid] = x: return mid
      if a[mid] < x: lo ← mid + 1
      else hi ← mid − 1
    return −1

  Accepted: ← = := "set x to"; if / else if / elif / else (inline after ':'
  or 'then', or an indented block); while; for i from A to B [step S] (both
  ends included), for i ← A downto B, for i in range(A, B); swap a[i], a[j];
  return, print, break, continue. Blocks are by indentation; 'end', '}' and
  'do' are ignored. In expressions '=' compares, '/' of two whole numbers
  rounds down (as DSA pseudocode means), and ≤ ≥ ≠ − × ÷ ⌊ ⌋ work.

  Pure and type-strippable (tests/voice-mirror.test.js).
*/

export type Value = number | boolean | null | number[]
export type Env = Record<string, Value>

/** One change the student's program made: which line, which names, their new values. */
export interface Change {
  line: number
  set: Record<string, number | boolean | null>
  /** Arrays written this step (a[i] ← …, swap). */
  arrays?: Record<string, number[]>
}

export interface RunResult {
  changes: Change[]
  /** The value returned, if the program returned. */
  returned?: Value
  printed: string[]
  error?: { line: number; message: string; endless?: boolean }
  /** The last loop that ended because its condition became false, and the values then. */
  loopExit?: { line: number; values: Record<string, number | boolean | null> }
  /** Statements executed (the loop guard counts these). */
  steps: number
}

export const MAX_STEPS = 5000

/* ── Expressions ─────────────────────────────────────────────────────── */

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string }

const NORMAL: [RegExp, string][] = [
  [/[−–—]/g, '-'],
  [/[×·∗]/g, '*'],
  [/÷/g, '/'],
  [/≤|=</g, '<='],
  [/≥|=>/g, '>='],
  [/≠|<>/g, '!='],
  [/⌊/g, 'floor('],
  [/⌋/g, ')'],
  [/⌈/g, 'ceil('],
  [/⌉/g, ')'],
  [/\bmod\b/g, '%'],
  [/\band\b|∧/g, '&&'],
  [/\bor\b|∨/g, '||'],
  [/\bnot\b|¬/g, '!'],
  [/\btrue\b/gi, '1==1'],
  [/\bfalse\b/gi, '1==0'],
  [/\bnull\b|\bnil\b|\bNone\b|\bnone\b/g, 'null'],
]

export function normalizeExpr(s: string): string {
  let out = s
  for (const [re, to] of NORMAL) out = out.replace(re, to)
  return out
}

function tokenize(src: string): Tok[] {
  const s = normalizeExpr(src)
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    const num = s.slice(i).match(/^\d+(\.\d+)?/)
    if (num) {
      out.push({ t: 'num', v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const id = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/)
    if (id) {
      out.push({ t: 'id', v: id[0] })
      i += id[0].length
      continue
    }
    const op = s.slice(i).match(/^(\/\/|==|!=|<=|>=|&&|\|\||\*\*|[-+*/%<>=!()[\],])/)
    if (op) {
      out.push({ t: 'op', v: op[0] })
      i += op[0].length
      continue
    }
    throw new Error(`I don’t know the symbol “${c}”.`)
  }
  return out
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'null' }
  | { k: 'var'; name: string }
  | { k: 'idx'; name: string; index: Node }
  | { k: 'call'; fn: string; args: Node[] }
  | { k: 'un'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }

const PREC: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '=': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '//': 6, '%': 6, '**': 7 }

export function parseExpr(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const take = () => toks[p++]
  const expectOp = (v: string) => {
    const t = take()
    if (!t || t.t !== 'op' || t.v !== v) throw new Error(`Expected “${v}”.`)
  }
  function primary(): Node {
    const t = take()
    if (!t) throw new Error('The expression ends too early.')
    if (t.t === 'num') return { k: 'num', v: t.v }
    if (t.t === 'op' && t.v === '(') {
      const e = expr(0)
      expectOp(')')
      return e
    }
    if (t.t === 'op' && (t.v === '-' || t.v === '!' || t.v === '+')) return { k: 'un', op: t.v, a: unary() }
    if (t.t === 'id') {
      if (t.v === 'null') return { k: 'null' }
      const n = peek()
      if (n?.t === 'op' && n.v === '(') {
        take()
        const args: Node[] = []
        if (!(peek()?.t === 'op' && (peek() as { v: string }).v === ')')) {
          for (;;) {
            args.push(expr(0))
            const s = take()
            if (s?.t === 'op' && s.v === ')') break
            if (!(s?.t === 'op' && s.v === ',')) throw new Error(`Expected “,” or “)” in ${t.v}(…).`)
          }
        } else take()
        return { k: 'call', fn: t.v.toLowerCase(), args }
      }
      if (n?.t === 'op' && n.v === '[') {
        take()
        const index = expr(0)
        expectOp(']')
        return { k: 'idx', name: t.v, index }
      }
      return { k: 'var', name: t.v }
    }
    throw new Error(`Unexpected “${t.v}”.`)
  }
  function unary(): Node {
    return primary()
  }
  function expr(min: number): Node {
    let left = primary()
    for (;;) {
      const t = peek()
      if (!t || t.t !== 'op' || !(t.v in PREC) || PREC[t.v] < min) break
      take()
      const right = expr(PREC[t.v] + (t.v === '**' ? 0 : 1))
      left = { k: 'bin', op: t.v, a: left, b: right }
    }
    return left
  }
  const e = expr(0)
  if (p < toks.length) throw new Error(`Unexpected “${(toks[p] as { v: string | number }).v}”.`)
  return e
}

function num(v: Value, what: string): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  throw new Error(`${what} isn’t a number.`)
}

export function evaluate(n: Node, env: Env): Value {
  switch (n.k) {
    case 'num':
      return n.v
    case 'null':
      return null
    case 'var': {
      if (!(n.name in env)) throw new Error(`“${n.name}” is used before it has a value.`)
      return env[n.name]
    }
    case 'idx': {
      const arr = env[n.name]
      if (!Array.isArray(arr)) throw new Error(`“${n.name}” isn’t an array.`)
      const i = num(evaluate(n.index, env), 'The index')
      if (!Number.isInteger(i) || i < 0 || i >= arr.length) throw new Error(`${n.name}[${i}] is outside the array (it has ${arr.length} items, 0 to ${arr.length - 1}).`)
      return arr[i]
    }
    case 'call': {
      const args = n.args.map((a) => evaluate(a, env))
      const nums = () => args.map((a) => num(a, 'An argument'))
      switch (n.fn) {
        case 'len':
        case 'length':
        case 'size': {
          const a = args[0]
          if (!Array.isArray(a)) throw new Error('len(…) needs an array.')
          return a.length
        }
        case 'min':
          return Math.min(...(Array.isArray(args[0]) ? args[0] : nums()))
        case 'max':
          return Math.max(...(Array.isArray(args[0]) ? args[0] : nums()))
        case 'abs':
          return Math.abs(nums()[0])
        case 'floor':
          return Math.floor(nums()[0])
        case 'ceil':
          return Math.ceil(nums()[0])
        case 'int':
          return Math.trunc(nums()[0])
        default:
          throw new Error(`I don’t know the function ${n.fn}(…).`)
      }
    }
    case 'un': {
      const a = evaluate(n.a, env)
      if (n.op === '!') return !truthy(a)
      if (n.op === '-') return -num(a, 'The value')
      return num(a, 'The value')
    }
    case 'bin': {
      if (n.op === '&&') return truthy(evaluate(n.a, env)) && truthy(evaluate(n.b, env))
      if (n.op === '||') return truthy(evaluate(n.a, env)) || truthy(evaluate(n.b, env))
      const a = evaluate(n.a, env)
      const b = evaluate(n.b, env)
      if (n.op === '=' || n.op === '==') return a === b
      if (n.op === '!=') return a !== b
      const x = num(a, 'The left side')
      const y = num(b, 'The right side')
      switch (n.op) {
        case '<': return x < y
        case '<=': return x <= y
        case '>': return x > y
        case '>=': return x >= y
        case '+': return x + y
        case '-': return x - y
        case '*': return x * y
        case '**': return x ** y
        case '%':
          if (y === 0) throw new Error('Taking mod 0.')
          return ((x % y) + y) % y
        case '//':
          if (y === 0) throw new Error('Dividing by 0.')
          return Math.floor(x / y)
        case '/':
          if (y === 0) throw new Error('Dividing by 0.')
          return Number.isInteger(x) && Number.isInteger(y) ? Math.floor(x / y) : x / y
      }
      throw new Error(`I don’t know “${n.op}”.`)
    }
  }
}

function truthy(v: Value): boolean {
  return Array.isArray(v) ? v.length > 0 : Boolean(v)
}

/* ── Statements ──────────────────────────────────────────────────────── */

type Stmt =
  | { k: 'assign'; line: number; targets: { name: string; index?: Node }[]; values: Node[] }
  | { k: 'swap'; line: number; a: { name: string; index: Node }; b: { name: string; index: Node } }
  | { k: 'if'; line: number; branches: { cond: Node | null; body: Stmt[] }[] }
  | { k: 'while'; line: number; cond: Node; body: Stmt[] }
  | { k: 'for'; line: number; v: string; from: Node; to: Node; step: Node | null; down: boolean; exclusive: boolean; body: Stmt[] }
  | { k: 'return'; line: number; value: Node | null }
  | { k: 'print'; line: number; value: Node }
  | { k: 'break'; line: number }
  | { k: 'continue'; line: number }

interface Line {
  no: number
  indent: number
  text: string
}

export class PseudoError extends Error {
  line: number
  constructor(line: number, message: string) {
    super(message)
    this.line = line
  }
}

/** Source lines without comments, tags, headers or block-closing words. */
export function sourceLines(src: string): Line[] {
  const out: Line[] = []
  src.split('\n').forEach((raw, i) => {
    let t = raw.replace(/\t/g, '    ')
    // '//' starts a comment unless it is floor division ("(lo + hi) // 2").
    t = t.replace(/\/\/(?!\s*[\d(]).*$/, '').replace(/#.*$/, '').replace(/\s+$/, '')
    const body = t.trim()
    if (!body) return
    if (/^(end( \w+)?|endif|endwhile|endfor|done|\}|\{|begin)$/i.test(body)) return
    out.push({ no: i + 1, indent: t.length - t.trimStart().length, text: body.replace(/^\}\s*/, '').replace(/\s*\{$/, '') })
  })
  return out
}

/** A header like "function search(a, n, x)" or "def search(a, x):" carries no code. */
function isHeader(t: string) {
  return /^(function|def|procedure|algorithm|func)\b/i.test(t)
}

function target(s: string, line: number): { name: string; index?: Node } {
  const m = s.trim().match(/^([A-Za-z_]\w*)\s*(?:\[(.+)\])?$/)
  if (!m) throw new PseudoError(line, `“${s.trim()}” can’t be given a value.`)
  return m[2] ? { name: m[1], index: parseExpr(m[2]) } : { name: m[1] }
}

function splitTop(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '(' || c === '[') depth++
    if (c === ')' || c === ']') depth--
    if (c === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += c
  }
  parts.push(cur)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** One simple (non-block) statement. */
function simple(text: string, line: number): Stmt {
  const t = text.trim().replace(/;$/, '')
  const wrap = <T>(f: () => T): T => {
    try {
      return f()
    } catch (e) {
      if (e instanceof PseudoError) throw e
      throw new PseudoError(line, e instanceof Error ? e.message : String(e))
    }
  }
  if (/^break$/i.test(t)) return { k: 'break', line }
  if (/^continue$/i.test(t)) return { k: 'continue', line }
  let m = t.match(/^return\b\s*(.*)$/i)
  if (m) return { k: 'return', line, value: m[1] ? wrap(() => parseExpr(m![1])) : null }
  m = t.match(/^(?:print|output|display)\b\s*\(?(.*?)\)?$/i)
  if (m) return { k: 'print', line, value: wrap(() => parseExpr(m![1])) }
  m = t.match(/^swap\s*\(?\s*(.+?)\s*(?:,|\band\b|\bwith\b)\s*(.+?)\s*\)?$/i)
  if (m) {
    const a = wrap(() => target(m![1], line))
    const b = wrap(() => target(m![2], line))
    if (!a.index || !b.index || a.name !== b.name) throw new PseudoError(line, 'swap needs two places in the same array, like swap a[i], a[j].')
    return { k: 'swap', line, a: a as { name: string; index: Node }, b: b as { name: string; index: Node } }
  }
  m = t.match(/^set\s+(.+?)\s+to\s+(.+)$/i)
  if (m) return wrap(() => ({ k: 'assign', line, targets: [target(m![1], line)], values: [parseExpr(m![2])] }))
  // a ← b, a = b, a := b, (lo, hi ← 0, n − 1); "let"/"int" in front is fine.
  m = t.replace(/^(let|var|int|long|const|integer)\s+/i, '').match(/^(.+?)\s*(?:←|:=|<-|(?<![=!<>])=(?!=))\s*(.+)$/)
  if (m) {
    const lhs = splitTop(m[1])
    const rhs = splitTop(m[2])
    if (lhs.length !== rhs.length) throw new PseudoError(line, `${lhs.length} names but ${rhs.length} values.`)
    return wrap(() => ({ k: 'assign', line, targets: lhs.map((x) => target(x, line)), values: rhs.map((x) => parseExpr(x)) }))
  }
  // "i++", "i += 1"
  m = t.match(/^([A-Za-z_]\w*)\s*(\+\+|--)$/)
  if (m) return { k: 'assign', line, targets: [{ name: m[1] }], values: [parseExpr(`${m[1]} ${m[2][0]} 1`)] }
  m = t.match(/^([A-Za-z_]\w*(?:\[.+\])?)\s*([-+*/%])=\s*(.+)$/)
  if (m) return wrap(() => ({ k: 'assign', line, targets: [target(m![1], line)], values: [parseExpr(`${m![1]} ${m![2]} (${m![3]})`)] }))
  throw new PseudoError(line, `I can’t read “${t}”. Try forms like “x ← 0”, “if …”, “while …”, “for i from 0 to n − 1”, “return x”.`)
}

/** "if cond: stmt", "if cond then stmt", or "if cond" with a block. */
function splitHead(rest: string): { head: string; tail: string } {
  const m = rest.match(/^(.*?)(?::|\bthen\b|\bdo\b)\s*(.*)$/i)
  if (!m) return { head: rest.trim(), tail: '' }
  // A ":" inside brackets (slices) isn't ours; good enough for pseudocode.
  return { head: m[1].trim(), tail: m[2].trim() }
}

export function parseProgram(src: string): Stmt[] {
  let lines = sourceLines(src)
  // Drop a function header and treat its body as the program.
  if (lines.length && isHeader(lines[0].text)) {
    const base = lines[0].indent
    lines = lines.slice(1).filter((l) => !(isHeader(l.text) && l.indent <= base))
  }
  let p = 0

  function block(indent: number): Stmt[] {
    const out: Stmt[] = []
    while (p < lines.length && lines[p].indent >= indent) {
      const l = lines[p]
      if (l.indent > indent && out.length === 0) {
        // First line deeper than expected: take it as this block's level.
        indent = l.indent
      } else if (l.indent > indent) throw new PseudoError(l.no, 'This line is indented more than the line above, but nothing above opens a block.')
      out.push(...statement(indent))
    }
    return out
  }

  function body(l: Line, tail: string): Stmt[] {
    if (tail) return tail.split(';').filter((x) => x.trim()).map((x) => inlineStmt(x, l.no))
    if (p < lines.length && lines[p].indent > l.indent) return block(lines[p].indent)
    throw new PseudoError(l.no, 'Nothing is inside this block. Indent the lines that belong to it.')
  }

  function inlineStmt(text: string, no: number): Stmt {
    const t = text.trim()
    if (/^(if|while|for)\b/i.test(t)) {
      // A one-line if/while/for after another one: "else if a < b: x ← 1".
      const fake: Line = { no, indent: -1, text: t }
      const saved = lines
      const savedP = p
      lines = [fake]
      p = 0
      try {
        const s = statement(-1)
        return s[0]
      } finally {
        lines = saved
        p = savedP
      }
    }
    return simple(t, no)
  }

  function cond(src: string, no: number): Node {
    try {
      return parseExpr(src.replace(/^\((.*)\)$/, '$1'))
    } catch (e) {
      throw new PseudoError(no, e instanceof Error ? e.message : String(e))
    }
  }

  function statement(indent: number): Stmt[] {
    const l = lines[p++]
    const t = l.text
    let m = t.match(/^if\b\s*(.*)$/i)
    if (m) {
      const branches: { cond: Node | null; body: Stmt[] }[] = []
      const h = splitHead(m[1])
      branches.push({ cond: cond(h.head, l.no), body: body(l, h.tail) })
      while (p < lines.length && lines[p].indent === l.indent) {
        const e = lines[p].text
        const em = e.match(/^(?:else\s+if|elif|elsif)\b\s*(.*)$/i)
        if (em) {
          const el = lines[p++]
          const eh = splitHead(em[1])
          branches.push({ cond: cond(eh.head, el.no), body: body(el, eh.tail) })
          continue
        }
        const om = e.match(/^(?:else|otherwise)\b\s*:?\s*(.*)$/i)
        if (om) {
          const el = lines[p++]
          branches.push({ cond: null, body: body(el, om[1].trim()) })
        }
        break
      }
      return [{ k: 'if', line: l.no, branches }]
    }
    if (/^(?:else|elif|else\s+if|otherwise)\b/i.test(t)) throw new PseudoError(l.no, '“else” needs an “if” just above it, at the same indent.')
    m = t.match(/^while\b\s*(.*)$/i)
    if (m) {
      const h = splitHead(m[1])
      return [{ k: 'while', line: l.no, cond: cond(h.head, l.no), body: body(l, h.tail) }]
    }
    m = t.match(/^for\b\s*(.*)$/i)
    if (m) {
      const h = splitHead(m[1].replace(/\s+do$/i, ''))
      const head = normalizeExpr(h.head)
      let f = head.match(/^(?:each\s+)?([A-Za-z_]\w*)\s+in\s+range\s*\((.+)\)$/i)
      if (f) {
        const args = splitTop(f[2])
        const [a, b, s] = args.length === 1 ? ['0', args[0], undefined] : [args[0], args[1], args[2]]
        const step = s ? cond(s, l.no) : null
        const down = !!s && /^\s*-/.test(s)
        return [{ k: 'for', line: l.no, v: f[1], from: cond(a, l.no), to: cond(b, l.no), step, down, exclusive: true, body: body(l, h.tail) }]
      }
      f = head.match(/^([A-Za-z_]\w*)\s*(?:←|:=|<-|=|from)\s*(.+?)\s+(to|downto|down to|until)\s+(.+?)(?:\s+(?:step|by)\s+(.+))?$/i)
      if (f) {
        const down = /down/i.test(f[3])
        return [{ k: 'for', line: l.no, v: f[1], from: cond(f[2], l.no), to: cond(f[4], l.no), step: f[5] ? cond(f[5], l.no) : null, down, exclusive: /until/i.test(f[3]), body: body(l, h.tail) }]
      }
      throw new PseudoError(l.no, 'Write loops as “for i from 0 to n − 1” (both ends included) or “for i in range(0, n)”.')
    }
    // Several simple statements on one line: "lo ← 0; hi ← n − 1".
    void indent
    return t.split(';').filter((x) => x.trim()).map((x) => simple(x, l.no))
  }

  const prog = block(lines.length ? lines[0].indent : 0)
  if (p < lines.length) throw new PseudoError(lines[p].no, 'This line is indented less than the first line.')
  return prog
}

class EndlessError extends PseudoError {
  constructor(line: number) {
    super(line, `It ran ${MAX_STEPS} steps without finishing — a loop that never ends.`)
  }
}

/* ── Running ─────────────────────────────────────────────────────────── */

class Stop {
  kind: 'return' | 'break' | 'continue'
  value?: Value
  constructor(kind: 'return' | 'break' | 'continue', value?: Value) {
    this.kind = kind
    this.value = value
  }
}

/** Run the student's pseudocode on the lesson's input, recording every change. */
export function runPseudo(src: string, inputs: Env): RunResult {
  const res: RunResult = { changes: [], printed: [], steps: 0 }
  let prog: Stmt[]
  try {
    prog = parseProgram(src)
  } catch (e) {
    res.error = e instanceof PseudoError ? { line: e.line, message: e.message } : { line: 0, message: String(e) }
    return res
  }
  if (!prog.length) {
    res.error = { line: 0, message: 'There is no pseudocode to run yet.' }
    return res
  }
  const env: Env = {}
  for (const [k, v] of Object.entries(inputs)) env[k] = Array.isArray(v) ? [...v] : v
  // The names lessons use for their input: a and n for the array.
  const firstArray = Object.entries(env).find(([, v]) => Array.isArray(v))
  if (firstArray) {
    if (!('a' in env)) env.a = firstArray[1]
    if (!('arr' in env)) env.arr = firstArray[1]
    if (!('n' in env)) env.n = (firstArray[1] as number[]).length
  }

  const ev = (n: Node, line: number) => {
    try {
      return evaluate(n, env)
    } catch (e) {
      throw new PseudoError(line, e instanceof Error ? e.message : String(e))
    }
  }
  const tick = (line: number) => {
    if (++res.steps > MAX_STEPS) throw new EndlessError(line)
  }
  const scalar = (v: Value): number | boolean | null => (Array.isArray(v) ? null : v)

  function exec(list: Stmt[]): void {
    for (const s of list) {
      tick(s.line)
      switch (s.k) {
        case 'assign': {
          const vals = s.values.map((v) => ev(v, s.line))
          const set: Record<string, number | boolean | null> = {}
          const arrays: Record<string, number[]> = {}
          s.targets.forEach((tg, i) => {
            const v = vals[i]
            if (tg.index) {
              const arr = env[tg.name]
              if (!Array.isArray(arr)) throw new PseudoError(s.line, `“${tg.name}” isn’t an array.`)
              const idx = ev(tg.index, s.line)
              if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= arr.length) throw new PseudoError(s.line, `${tg.name}[${String(idx)}] is outside the array.`)
              if (typeof v !== 'number') throw new PseudoError(s.line, 'Only numbers go into an array here.')
              arr[idx] = v
              arrays[tg.name] = [...arr]
            } else {
              env[tg.name] = Array.isArray(v) ? [...v] : v
              set[tg.name] = scalar(v)
            }
          })
          res.changes.push({ line: s.line, set, ...(Object.keys(arrays).length ? { arrays } : {}) })
          break
        }
        case 'swap': {
          const arr = env[s.a.name]
          if (!Array.isArray(arr)) throw new PseudoError(s.line, `“${s.a.name}” isn’t an array.`)
          const i = ev(s.a.index, s.line)
          const j = ev(s.b.index, s.line)
          for (const k of [i, j]) if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= arr.length) throw new PseudoError(s.line, `${s.a.name}[${String(k)}] is outside the array.`)
          ;[arr[i as number], arr[j as number]] = [arr[j as number], arr[i as number]]
          res.changes.push({ line: s.line, set: {}, arrays: { [s.a.name]: [...arr] } })
          break
        }
        case 'if': {
          for (const b of s.branches) {
            if (b.cond === null || truthy(ev(b.cond, s.line))) {
              exec(b.body)
              break
            }
          }
          break
        }
        case 'while': {
          for (;;) {
            if (!truthy(ev(s.cond, s.line))) {
              res.loopExit = { line: s.line, values: Object.fromEntries(Object.entries(env).filter(([, v]) => !Array.isArray(v)) as [string, number | boolean | null][]) }
              break
            }
            tick(s.line)
            try {
              exec(s.body)
            } catch (e) {
              if (e instanceof Stop && e.kind === 'break') break
              if (e instanceof Stop && e.kind === 'continue') continue
              throw e
            }
          }
          break
        }
        case 'for': {
          const from = ev(s.from, s.line)
          const to = ev(s.to, s.line)
          if (typeof from !== 'number' || typeof to !== 'number') throw new PseudoError(s.line, 'A loop’s ends must be numbers.')
          const stepV = s.step ? ev(s.step, s.line) : s.down ? -1 : 1
          if (typeof stepV !== 'number' || stepV === 0) throw new PseudoError(s.line, 'The loop’s step must be a number other than 0.')
          const going = (i: number) => (stepV > 0 ? (s.exclusive ? i < to : i <= to) : s.exclusive ? i > to : i >= to)
          for (let i = from; going(i); i += stepV) {
            tick(s.line)
            env[s.v] = i
            res.changes.push({ line: s.line, set: { [s.v]: i } })
            try {
              exec(s.body)
            } catch (e) {
              if (e instanceof Stop && e.kind === 'break') break
              if (e instanceof Stop && e.kind === 'continue') {
                i = env[s.v] as number
                continue
              }
              throw e
            }
            i = env[s.v] as number
          }
          break
        }
        case 'return':
          throw new Stop('return', s.value ? ev(s.value, s.line) : null)
        case 'print': {
          const v = ev(s.value, s.line)
          res.printed.push(Array.isArray(v) ? v.join(' ') : String(v))
          break
        }
        case 'break':
          throw new Stop('break')
        case 'continue':
          throw new Stop('continue')
      }
    }
  }

  try {
    exec(prog)
  } catch (e) {
    if (e instanceof Stop) {
      if (e.kind === 'return') res.returned = e.value
      else res.error = { line: 0, message: `“${e.kind}” is outside any loop.` }
    } else if (e instanceof PseudoError) res.error = { line: e.line, message: e.message, ...(e instanceof EndlessError ? { endless: true } : {}) }
    else res.error = { line: 0, message: e instanceof Error ? e.message : String(e) }
  }
  return res
}
