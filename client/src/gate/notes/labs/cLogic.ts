/*
  A small C interpreter — the engine behind the Programming & Data Structures
  Live Labs (C Tracer in Chapter 1, Memory Inspector in Chapter 2, Recursion
  Tracer in Chapter 3).

  It runs a teaching subset of ISO C on a byte-addressed memory with the
  layout of a typical 64-bit system (char 1, short 2, int 4, long 8, float 4,
  double 8, pointers 8 bytes, little-endian, signed char, two's complement),
  so pointer arithmetic, sizeof, casts through char *, string literals and
  arrays behave as compiled C does. Variables live in memory: globals and
  statics in the data segment, string literals in a read-only segment, locals
  in stack frames that grow downwards, malloc'd blocks in the heap.

  Supported: #include (ignored), object- and function-like #define;
  char/short/int/long/long long (signed and unsigned), float, double, void,
  pointers, arrays (any dimension, with initialisers and brace elision),
  structs and unions (members, nesting, padding as on x86-64), typedef;
  storage classes static/extern/register/auto; every C operator (precedence,
  associativity, integer promotion, the usual arithmetic conversions,
  short-circuit && || and ?:, the comma operator, compound assignment,
  pre/post ++ --, casts, sizeof, & and *, [] -> .); if/else, while,
  do-while, for (with declarations), switch with fall-through, break,
  continue, goto-free code, return; functions with recursion; function
  pointers; printf (d i u x X o c s f e g p %, widths, precision, l/ll/h),
  putchar, getchar (from the given input), puts, strlen, strcpy, strcmp,
  strcat, malloc, calloc, free, abs, sqrt, pow.

  Every run records a trace: one entry per executed statement (the line, the
  call stack with every visible variable, the static area, the output so
  far), plus a call tree (calls with their arguments and return values). An
  expression can also be evaluated on its own with an explanation of every
  operator application (`explainExpr`).

  Undefined behaviour is not emulated silently: signed overflow, division by
  zero, reads of uninitialised locals, out-of-bounds accesses, writes to a
  string literal, use after free and unsequenced double modification of a
  variable inside one expression are reported as runtime errors or warnings.
  This module is checked against the system C compiler: the Python script
  content/gate-notes/_checks/pds/lab_vectors.py compiles every vector program
  with cc, records its real output, and tests/gate-notes.test.js runs the same
  programs here and compares. Dependency-free, erasable-syntax only.
*/

/* ── Types ─────────────────────────────────────────────────────────── */

export type Prim = 'void' | 'char' | 'short' | 'int' | 'long' | 'llong' | 'float' | 'double' | 'bool'
export type CType =
  | { k: 'prim'; p: Prim; u: boolean }
  | { k: 'ptr'; to: CType }
  | { k: 'arr'; of: CType; n: number | null }
  | { k: 'fn'; ret: CType; params: CType[]; variadic: boolean; named: boolean }
  | { k: 'struct'; tag: string; union: boolean; def: StructDef }

export interface StructDef {
  members: { name: string; t: CType; off: number }[]
  size: number
  align: number
  complete: boolean
}

const prim = (p: Prim, u = false): CType => ({ k: 'prim', p, u })
export const T = {
  void: prim('void'),
  char: prim('char'),
  uchar: prim('char', true),
  short: prim('short'),
  int: prim('int'),
  uint: prim('int', true),
  long: prim('long'),
  ulong: prim('long', true),
  llong: prim('llong'),
  float: prim('float'),
  double: prim('double'),
}

const PSIZE: Record<Prim, number> = { void: 1, bool: 1, char: 1, short: 2, int: 4, long: 8, llong: 8, float: 4, double: 8 }

export function sizeOf(t: CType): number {
  switch (t.k) {
    case 'prim':
      return PSIZE[t.p]
    case 'ptr':
      return 8
    case 'arr':
      if (t.n === null) throw new CError('sizeof an array of unknown size')
      return t.n * sizeOf(t.of)
    case 'fn':
      return 1
    case 'struct':
      if (!t.def.complete) throw new CError(`sizeof incomplete type struct ${t.tag}`)
      return t.def.size
  }
}

export function alignOf(t: CType): number {
  switch (t.k) {
    case 'prim':
      return PSIZE[t.p]
    case 'ptr':
      return 8
    case 'arr':
      return alignOf(t.of)
    case 'fn':
      return 1
    case 'struct':
      return t.def.align
  }
}

const isInt = (t: CType) => t.k === 'prim' && t.p !== 'float' && t.p !== 'double' && t.p !== 'void'
const isFloat = (t: CType) => t.k === 'prim' && (t.p === 'float' || t.p === 'double')
const isArith = (t: CType) => isInt(t) || isFloat(t)
const isPtr = (t: CType) => t.k === 'ptr'
const isScalar = (t: CType) => isArith(t) || isPtr(t)
const RANK: Record<Prim, number> = { bool: 0, char: 1, short: 2, int: 3, long: 4, llong: 5, float: 6, double: 7, void: -1 }

export function typeName(t: CType): string {
  switch (t.k) {
    case 'prim': {
      const base = t.p === 'llong' ? 'long long' : t.p === 'bool' ? '_Bool' : t.p
      return t.u ? `unsigned ${base}` : base
    }
    case 'ptr':
      if (t.to.k === 'arr') return `${typeName(t.to.of)} (*)[${t.to.n ?? ''}]`
      if (t.to.k === 'fn') return `${typeName(t.to.ret)} (*)(${t.to.params.map(typeName).join(', ')})`
      return `${typeName(t.to)} *`
    case 'arr':
      return `${typeName(t.of)} [${t.n ?? ''}]`
    case 'fn':
      return `${typeName(t.ret)} (${t.params.map(typeName).join(', ')})`
    case 'struct':
      return `${t.union ? 'union' : 'struct'} ${t.tag}`
  }
}

const sameType = (a: CType, b: CType): boolean => typeName(a) === typeName(b)

/** Number of scalars in a type (for brace elision when sizing an array from its initialiser). */
function scalarCount(t: CType): number {
  if (t.k === 'arr') return (t.n ?? 0) * scalarCount(t.of)
  if (t.k === 'struct') return t.union ? scalarCount(t.def.members[0].t) : t.def.members.reduce((a, m) => a + scalarCount(m.t), 0)
  return 1
}

/* ── Errors ────────────────────────────────────────────────────────── */

export class CError extends Error {
  line: number
  kind: 'compile' | 'runtime'
  constructor(msg: string, line = 0, kind: 'compile' | 'runtime' = 'runtime') {
    super(msg)
    this.line = line
    this.kind = kind
  }
}

/* ── Lexer and preprocessor ────────────────────────────────────────── */

export interface Tok {
  t: 'id' | 'num' | 'str' | 'chr' | 'op' | 'eof'
  v: string
  line: number
  num?: number
  ntype?: CType
}

const OPS = [
  '<<=', '>>=', '...', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}', '#',
]

function unescape(s: string, line: number): number[] {
  const out: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c !== '\\') {
      const code = s.charCodeAt(i)
      if (code > 127) for (const b of new TextEncoder().encode(c)) out.push(b)
      else out.push(code)
      continue
    }
    const d = s[++i]
    const simple: Record<string, number> = { n: 10, t: 9, r: 13, '0': 0, a: 7, b: 8, f: 12, v: 11, '\\': 92, "'": 39, '"': 34, '?': 63 }
    if (d >= '0' && d <= '7') {
      let j = i
      let v = 0
      while (j < s.length && j < i + 3 && s[j] >= '0' && s[j] <= '7') v = v * 8 + Number(s[j++])
      out.push(v & 255)
      i = j - 1
    } else if (d === 'x') {
      let j = i + 1
      let v = 0
      while (j < s.length && /[0-9a-fA-F]/.test(s[j])) v = v * 16 + parseInt(s[j++], 16)
      if (j === i + 1) throw new CError('\\x used with no following hex digits', line, 'compile')
      out.push(v & 255)
      i = j - 1
    } else if (d in simple) out.push(simple[d])
    else out.push(d.charCodeAt(0))
  }
  return out
}

function lexNumber(src: string, i: number, line: number): { tok: Tok; end: number } {
  const m = /^(0[xX][0-9a-fA-F]+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)([uUlLfF]*)/.exec(src.slice(i))
  if (!m) throw new CError('bad number', line, 'compile')
  const body = m[1]
  const suf = m[2].toLowerCase()
  const isF = /[.eE]/.test(body) && !/^0[xX]/.test(body)
  let num: number
  let ntype: CType
  if (isF) {
    num = parseFloat(body)
    ntype = suf.includes('f') ? T.float : T.double
    if (suf.includes('f')) num = Math.fround(num)
  } else {
    if (/^0[0-7]*$/.test(body)) num = parseInt(body, 8)
    else if (/^0[0-9]+$/.test(body)) throw new CError(`invalid digit in octal constant ${body}`, line, 'compile')
    else num = body.startsWith('0x') || body.startsWith('0X') ? parseInt(body, 16) : parseInt(body, 10)
    const u = suf.includes('u')
    const l = (suf.match(/l/g) || []).length
    if (l >= 1) ntype = u ? T.ulong : T.long
    else if (u) ntype = num <= 0xffffffff ? T.uint : T.ulong
    else if (num <= 0x7fffffff) ntype = T.int
    else if (/^0/.test(body) && num <= 0xffffffff) ntype = T.uint
    else ntype = T.long
  }
  return { tok: { t: 'num', v: m[0], line, num, ntype }, end: i + m[0].length }
}

export function lex(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  let line = 1
  while (i < src.length) {
    const c = src[i]
    if (c === '\n') {
      line++
      i++
      continue
    }
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (src.startsWith('//', i)) {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (src.startsWith('/*', i)) {
      const e = src.indexOf('*/', i + 2)
      if (e < 0) throw new CError('unterminated comment', line, 'compile')
      for (let k = i; k < e; k++) if (src[k] === '\n') line++
      i = e + 2
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ t: 'id', v: src.slice(i, j), line })
      i = j
      continue
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
      const { tok, end } = lexNumber(src, i, line)
      out.push(tok)
      i = end
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j++
        if (src[j] === '\n') throw new CError('missing terminating quote', line, 'compile')
        j++
      }
      if (j >= src.length) throw new CError('missing terminating quote', line, 'compile')
      const raw = src.slice(i + 1, j)
      if (c === '"') out.push({ t: 'str', v: raw, line })
      else {
        const bytes = unescape(raw, line)
        if (bytes.length === 0) throw new CError('empty character constant', line, 'compile')
        const b = bytes[bytes.length - 1]
        out.push({ t: 'chr', v: raw, line, num: b > 127 ? b - 256 : b, ntype: T.int })
      }
      i = j + 1
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (!op) throw new CError(`stray '${c}' in program`, line, 'compile')
    out.push({ t: 'op', v: op, line })
    i += op.length
  }
  out.push({ t: 'eof', v: '', line })
  return out
}

interface Macro {
  params: string[] | null
  body: Tok[]
}

/** Run the preprocessor lines (#include ignored, #define object/function-like) and expand macros. */
export function preprocess(src: string): Tok[] {
  const lines = src.split('\n')
  const macros = new Map<string, Macro>()
  const kept: string[] = []
  lines.forEach((l, k) => {
    const m = /^\s*#\s*(\w+)\s*(.*)$/.exec(l)
    if (!m) {
      kept.push(l)
      return
    }
    kept.push('')
    if (m[1] === 'include' || m[1] === 'pragma') return
    if (m[1] !== 'define') throw new CError(`#${m[1]} is not supported here`, k + 1, 'compile')
    const d = /^([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/.exec(m[2])
    if (!d) throw new CError('bad #define', k + 1, 'compile')
    const body = lex(d[4]).slice(0, -1).map((t) => ({ ...t, line: k + 1 }))
    macros.set(d[1], { params: d[2] ? d[3].split(',').map((s) => s.trim()).filter(Boolean) : null, body })
  })
  const toks = lex(kept.join('\n'))
  const expand = (ts: Tok[], hide: Set<string>): Tok[] => {
    const out: Tok[] = []
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]
      const mac = t.t === 'id' && !hide.has(t.v) ? macros.get(t.v) : undefined
      if (!mac) {
        out.push(t)
        continue
      }
      if (mac.params === null) {
        out.push(...expand(mac.body.map((b) => ({ ...b, line: t.line })), new Set([...hide, t.v])))
        continue
      }
      if (ts[i + 1]?.v !== '(') {
        out.push(t)
        continue
      }
      const args: Tok[][] = [[]]
      let depth = 0
      let j = i + 2
      for (; j < ts.length; j++) {
        const a = ts[j]
        if (a.v === '(' && a.t === 'op') depth++
        if (a.v === ')' && a.t === 'op') {
          if (depth === 0) break
          depth--
        }
        if (a.v === ',' && a.t === 'op' && depth === 0) args.push([])
        else args[args.length - 1].push(a)
      }
      if (mac.params.length === 0 && args.length === 1 && args[0].length === 0) args.length = 0
      if (args.length !== mac.params.length) throw new CError(`macro ${t.v} expects ${mac.params.length} arguments`, t.line, 'compile')
      const body: Tok[] = []
      for (const b of mac.body) {
        const k = b.t === 'id' ? mac.params.indexOf(b.v) : -1
        if (k >= 0) body.push(...expand(args[k], hide))
        else body.push({ ...b, line: t.line })
      }
      out.push(...expand(body, new Set([...hide, t.v])))
      i = j
    }
    return out
  }
  return expand(toks, new Set())
}

/* ── AST ───────────────────────────────────────────────────────────── */

export type Expr =
  | { e: 'num'; v: number; t: CType; line: number; src: string }
  | { e: 'str'; bytes: number[]; line: number; src: string }
  | { e: 'id'; name: string; line: number; src: string }
  | { e: 'bin'; op: string; a: Expr; b: Expr; line: number; src: string }
  | { e: 'assign'; op: string; a: Expr; b: Expr; line: number; src: string }
  | { e: 'un'; op: string; a: Expr; line: number; src: string }
  | { e: 'post'; op: string; a: Expr; line: number; src: string }
  | { e: 'cond'; c: Expr; a: Expr; b: Expr; line: number; src: string }
  | { e: 'call'; f: Expr; args: Expr[]; line: number; src: string }
  | { e: 'index'; a: Expr; i: Expr; line: number; src: string }
  | { e: 'member'; a: Expr; name: string; arrow: boolean; line: number; src: string }
  | { e: 'cast'; t: CType; a: Expr; line: number; src: string }
  | { e: 'sizeofT'; t: CType; line: number; src: string }
  | { e: 'sizeofE'; a: Expr; line: number; src: string }
  | { e: 'comma'; a: Expr; b: Expr; line: number; src: string }
  | { e: 'init'; items: Expr[]; line: number; src: string }

export interface Decl {
  name: string
  t: CType
  storage: string | null
  init: Expr | null
  line: number
}

export type Stmt =
  | { s: 'expr'; x: Expr | null; line: number }
  | { s: 'decl'; decls: Decl[]; line: number }
  | { s: 'block'; body: Stmt[]; line: number; end: number }
  | { s: 'if'; c: Expr; a: Stmt; b: Stmt | null; line: number }
  | { s: 'while'; c: Expr; body: Stmt; line: number }
  | { s: 'do'; c: Expr; body: Stmt; line: number }
  | { s: 'for'; init: Stmt | null; c: Expr | null; step: Expr | null; body: Stmt; line: number }
  | { s: 'switch'; c: Expr; body: Stmt; line: number }
  | { s: 'case'; v: Expr | null; line: number }
  | { s: 'break'; line: number }
  | { s: 'continue'; line: number }
  | { s: 'return'; x: Expr | null; line: number }

export interface FnDef {
  name: string
  t: Extract<CType, { k: 'fn' }>
  params: string[]
  body: Stmt & { s: 'block' }
  line: number
}

export interface Program {
  globals: Decl[]
  fns: Map<string, FnDef>
  protos: Map<string, CType>
  src: string
}

/* ── Parser ────────────────────────────────────────────────────────── */

const TYPE_WORDS = new Set(['void', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned', 'const', 'volatile', 'static', 'extern', 'register', 'auto', 'struct', 'union', 'typedef', '_Bool', 'inline'])
const KEYWORDS = new Set([...TYPE_WORDS, 'if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue', 'return', 'sizeof', 'goto', 'enum'])

class Parser {
  toks: Tok[]
  i = 0
  typedefs = new Map<string, CType>()
  tags = new Map<string, CType & { k: 'struct' }>()
  src: string
  constructor(toks: Tok[], src: string) {
    this.toks = toks
    this.src = src
  }
  get cur() {
    return this.toks[this.i]
  }
  peek(k = 1) {
    return this.toks[Math.min(this.i + k, this.toks.length - 1)]
  }
  is(v: string) {
    const c = this.cur
    return (c.t === 'op' || c.t === 'id') && c.v === v
  }
  eat(v: string) {
    if (this.is(v)) {
      this.i++
      return true
    }
    return false
  }
  want(v: string) {
    if (!this.eat(v)) throw new CError(`expected '${v}' before '${this.cur.v || 'end of input'}'`, this.cur.line, 'compile')
  }
  ident(): string {
    const c = this.cur
    if (c.t !== 'id' || KEYWORDS.has(c.v)) throw new CError(`expected an identifier before '${c.v || 'end of input'}'`, c.line, 'compile')
    this.i++
    return c.v
  }
  startsType(k = 0): boolean {
    const c = this.peek(k)
    return c.t === 'id' && (TYPE_WORDS.has(c.v) || this.typedefs.has(c.v))
  }

  /** Declaration specifiers: base type and storage class. */
  specifiers(): { base: CType; storage: string | null; typedef: boolean } {
    let storage: string | null = null
    let typedef = false
    let signed: boolean | null = null
    let shorts = 0
    let longs = 0
    let base: Prim | null = null
    let named: CType | null = null
    const start = this.cur
    for (;;) {
      const c = this.cur
      if (c.t !== 'id') break
      if (['static', 'extern', 'register', 'auto'].includes(c.v)) {
        if (storage) throw new CError('multiple storage classes in declaration', c.line, 'compile')
        storage = c.v
      } else if (c.v === 'typedef') typedef = true
      else if (c.v === 'const' || c.v === 'volatile' || c.v === 'inline') {
        /* qualifiers are accepted and ignored */
      } else if (c.v === 'signed') signed = true
      else if (c.v === 'unsigned') signed = false
      else if (c.v === 'short') shorts++
      else if (c.v === 'long') longs++
      else if (['void', 'char', 'int', 'float', 'double', '_Bool'].includes(c.v)) {
        if (base || named) throw new CError(`two or more data types in declaration`, c.line, 'compile')
        base = c.v === '_Bool' ? 'bool' : (c.v as Prim)
      } else if (c.v === 'struct' || c.v === 'union') {
        this.i++
        named = this.structSpec(c.v === 'union')
        continue
      } else if (this.typedefs.has(c.v) && !base && !named && signed === null && !shorts && !longs) named = this.typedefs.get(c.v)!
      else break
      this.i++
    }
    if (named) return { base: named, storage, typedef }
    if (!base && signed === null && !shorts && !longs) throw new CError(`type expected before '${start.v}'`, start.line, 'compile')
    let p: Prim = base ?? 'int'
    if (shorts) p = 'short'
    if (longs === 1 && p !== 'double') p = 'long'
    if (longs >= 2) p = 'llong'
    return { base: prim(p, signed === false), storage, typedef }
  }

  structSpec(union: boolean): CType {
    const tag = this.cur.t === 'id' && !KEYWORDS.has(this.cur.v) ? this.ident() : `(anonymous ${union ? 'union' : 'struct'} line ${this.cur.line})`
    let t = this.tags.get(tag)
    if (!t) {
      t = { k: 'struct', tag, union, def: { members: [], size: 0, align: 1, complete: false } }
      this.tags.set(tag, t)
    }
    if (this.eat('{')) {
      const def = t.def
      let off = 0
      let size = 0
      let align = 1
      while (!this.eat('}')) {
        const { base } = this.specifiers()
        do {
          const { name, t: mt } = this.declarator(base)
          const a = alignOf(mt)
          const sz = sizeOf(mt)
          const at = union ? 0 : Math.ceil(off / a) * a
          def.members.push({ name, t: mt, off: at })
          off = at + sz
          size = Math.max(size, union ? sz : off)
          align = Math.max(align, a)
        } while (this.eat(','))
        this.want(';')
      }
      def.size = Math.ceil(size / align) * align
      def.align = align
      def.complete = true
    }
    return t
  }

  /** A declarator (name optional for abstract declarators) applied to a base type. */
  declarator(base: CType, abstract = false): { name: string; t: CType; params: string[] } {
    // Collect pointer stars, then the direct declarator, then suffixes; build inside out.
    let ptrs = 0
    while (this.eat('*')) {
      ptrs++
      while (this.eat('const') || this.eat('volatile')) {
        /* qualifiers ignored */
      }
    }
    let name = ''
    let inner: ((t: CType) => CType) | null = null
    let innerParams: string[] = []
    if (this.is('(') && (this.peek().v === '*' || (this.peek().t === 'id' && !this.startsType(1) && this.peek().v !== ')'))) {
      this.i++
      const placeholder: CType = { k: 'prim', p: 'int', u: false }
      const sub = this.declarator(placeholder, abstract)
      this.want(')')
      name = sub.name
      innerParams = sub.params
      // Re-derive: sub.t was built over `int`; capture the wrapping as a function of the real base.
      const wrap = (t: CType): CType => replaceBase(sub.t, placeholder, t)
      inner = wrap
    } else if (this.cur.t === 'id' && !KEYWORDS.has(this.cur.v)) name = this.ident()
    else if (!abstract) throw new CError(`expected an identifier before '${this.cur.v}'`, this.cur.line, 'compile')
    let params: string[] = innerParams
    const suffixes: ((t: CType) => CType)[] = []
    for (;;) {
      if (this.eat('[')) {
        let n: number | null = null
        if (!this.is(']')) n = constEval(this.expr())
        this.want(']')
        suffixes.push((t) => ({ k: 'arr', of: t, n }))
      } else if (this.is('(')) {
        this.i++
        const ps: CType[] = []
        const names: string[] = []
        let variadic = false
        let namedParams = true
        if (this.is(')')) namedParams = false
        else if (this.is('void') && this.peek().v === ')') this.i++
        else {
          do {
            if (this.eat('...')) {
              variadic = true
              break
            }
            const sp = this.specifiers()
            const d = this.declarator(sp.base, true)
            let pt = d.t
            if (pt.k === 'arr') pt = { k: 'ptr', to: pt.of }
            if (pt.k === 'fn') pt = { k: 'ptr', to: pt }
            ps.push(pt)
            names.push(d.name)
          } while (this.eat(','))
        }
        this.want(')')
        if (!innerParams.length) params = names
        suffixes.push((t) => ({ k: 'fn', ret: t, params: ps, variadic, named: namedParams }))
      } else break
    }
    let t: CType = base
    for (let k = 0; k < ptrs; k++) t = { k: 'ptr', to: t }
    for (let k = suffixes.length - 1; k >= 0; k--) t = suffixes[k](t)
    if (inner) t = inner(t)
    return { name, t, params }
  }

  typeName(): CType {
    const { base } = this.specifiers()
    return this.declarator(base, true).t
  }

  /* Expressions (precedence climbing). */
  expr(): Expr {
    let a = this.assign()
    while (this.is(',')) {
      const line = this.cur.line
      this.i++
      const b = this.assign()
      a = { e: 'comma', a, b, line, src: `${a.src}, ${b.src}` }
    }
    return a
  }
  assign(): Expr {
    const a = this.cond()
    const c = this.cur
    if (c.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='].includes(c.v)) {
      this.i++
      const b = this.assign()
      return { e: 'assign', op: c.v, a, b, line: c.line, src: `${a.src} ${c.v} ${b.src}` }
    }
    return a
  }
  cond(): Expr {
    const c = this.bin(0)
    if (this.is('?')) {
      const line = this.cur.line
      this.i++
      const a = this.expr()
      this.want(':')
      const b = this.cond()
      return { e: 'cond', c, a, b, line, src: `${c.src} ? ${a.src} : ${b.src}` }
    }
    return c
  }
  static LEVELS = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']]
  bin(level: number): Expr {
    if (level >= Parser.LEVELS.length) return this.unary()
    let a = this.bin(level + 1)
    for (;;) {
      const c = this.cur
      if (c.t !== 'op' || !Parser.LEVELS[level].includes(c.v)) return a
      this.i++
      const b = this.bin(level + 1)
      a = { e: 'bin', op: c.v, a, b, line: c.line, src: `${a.src} ${c.v} ${b.src}` }
    }
  }
  unary(): Expr {
    const c = this.cur
    if (c.t === 'op' && ['++', '--', '+', '-', '!', '~', '*', '&'].includes(c.v)) {
      this.i++
      const a = this.unary()
      return { e: 'un', op: c.v, a, line: c.line, src: `${c.v}${a.src}` }
    }
    if (c.t === 'id' && c.v === 'sizeof') {
      this.i++
      if (this.is('(') && this.startsType(1)) {
        this.i++
        const t = this.typeName()
        this.want(')')
        return { e: 'sizeofT', t, line: c.line, src: `sizeof(${typeName(t)})` }
      }
      const a = this.unary()
      return { e: 'sizeofE', a, line: c.line, src: `sizeof ${a.src}` }
    }
    if (c.t === 'op' && c.v === '(' && this.startsType(1)) {
      this.i++
      const t = this.typeName()
      this.want(')')
      if (this.is('{')) throw new CError('compound literals are not supported', c.line, 'compile')
      const a = this.unary()
      return { e: 'cast', t, a, line: c.line, src: `(${typeName(t)})${a.src}` }
    }
    return this.postfix()
  }
  postfix(): Expr {
    let a = this.primary()
    for (;;) {
      const c = this.cur
      if (this.eat('[')) {
        const i = this.expr()
        this.want(']')
        a = { e: 'index', a, i, line: c.line, src: `${a.src}[${i.src}]` }
      } else if (this.eat('(')) {
        const args: Expr[] = []
        if (!this.is(')'))
          do args.push(this.assign())
          while (this.eat(','))
        this.want(')')
        a = { e: 'call', f: a, args, line: c.line, src: `${a.src}(${args.map((x) => x.src).join(', ')})` }
      } else if (this.is('.') || this.is('->')) {
        const arrow = this.cur.v === '->'
        this.i++
        const name = this.ident()
        a = { e: 'member', a, name, arrow, line: c.line, src: `${a.src}${arrow ? '->' : '.'}${name}` }
      } else if (this.is('++') || this.is('--')) {
        this.i++
        a = { e: 'post', op: c.v, a, line: c.line, src: `${a.src}${c.v}` }
      } else return a
    }
  }
  primary(): Expr {
    const c = this.cur
    if (c.t === 'num' || c.t === 'chr') {
      this.i++
      return { e: 'num', v: c.num!, t: c.ntype!, line: c.line, src: c.t === 'chr' ? `'${c.v}'` : c.v }
    }
    if (c.t === 'str') {
      let bytes: number[] = []
      let src = ''
      while (this.cur.t === 'str') {
        bytes = bytes.concat(unescape(this.cur.v, this.cur.line))
        src += `"${this.cur.v}"`
        this.i++
      }
      return { e: 'str', bytes, line: c.line, src }
    }
    if (c.t === 'id' && !KEYWORDS.has(c.v)) {
      this.i++
      return { e: 'id', name: c.v, line: c.line, src: c.v }
    }
    if (this.eat('(')) {
      const a = this.expr()
      this.want(')')
      return { ...a, src: `(${a.src})` }
    }
    throw new CError(`expected an expression before '${c.v || 'end of input'}'`, c.line, 'compile')
  }
  initializer(): Expr {
    if (this.is('{')) {
      const line = this.cur.line
      this.i++
      const items: Expr[] = []
      while (!this.is('}')) {
        items.push(this.initializer())
        if (!this.eat(',')) break
      }
      this.want('}')
      return { e: 'init', items, line, src: '{…}' }
    }
    return this.assign()
  }

  /* Statements. */
  declaration(): Stmt {
    const line = this.cur.line
    const sp = this.specifiers()
    const decls: Decl[] = []
    if (this.eat(';')) return { s: 'decl', decls, line }
    do {
      const d = this.declarator(sp.base)
      if (sp.typedef) {
        this.typedefs.set(d.name, d.t)
        continue
      }
      let init: Expr | null = null
      if (this.eat('=')) init = this.initializer()
      decls.push({ name: d.name, t: d.t, storage: sp.storage, init, line })
    } while (this.eat(','))
    this.want(';')
    return { s: 'decl', decls, line }
  }
  block(): Stmt & { s: 'block' } {
    const line = this.cur.line
    this.want('{')
    const body: Stmt[] = []
    while (!this.is('}')) {
      if (this.cur.t === 'eof') throw new CError("expected '}' at end of input", this.cur.line, 'compile')
      body.push(this.stmt())
    }
    const end = this.cur.line
    this.want('}')
    return { s: 'block', body, line, end }
  }
  stmt(): Stmt {
    const c = this.cur
    const line = c.line
    if (this.is('{')) return this.block()
    if (this.startsType() && !(this.peek().v === ':' )) return this.declaration()
    if (this.eat(';')) return { s: 'expr', x: null, line }
    if (this.eat('if')) {
      this.want('(')
      const cnd = this.expr()
      this.want(')')
      const a = this.stmt()
      const b = this.eat('else') ? this.stmt() : null
      return { s: 'if', c: cnd, a, b, line }
    }
    if (this.eat('while')) {
      this.want('(')
      const cnd = this.expr()
      this.want(')')
      return { s: 'while', c: cnd, body: this.stmt(), line }
    }
    if (this.eat('do')) {
      const body = this.stmt()
      this.want('while')
      this.want('(')
      const cnd = this.expr()
      this.want(')')
      this.want(';')
      return { s: 'do', c: cnd, body, line }
    }
    if (this.eat('for')) {
      this.want('(')
      let init: Stmt | null = null
      if (this.startsType()) init = this.declaration()
      else if (!this.eat(';')) {
        init = { s: 'expr', x: this.expr(), line }
        this.want(';')
      }
      const cnd = this.is(';') ? null : this.expr()
      this.want(';')
      const step = this.is(')') ? null : this.expr()
      this.want(')')
      return { s: 'for', init, c: cnd, step, body: this.stmt(), line }
    }
    if (this.eat('switch')) {
      this.want('(')
      const cnd = this.expr()
      this.want(')')
      return { s: 'switch', c: cnd, body: this.stmt(), line }
    }
    if (this.eat('case')) {
      const v = this.cond()
      this.want(':')
      return { s: 'case', v, line }
    }
    if (this.eat('default')) {
      this.want(':')
      return { s: 'case', v: null, line }
    }
    if (this.eat('break')) {
      this.want(';')
      return { s: 'break', line }
    }
    if (this.eat('continue')) {
      this.want(';')
      return { s: 'continue', line }
    }
    if (this.eat('return')) {
      const x = this.is(';') ? null : this.expr()
      this.want(';')
      return { s: 'return', x, line }
    }
    if (this.is('goto')) throw new CError('goto is not supported in the tracer', line, 'compile')
    const x = this.expr()
    this.want(';')
    return { s: 'expr', x, line }
  }

  program(): Program {
    const globals: Decl[] = []
    const fns = new Map<string, FnDef>()
    const protos = new Map<string, CType>()
    while (this.cur.t !== 'eof') {
      if (this.eat(';')) continue
      const line = this.cur.line
      // Old-style implicit int: `main() {…}` or `f(int x) {…}`.
      let sp: { base: CType; storage: string | null; typedef: boolean }
      if (this.cur.t === 'id' && !this.startsType() && this.peek().v === '(') sp = { base: T.int, storage: null, typedef: false }
      else sp = this.specifiers()
      if (this.eat(';')) continue
      const d = this.declarator(sp.base)
      if (d.t.k === 'fn' && this.is('{')) {
        const body = this.block()
        if (fns.has(d.name)) throw new CError(`redefinition of '${d.name}'`, line, 'compile')
        const prev = protos.get(d.name)
        if (prev && prev.k === 'fn' && !sameType(prev.ret, d.t.ret)) throw new CError(`conflicting types for '${d.name}'`, line, 'compile')
        fns.set(d.name, { name: d.name, t: d.t, params: d.params, body, line })
        protos.set(d.name, d.t)
        continue
      }
      const decls: Decl[] = []
      let dd = d
      for (;;) {
        if (sp.typedef) this.typedefs.set(dd.name, dd.t)
        else if (dd.t.k === 'fn') {
          const prev = protos.get(dd.name)
          if (prev && prev.k === 'fn' && !sameType(prev.ret, dd.t.ret)) throw new CError(`conflicting types for '${dd.name}'`, line, 'compile')
          protos.set(dd.name, dd.t)
        } else {
          let init: Expr | null = null
          if (this.eat('=')) init = this.initializer()
          decls.push({ name: dd.name, t: dd.t, storage: sp.storage, init, line })
        }
        if (!this.eat(',')) break
        dd = this.declarator(sp.base)
      }
      this.want(';')
      globals.push(...decls)
    }
    return { globals, fns, protos, src: this.src }
  }
}

function replaceBase(t: CType, placeholder: CType, base: CType): CType {
  if (t === placeholder) return base
  switch (t.k) {
    case 'ptr':
      return { k: 'ptr', to: replaceBase(t.to, placeholder, base) }
    case 'arr':
      return { k: 'arr', of: replaceBase(t.of, placeholder, base), n: t.n }
    case 'fn':
      return { ...t, ret: replaceBase(t.ret, placeholder, base) }
    default:
      return t
  }
}

function constEval(x: Expr): number {
  switch (x.e) {
    case 'num':
      return x.v
    case 'un':
      if (x.op === '-') return -constEval(x.a)
      if (x.op === '+') return constEval(x.a)
      break
    case 'bin': {
      const a = constEval(x.a)
      const b = constEval(x.b)
      const r: Record<string, number> = { '+': a + b, '-': a - b, '*': a * b, '/': Math.trunc(a / b), '%': a % b, '<<': a << b, '>>': a >> b }
      if (x.op in r) return r[x.op]
      break
    }
    case 'sizeofT':
      return sizeOf(x.t)
  }
  throw new CError('array size must be an integer constant here', x.line, 'compile')
}

export function parse(src: string): Program {
  const toks = preprocess(src)
  return new Parser(toks, src).program()
}

/* ── Runtime values and memory ─────────────────────────────────────── */

export interface Val {
  t: CType
  v: number
}

interface LV {
  addr: number
  t: CType
  name?: string
}

const SEG = { rodata: 0x1000, data: 0x10000, heap: 0x40000, stackTop: 0xff000, size: 0x100000 }

export interface VarView {
  name: string
  type: string
  addr: number
  value: string
  changed?: boolean
}
export interface FrameView {
  fn: string
  vars: VarView[]
  line: number
}
export interface TraceStep {
  line: number
  frames: FrameView[]
  statics: VarView[]
  out: string
  note?: string
}
export interface CallNode {
  id: number
  fn: string
  args: string
  ret?: string
  depth: number
  children: number[]
  parent: number | null
  outBefore: number
  outAfter?: number
}
export interface RunResult {
  ok: boolean
  out: string
  exit: number | null
  error: CError | null
  steps: TraceStep[]
  calls: CallNode[]
  maxDepth: number
  warnings: string[]
}

interface Scope {
  vars: Map<string, LV>
}
interface Frame {
  fn: string
  scopes: Scope[]
  sp: number
  line: number
}

class Break {}
class Continue {}
class Return {
  v: Val | null
  constructor(v: Val | null) {
    this.v = v
  }
}

export interface RunOptions {
  input?: string
  maxSteps?: number
  maxDepth?: number
  trace?: boolean
  args?: number[]
}

export class Machine {
  prog: Program
  mem = new DataView(new ArrayBuffer(SEG.size))
  init = new Uint8Array(SEG.size)
  owner = new Map<number, string>()
  rodataEnd = SEG.rodata
  dataEnd = SEG.data
  heapEnd = SEG.heap
  heapBlocks = new Map<number, { size: number; freed: boolean }>()
  sp = SEG.stackTop
  globals = new Map<string, LV>()
  statics: { name: string; lv: LV }[] = []
  frames: Frame[] = []
  fnAddr = new Map<string, number>()
  addrFn = new Map<number, string>()
  out = ''
  input: string
  inPos = 0
  steps: TraceStep[] = []
  calls: CallNode[] = []
  callStack: number[] = []
  maxDepth = 0
  stepCount = 0
  opts: Required<Pick<RunOptions, 'maxSteps' | 'maxDepth' | 'trace'>>
  warnings: string[] = []
  line = 0
  strings = new Map<string, number>()
  modified: Map<number, string> | null = null

  constructor(prog: Program, opts: RunOptions = {}) {
    this.prog = prog
    this.input = opts.input ?? ''
    this.opts = { maxSteps: opts.maxSteps ?? 20000, maxDepth: opts.maxDepth ?? 400, trace: opts.trace ?? true }
    let a = 0x100
    for (const name of [...prog.fns.keys(), ...BUILTINS]) {
      this.fnAddr.set(name, a)
      this.addrFn.set(a, name)
      a += 0x10
    }
  }

  err(msg: string, line = this.line): never {
    throw new CError(msg, line)
  }

  /* Memory. */
  check(addr: number, n: number, write: boolean) {
    if (addr === 0) this.err('NULL pointer dereference (segmentation fault)')
    if (addr < SEG.rodata || addr + n > SEG.size) this.err(`invalid memory access at 0x${addr.toString(16)} (segmentation fault)`)
    if (write && addr < SEG.data) this.err('write to a string literal (read-only memory): undefined behaviour')
    if (addr >= SEG.heap && addr < this.heapEnd) {
      for (const [base, b] of this.heapBlocks)
        if (addr >= base && addr < base + b.size && b.freed) this.err('use of heap memory after free (dangling pointer)')
    }
    if (addr >= this.heapEnd && addr < this.sp - 4096 && addr >= SEG.heap) this.err(`invalid memory access at 0x${addr.toString(16)} (segmentation fault)`)
  }
  load(addr: number, t: CType): number {
    if (t.k === 'arr' || t.k === 'fn' || t.k === 'struct') return addr
    const n = sizeOf(t)
    this.check(addr, n, false)
    for (let k = 0; k < n; k++)
      if (!this.init[addr + k]) {
        this.warnOnce(`read of an uninitialised variable${this.owner.get(addr) ? ` '${this.owner.get(addr)}'` : ''} (indeterminate value)`)
        break
      }
    const m = this.mem
    if (t.k === 'ptr') return Number(m.getBigUint64(addr, true))
    switch ((t as { p: Prim }).p) {
      case 'char':
        return (t as { u: boolean }).u ? m.getUint8(addr) : m.getInt8(addr)
      case 'bool':
        return m.getUint8(addr)
      case 'short':
        return (t as { u: boolean }).u ? m.getUint16(addr, true) : m.getInt16(addr, true)
      case 'int':
        return (t as { u: boolean }).u ? m.getUint32(addr, true) : m.getInt32(addr, true)
      case 'long':
      case 'llong':
        return (t as { u: boolean }).u ? Number(m.getBigUint64(addr, true)) : Number(m.getBigInt64(addr, true))
      case 'float':
        return m.getFloat32(addr, true)
      case 'double':
        return m.getFloat64(addr, true)
    }
    return 0
  }
  store(addr: number, t: CType, v: number) {
    const n = sizeOf(t)
    this.check(addr, n, true)
    if (this.modified) {
      const prev = this.modified.get(addr)
      const who = this.owner.get(addr) || `0x${addr.toString(16)}`
      if (prev !== undefined) this.err(`'${who}' is modified twice in one expression without a sequence point: undefined behaviour`)
      this.modified.set(addr, who)
    }
    const m = this.mem
    if (t.k === 'ptr') m.setBigUint64(addr, BigInt(Math.max(0, Math.trunc(v))), true)
    else
      switch ((t as { p: Prim }).p) {
        case 'char':
        case 'bool':
          m.setUint8(addr, ((v % 256) + 256) % 256)
          break
        case 'short':
          m.setUint16(addr, ((v % 65536) + 65536) % 65536, true)
          break
        case 'int':
          m.setUint32(addr, v >>> 0, true)
          break
        case 'long':
        case 'llong':
          m.setBigUint64(addr, BigInt.asUintN(64, BigInt(Math.trunc(v))), true)
          break
        case 'float':
          m.setFloat32(addr, v, true)
          break
        case 'double':
          m.setFloat64(addr, v, true)
          break
      }
    for (let k = 0; k < n; k++) this.init[addr + k] = 1
  }
  warnOnce(w: string) {
    if (!this.warnings.includes(w)) this.warnings.push(w)
  }
  allocData(t: CType, name: string): number {
    const a = alignOf(t)
    this.dataEnd = Math.ceil(this.dataEnd / a) * a
    const at = this.dataEnd
    this.dataEnd += Math.max(sizeOf(t), 1)
    const n = sizeOf(t)
    for (let k = 0; k < n; k++) {
      this.init[at + k] = 1 // static storage is zero-initialised
      this.owner.set(at + k, name)
    }
    return at
  }
  allocStack(t: CType, name: string): number {
    const a = Math.max(alignOf(t), 4)
    const n = Math.max(sizeOf(t), 1)
    this.sp = Math.floor((this.sp - n) / a) * a
    if (this.sp < this.heapEnd + 4096) this.err('stack overflow (the recursion is too deep or never ends)')
    for (let k = 0; k < n; k++) {
      this.init[this.sp + k] = 0
      this.owner.set(this.sp + k, name)
    }
    return this.sp
  }
  stringLit(bytes: number[]): number {
    const key = bytes.join(',')
    const hit = this.strings.get(key)
    if (hit !== undefined) return hit
    const at = this.rodataEnd
    bytes.forEach((b, k) => {
      this.mem.setUint8(at + k, b)
      this.init[at + k] = 1
    })
    this.mem.setUint8(at + bytes.length, 0)
    this.init[at + bytes.length] = 1
    this.rodataEnd += bytes.length + 1
    this.strings.set(key, at)
    return at
  }
  readCString(addr: number): string {
    let s = ''
    for (let k = 0; ; k++) {
      this.check(addr + k, 1, false)
      const b = this.mem.getUint8(addr + k)
      if (!b) break
      s += String.fromCharCode(b)
      if (k > 100000) this.err('string without a terminating NUL')
    }
    return s
  }

  /* Names. */
  lookup(name: string): LV | null {
    const f = this.frames[this.frames.length - 1]
    if (f)
      for (let k = f.scopes.length - 1; k >= 0; k--) {
        const v = f.scopes[k].vars.get(name)
        if (v) return v
      }
    return this.globals.get(name) ?? null
  }

  /* Conversions. */
  convert(v: number, from: CType, to: CType): number {
    if (to.k === 'ptr') return v
    if (to.k !== 'prim') return v
    if (to.p === 'void') return 0
    if (to.p === 'double') return v
    if (to.p === 'float') return Math.fround(v)
    if (to.p === 'bool') return v !== 0 ? 1 : 0
    if (isFloat(from)) {
      if (!Number.isFinite(v)) this.err('conversion of an infinite or NaN value to an integer: undefined behaviour')
      v = Math.trunc(v)
    }
    const bits = PSIZE[to.p] * 8
    if (bits === 64) {
      // Doubles above 2^53 cannot round-trip through BigInt exactly; keep in-range values as they are.
      if (to.u && v >= 0 && v <= 2 ** 64) return Math.trunc(v)
      if (!to.u && v >= -(2 ** 63) && v < 2 ** 63) return Math.trunc(v)
      const b = to.u ? BigInt.asUintN(64, BigInt(Math.trunc(v))) : BigInt.asIntN(64, BigInt(Math.trunc(v)))
      return Number(b)
    }
    const mod = 2 ** bits
    let r = ((Math.trunc(v) % mod) + mod) % mod
    if (!to.u && r >= mod / 2) r -= mod
    return r
  }
  promote(t: CType): CType {
    if (t.k === 'prim' && RANK[t.p] < RANK.int) return T.int
    return t
  }
  common(a: CType, b: CType): CType {
    if (isFloat(a) || isFloat(b)) {
      const pa = (a as { p: Prim }).p
      const pb = (b as { p: Prim }).p
      return pa === 'double' || pb === 'double' ? T.double : T.float
    }
    const x = this.promote(a) as { k: 'prim'; p: Prim; u: boolean }
    const y = this.promote(b) as { k: 'prim'; p: Prim; u: boolean }
    if (x.p === y.p) return prim(x.p, x.u || y.u)
    const [hi, lo] = RANK[x.p] > RANK[y.p] ? [x, y] : [y, x]
    if (hi.u) return hi
    if (!lo.u) return hi
    // lo unsigned, hi signed of greater rank: hi can represent all of lo (int vs long here).
    return PSIZE[hi.p] > PSIZE[lo.p] ? hi : prim(hi.p, true)
  }

  /* Values. */
  decay(lv: LV): Val {
    if (lv.t.k === 'arr') return { t: { k: 'ptr', to: lv.t.of }, v: lv.addr }
    if (lv.t.k === 'fn') return { t: { k: 'ptr', to: lv.t }, v: lv.addr }
    if (lv.t.k === 'struct') return { t: lv.t, v: lv.addr }
    return { t: lv.t, v: this.load(lv.addr, lv.t) }
  }
  rvalue(x: Expr): Val {
    if (x.e === 'id' || x.e === 'index' || x.e === 'member' || (x.e === 'un' && x.op === '*')) return this.decay(this.lvalue(x))
    if (x.e === 'str') return { t: { k: 'ptr', to: T.char }, v: this.stringLit(x.bytes) }
    return this.eval(x)
  }
  lvalue(x: Expr): LV {
    this.line = x.line
    switch (x.e) {
      case 'id': {
        const lv = this.lookup(x.name)
        if (lv) return lv
        const fa = this.fnAddr.get(x.name)
        if (fa !== undefined) {
          const t = this.prog.protos.get(x.name) ?? { k: 'fn', ret: T.int, params: [], variadic: true, named: false }
          return { addr: fa, t }
        }
        return this.err(`'${x.name}' undeclared`)
      }
      case 'index': {
        const a = this.rvalue(x.a)
        const i = this.rvalue(x.i)
        const [p, n] = isPtr(a.t) ? [a, i] : [i, a]
        if (!isPtr(p.t) || !isInt(n.t)) this.err('subscripted value is neither array nor pointer')
        const to = (p.t as { to: CType }).to
        return { addr: p.v + n.v * sizeOf(to), t: to }
      }
      case 'un':
        if (x.op === '*') {
          const p = this.rvalue(x.a)
          if (!isPtr(p.t)) this.err(`invalid type argument of unary '*' (have '${typeName(p.t)}')`)
          const to = (p.t as { to: CType }).to
          if (to.k === 'prim' && to.p === 'void') this.err("dereferencing a 'void *' pointer")
          return { addr: p.v, t: to }
        }
        break
      case 'member': {
        let base: LV
        if (x.arrow) {
          const p = this.rvalue(x.a)
          if (!isPtr(p.t) || (p.t as { to: CType }).to.k !== 'struct') this.err("invalid type argument of '->'")
          base = { addr: p.v, t: (p.t as { to: CType }).to }
          if (p.v === 0) this.err('NULL pointer dereference (segmentation fault)')
        } else base = this.lvalue(x.a)
        if (base.t.k !== 'struct') this.err(`request for member '${x.name}' in something not a structure or union`)
        const m = (base.t as { def: StructDef }).def.members.find((mm) => mm.name === x.name)
        if (!m) this.err(`no member named '${x.name}'`)
        return { addr: base.addr + m!.off, t: m!.t }
      }
    }
    return this.err(`lvalue required (cannot assign to '${x.src}')`)
  }

  arith(op: string, a: Val, b: Val, line: number): Val {
    this.line = line
    if (['+', '-'].includes(op) && (isPtr(a.t) || isPtr(b.t))) {
      if (isPtr(a.t) && isPtr(b.t)) {
        if (op === '+') this.err('invalid operands to binary + (two pointers)')
        const sz = sizeOf((a.t as { to: CType }).to)
        return { t: T.long, v: Math.trunc((a.v - b.v) / sz) }
      }
      const [p, n] = isPtr(a.t) ? [a, b] : [b, a]
      if (op === '-' && !isPtr(a.t)) this.err('invalid operands to binary - (integer minus pointer)')
      const sz = sizeOf((p.t as { to: CType }).to)
      return { t: p.t, v: p.v + (op === '-' ? -1 : 1) * n.v * sz }
    }
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      let x = a.v
      let y = b.v
      if (isArith(a.t) && isArith(b.t)) {
        const ct = this.common(a.t, b.t)
        x = this.convert(a.v, a.t, ct)
        y = this.convert(b.v, b.t, ct)
      }
      const r = op === '==' ? x === y : op === '!=' ? x !== y : op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y
      return { t: T.int, v: r ? 1 : 0 }
    }
    if (!isArith(a.t) || !isArith(b.t)) this.err(`invalid operands to binary ${op} ('${typeName(a.t)}' and '${typeName(b.t)}')`)
    if (op === '<<' || op === '>>') {
      const lt = this.promote(a.t)
      const x = this.convert(a.v, a.t, lt)
      const s = b.v
      const bits = sizeOf(lt) * 8
      if (s < 0 || s >= bits) this.err(`shift count ${s} is negative or ≥ the width of the type: undefined behaviour`)
      if (op === '<<') {
        if (!(lt as { u: boolean }).u && x < 0) this.err('left shift of a negative value: undefined behaviour')
        const r = x * 2 ** s
        if (!(lt as { u: boolean }).u && r > (bits === 64 ? Number.MAX_SAFE_INTEGER : 2 ** (bits - 1) - 1)) this.err('signed overflow in left shift: undefined behaviour')
        return { t: lt, v: this.convert(r, lt, lt) }
      }
      return { t: lt, v: Math.floor(x / 2 ** s) }
    }
    const ct = this.common(a.t, b.t)
    const x = this.convert(a.v, a.t, ct)
    const y = this.convert(b.v, b.t, ct)
    if (isFloat(ct)) {
      let r: number
      switch (op) {
        case '+':
          r = x + y
          break
        case '-':
          r = x - y
          break
        case '*':
          r = x * y
          break
        case '/':
          r = x / y
          break
        default:
          return this.err(`invalid operands to binary ${op} (have '${typeName(ct)}')`)
      }
      return { t: ct, v: (ct as { p: Prim }).p === 'float' ? Math.fround(r) : r }
    }
    let r: number
    switch (op) {
      case '+':
        r = x + y
        break
      case '-':
        r = x - y
        break
      case '*':
        r = Number.isSafeInteger(x * y) ? x * y : Number(BigInt(Math.trunc(x)) * BigInt(Math.trunc(y)))
        break
      case '/':
        if (y === 0) this.err('integer division by zero: undefined behaviour')
        r = Math.trunc(x / y)
        break
      case '%':
        if (y === 0) this.err('integer remainder by zero: undefined behaviour')
        r = x % y
        break
      case '&':
        r = Number(BigInt(x) & BigInt(y))
        break
      case '|':
        r = Number(BigInt(x) | BigInt(y))
        break
      case '^':
        r = Number(BigInt(x) ^ BigInt(y))
        break
      default:
        return this.err(`unknown operator ${op}`)
    }
    const res = this.convert(r, T.llong, ct)
    if (!(ct as { u: boolean }).u && res !== r && ['+', '-', '*'].includes(op)) this.err(`signed integer overflow in ${typeName(ct)} ${op}: undefined behaviour`)
    return { t: ct, v: res }
  }

  truth(v: Val): boolean {
    if (!isScalar(v.t)) this.err('used a value that is not a scalar where a condition is required')
    return v.v !== 0
  }

  assignTo(lv: LV, val: Val, line: number): Val {
    this.line = line
    if (lv.t.k === 'arr') this.err('assignment to an expression with array type')
    if (lv.t.k === 'struct') {
      if (val.t.k !== 'struct' || !sameType(val.t, lv.t)) this.err('incompatible types when assigning to a structure')
      const n = sizeOf(lv.t)
      this.check(val.v, n, false)
      const bytes: number[] = []
      for (let k = 0; k < n; k++) bytes.push(this.mem.getUint8(val.v + k))
      this.check(lv.addr, n, true)
      bytes.forEach((b, k) => {
        this.mem.setUint8(lv.addr + k, b)
        this.init[lv.addr + k] = 1
      })
      return { t: lv.t, v: lv.addr }
    }
    if (isPtr(lv.t) && isInt(val.t) && val.v !== 0) this.warnOnce(`assignment makes a pointer from an integer without a cast (line ${line})`)
    const v = this.convert(val.v, val.t, lv.t)
    this.store(lv.addr, lv.t, v)
    return { t: lv.t, v }
  }

  incdec(lv: LV, delta: number, line: number): { old: number; nw: number } {
    const old = this.load(lv.addr, lv.t)
    let nw: number
    if (isPtr(lv.t)) nw = old + delta * sizeOf((lv.t as { to: CType }).to)
    else {
      const r = this.arith('+', { t: lv.t, v: old }, { t: T.int, v: delta }, line)
      nw = this.convert(r.v, r.t, lv.t)
    }
    this.store(lv.addr, lv.t, nw)
    return { old, nw }
  }

  eval(x: Expr): Val {
    this.line = x.line
    switch (x.e) {
      case 'num':
        return { t: x.t, v: x.v }
      case 'str':
      case 'id':
      case 'index':
      case 'member':
        return this.rvalue(x)
      case 'comma': {
        this.eval(x.a)
        this.modified = new Map()
        return this.eval(x.b)
      }
      case 'assign': {
        const lv = this.lvalue(x.a)
        if (x.op === '=') return this.assignTo(lv, this.rvalue(x.b), x.line)
        const cur = this.decay(lv)
        const rhs = this.rvalue(x.b)
        const r = this.arith(x.op.slice(0, -1), cur, rhs, x.line)
        return this.assignTo(lv, r, x.line)
      }
      case 'cond': {
        const c = this.truth(this.rvalue(x.c))
        this.modified = new Map()
        const a = c ? this.rvalue(x.a) : null
        const b = c ? null : this.rvalue(x.b)
        const v = (a ?? b)!
        // Result type: the usual conversions when both are arithmetic (types only).
        return v
      }
      case 'bin': {
        if (x.op === '&&' || x.op === '||') {
          const a = this.truth(this.rvalue(x.a))
          this.modified = new Map()
          if (x.op === '&&' && !a) return { t: T.int, v: 0 }
          if (x.op === '||' && a) return { t: T.int, v: 1 }
          return { t: T.int, v: this.truth(this.rvalue(x.b)) ? 1 : 0 }
        }
        const a = this.rvalue(x.a)
        const b = this.rvalue(x.b)
        return this.arith(x.op, a, b, x.line)
      }
      case 'un': {
        switch (x.op) {
          case '&': {
            if (x.a.e === 'id' && !this.lookup(x.a.name) && this.fnAddr.has(x.a.name)) {
              const t = this.prog.protos.get(x.a.name)!
              return { t: { k: 'ptr', to: t }, v: this.fnAddr.get(x.a.name)! }
            }
            const lv = this.lvalue(x.a)
            return { t: { k: 'ptr', to: lv.t }, v: lv.addr }
          }
          case '*':
            return this.rvalue(x)
          case '+':
          case '-': {
            const a = this.rvalue(x.a)
            if (!isArith(a.t)) this.err(`wrong type argument to unary ${x.op}`)
            if (x.op === '+') return { t: this.promote(a.t), v: this.convert(a.v, a.t, this.promote(a.t)) }
            return this.arith('-', { t: T.int, v: 0 }, a, x.line)
          }
          case '!':
            return { t: T.int, v: this.truth(this.rvalue(x.a)) ? 0 : 1 }
          case '~': {
            const a = this.rvalue(x.a)
            if (!isInt(a.t)) this.err('wrong type argument to bit-complement')
            const pt = this.promote(a.t)
            return { t: pt, v: this.convert(-this.convert(a.v, a.t, pt) - 1, T.llong, pt) }
          }
          case '++':
          case '--': {
            const lv = this.lvalue(x.a)
            const { nw } = this.incdec(lv, x.op === '++' ? 1 : -1, x.line)
            return { t: lv.t, v: nw }
          }
        }
        break
      }
      case 'post': {
        const lv = this.lvalue(x.a)
        const { old } = this.incdec(lv, x.op === '++' ? 1 : -1, x.line)
        return { t: lv.t, v: old }
      }
      case 'cast': {
        const a = this.rvalue(x.a)
        if (x.t.k === 'prim' && x.t.p === 'void') return { t: T.void, v: 0 }
        return { t: x.t, v: this.convert(a.v, a.t, x.t) }
      }
      case 'sizeofT':
        return { t: T.ulong, v: sizeOf(x.t) }
      case 'sizeofE':
        return { t: T.ulong, v: sizeOf(this.typeOf(x.a)) }
      case 'call':
        return this.call(x)
      case 'init':
        return this.err('an initializer list is not an expression')
    }
    return this.err(`cannot evaluate ${x.src}`)
  }

  /** Static type of an expression without evaluating side effects (for sizeof). */
  typeOf(x: Expr): CType {
    switch (x.e) {
      case 'num':
        return x.t
      case 'str':
        return { k: 'arr', of: T.char, n: x.bytes.length + 1 }
      case 'id': {
        const lv = this.lookup(x.name)
        if (lv) return lv.t
        return this.err(`'${x.name}' undeclared`)
      }
      case 'index': {
        const a = this.typeOf(x.a)
        const t = a.k === 'arr' ? a.of : a.k === 'ptr' ? a.to : null
        return t ?? this.err('subscripted value is neither array nor pointer')
      }
      case 'member': {
        let b = this.typeOf(x.a)
        if (x.arrow && b.k === 'ptr') b = b.to
        if (b.k !== 'struct') return this.err('member of a non-structure')
        const m = b.def.members.find((mm) => mm.name === x.name)
        return m ? m.t : this.err(`no member named '${x.name}'`)
      }
      case 'un':
        if (x.op === '*') {
          const a = this.typeOf(x.a)
          return a.k === 'ptr' ? a.to : a.k === 'arr' ? a.of : this.err('invalid unary *')
        }
        if (x.op === '&') return { k: 'ptr', to: this.typeOf(x.a) }
        if (x.op === '!') return T.int
        if (x.op === '++' || x.op === '--') return this.typeOf(x.a)
        return this.promote(this.typeOf(x.a))
      case 'post':
        return this.typeOf(x.a)
      case 'cast':
        return x.t
      case 'sizeofT':
      case 'sizeofE':
        return T.ulong
      case 'assign':
        return this.typeOf(x.a)
      case 'comma':
        return this.typeOf(x.b)
      case 'cond': {
        const a = this.typeOf(x.a)
        const b = this.typeOf(x.b)
        return isArith(a) && isArith(b) ? this.common(a, b) : a.k === 'arr' ? { k: 'ptr', to: a.of } : a
      }
      case 'bin': {
        if (['&&', '||', '==', '!=', '<', '>', '<=', '>='].includes(x.op)) return T.int
        const a = this.typeOf(x.a)
        const b = this.typeOf(x.b)
        const da = a.k === 'arr' ? ({ k: 'ptr', to: a.of } as CType) : a
        const db = b.k === 'arr' ? ({ k: 'ptr', to: b.of } as CType) : b
        if (isPtr(da) && isPtr(db)) return T.long
        if (isPtr(da)) return da
        if (isPtr(db)) return db
        if (x.op === '<<' || x.op === '>>') return this.promote(da)
        return this.common(da, db)
      }
      case 'call': {
        const name = x.f.e === 'id' ? x.f.name : ''
        const p = this.prog.protos.get(name)
        if (p && p.k === 'fn') return p.ret
        if (BUILTIN_RET[name]) return BUILTIN_RET[name]
        const ft = this.typeOf(x.f)
        if (ft.k === 'ptr' && ft.to.k === 'fn') return ft.to.ret
        return T.int
      }
      case 'init':
        return T.void
    }
  }

  call(x: Extract<Expr, { e: 'call' }>): Val {
    let name = x.f.e === 'id' && !this.lookup(x.f.name) ? x.f.name : ''
    if (!name) {
      const fv = this.rvalue(x.f)
      name = this.addrFn.get(fv.v) ?? this.err('call through an invalid function pointer')
    }
    const def = this.prog.fns.get(name)
    // Arguments: evaluated right to left (as gcc/clang on x86-64 commonly do; the order is unspecified in C).
    const vals: Val[] = new Array(x.args.length)
    for (let k = x.args.length - 1; k >= 0; k--) vals[k] = this.rvalue(x.args[k])
    this.modified = new Map()
    if (!def) {
      if (BUILTINS.includes(name)) return this.builtin(name, vals, x.line)
      return this.err(`implicit declaration of function '${name}' (undefined reference)`)
    }
    const ft = def.t
    if (ft.named && vals.length !== ft.params.length) this.err(`too ${vals.length < ft.params.length ? 'few' : 'many'} arguments to function '${name}'`)
    if (this.frames.length >= this.opts.maxDepth) this.err('stack overflow (the recursion is too deep or never ends)')
    const savedSp = this.sp
    const frame: Frame = { fn: name, scopes: [{ vars: new Map() }], sp: savedSp, line: def.line }
    // Allocate parameters, convert arguments (call by value).
    const argStr: string[] = []
    const addrs: { lv: LV; v: Val }[] = []
    ft.params.forEach((pt, k) => {
      const pname = def.params[k] || `arg${k}`
      const addr = this.allocStack(pt, pname)
      addrs.push({ lv: { addr, t: pt, name: pname }, v: vals[k] })
      frame.scopes[0].vars.set(pname, { addr, t: pt, name: pname })
    })
    for (const { lv, v } of addrs) {
      this.assignTo(lv, v, x.line)
      argStr.push(fmtVal(this, lv.t, this.load(lv.addr, lv.t)))
    }
    const parent = this.callStack.length ? this.callStack[this.callStack.length - 1] : null
    const node: CallNode = { id: this.calls.length, fn: name, args: argStr.join(', '), depth: this.frames.length, children: [], parent, outBefore: this.out.length }
    if (this.calls.length < 4000) {
      this.calls.push(node)
      if (parent !== null) this.calls[parent].children.push(node.id)
    }
    this.callStack.push(node.id)
    this.frames.push(frame)
    this.maxDepth = Math.max(this.maxDepth, this.frames.length)
    let ret: Val | null = null
    try {
      this.snap(def.line, `call ${name}(${node.args})`)
      this.execBlock(def.body, false)
    } catch (e) {
      if (e instanceof Return) ret = e.v
      else throw e
    }
    this.frames.pop()
    this.callStack.pop()
    this.sp = savedSp
    const rt = ft.ret
    let result: Val
    if (rt.k === 'prim' && rt.p === 'void') result = { t: T.void, v: 0 }
    else if (!ret) {
      if (name !== 'main') this.warnOnce(`control reaches the end of non-void function '${name}' (the caller gets an indeterminate value)`)
      result = { t: rt, v: 0 }
    } else result = { t: rt, v: this.convert(ret.v, ret.t, rt) }
    node.ret = rt.k === 'prim' && rt.p === 'void' ? '' : fmtVal(this, rt, result.v)
    node.outAfter = this.out.length
    this.line = x.line
    return result
  }

  builtin(name: string, a: Val[], line: number): Val {
    this.line = line
    const str = (k: number) => this.readCString(a[k].v)
    switch (name) {
      case 'printf': {
        const s = cFormat(this, str(0), a.slice(1))
        this.out += s
        return { t: T.int, v: new TextEncoder().encode(s).length }
      }
      case 'putchar':
        this.out += String.fromCharCode(this.convert(a[0].v, a[0].t, T.uchar))
        return { t: T.int, v: a[0].v }
      case 'puts':
        this.out += str(0) + '\n'
        return { t: T.int, v: 1 }
      case 'getchar': {
        if (this.inPos >= this.input.length) return { t: T.int, v: -1 }
        return { t: T.int, v: this.input.charCodeAt(this.inPos++) }
      }
      case 'strlen':
        return { t: T.ulong, v: str(0).length }
      case 'strcpy': {
        const s = str(1)
        for (let k = 0; k <= s.length; k++) this.store(a[0].v + k, T.char, k < s.length ? s.charCodeAt(k) : 0)
        return a[0]
      }
      case 'strcat': {
        const d = str(0)
        const s = str(1)
        for (let k = 0; k <= s.length; k++) this.store(a[0].v + d.length + k, T.char, k < s.length ? s.charCodeAt(k) : 0)
        return a[0]
      }
      case 'strcmp': {
        const x = str(0)
        const y = str(1)
        return { t: T.int, v: x < y ? -1 : x > y ? 1 : 0 }
      }
      case 'malloc':
      case 'calloc': {
        const n = name === 'malloc' ? a[0].v : a[0].v * a[1].v
        const at = Math.ceil(this.heapEnd / 16) * 16
        this.heapEnd = at + Math.max(n, 1)
        if (this.heapEnd > this.sp - 8192) return { t: { k: 'ptr', to: T.void }, v: 0 }
        this.heapBlocks.set(at, { size: Math.max(n, 1), freed: false })
        for (let k = 0; k < n; k++) {
          this.init[at + k] = name === 'calloc' ? 1 : 0
          if (name === 'calloc') this.mem.setUint8(at + k, 0)
          this.owner.set(at + k, `heap block @0x${at.toString(16)}`)
        }
        return { t: { k: 'ptr', to: T.void }, v: at }
      }
      case 'free': {
        if (a[0].v === 0) return { t: T.void, v: 0 }
        const b = this.heapBlocks.get(a[0].v)
        if (!b) this.err('free() of a pointer that malloc did not return: undefined behaviour')
        if (b!.freed) this.err('double free: undefined behaviour')
        b!.freed = true
        return { t: T.void, v: 0 }
      }
      case 'abs':
        return { t: T.int, v: Math.abs(a[0].v) }
      case 'sqrt':
        return { t: T.double, v: Math.sqrt(a[0].v) }
      case 'pow':
        return { t: T.double, v: Math.pow(a[0].v, a[1].v) }
      case 'exit':
        throw new ExitSignal(a[0].v)
    }
    return this.err(`unknown function ${name}`)
  }

  /* Statements. */
  declare(d: Decl, local: boolean) {
    this.line = d.line
    let t = d.t
    if (t.k === 'arr' && t.n === null && d.init) {
      const per = t.of.k === 'arr' || t.of.k === 'struct' ? scalarCount(t.of) : 1
      const n =
        d.init.e === 'str'
          ? d.init.bytes.length + 1
          : d.init.e === 'init'
            ? d.init.items.every((it) => it.e === 'init' || it.e === 'str') || per === 1
              ? d.init.items.length
              : Math.ceil(d.init.items.length / per)
            : null
      if (n === null) this.err('array of unknown size needs a brace or string initialiser')
      t = { k: 'arr', of: t.of, n }
    }
    if (t.k === 'fn') {
      return
    }
    const isStatic = !local || d.storage === 'static'
    if (local && d.storage === 'extern') {
      const g = this.globals.get(d.name)
      if (!g) this.err(`undefined reference to '${d.name}'`)
      this.scope().vars.set(d.name, g!)
      return
    }
    const scope = local ? this.scope() : null
    if (scope && scope.vars.has(d.name)) this.err(`redefinition of '${d.name}' in the same scope`)
    if (!local && this.globals.has(d.name)) this.err(`redefinition of '${d.name}'`)
    let addr: number
    if (isStatic) {
      const key = local ? `${this.frames[this.frames.length - 1].fn}:${d.name}:${d.line}` : d.name
      const existing = this.staticByKey.get(key)
      if (existing) {
        scope!.vars.set(d.name, existing)
        return
      }
      addr = this.allocData(t, d.name)
      const lv = { addr, t, name: d.name }
      this.staticByKey.set(key, lv)
      if (local) {
        scope!.vars.set(d.name, lv)
        this.statics.push({ name: `${this.frames[this.frames.length - 1].fn}::${d.name}`, lv })
      } else this.globals.set(d.name, lv)
      if (d.init) this.initialise(lv, d.init, true)
      return
    }
    addr = this.allocStack(t, d.name)
    const lv = { addr, t, name: d.name }
    scope!.vars.set(d.name, lv)
    if (d.init) this.initialise(lv, d.init, false)
  }
  staticByKey = new Map<string, LV>()

  initialise(lv: LV, init: Expr, isStatic: boolean) {
    this.modified = new Map()
    if (isStatic && init.e !== 'init' && init.e !== 'str') {
      // Static initialisers must be constant expressions; evaluate once at load time.
    }
    if (lv.t.k === 'arr' && init.e === 'str' && lv.t.of.k === 'prim' && lv.t.of.p === 'char') {
      const n = lv.t.n!
      if (init.bytes.length > n) this.warnOnce(`initializer-string for array of chars is too long`)
      for (let k = 0; k < n; k++) this.store(lv.addr + k, T.char, k < init.bytes.length ? init.bytes[k] : 0)
      return
    }
    if (lv.t.k === 'arr' || lv.t.k === 'struct') {
      // Zero the aggregate, then fill in order with brace elision.
      const n = sizeOf(lv.t)
      for (let k = 0; k < n; k++) {
        this.mem.setUint8(lv.addr + k, 0)
        this.init[lv.addr + k] = 1
      }
      const items = init.e === 'init' ? init.items : [init]
      const pos = { k: 0 }
      this.fillAggregate(lv, items, pos)
      if (pos.k < items.length) this.warnOnce('excess elements in initializer')
      return
    }
    const x = init.e === 'init' ? init.items[0] : init
    if (!x) this.err('empty scalar initializer')
    this.assignTo(lv, this.rvalue(x), init.line)
    this.modified = null
  }
  fillAggregate(lv: LV, items: Expr[], pos: { k: number }) {
    const slots: LV[] =
      lv.t.k === 'arr'
        ? Array.from({ length: lv.t.n ?? 0 }, (_, i) => ({ addr: lv.addr + i * sizeOf((lv.t as { of: CType }).of), t: (lv.t as { of: CType }).of }))
        : (lv.t as { def: StructDef }).def.members.map((m) => ({ addr: lv.addr + m.off, t: m.t }))
    const isUnion = lv.t.k === 'struct' && lv.t.union
    for (const slot of isUnion ? slots.slice(0, 1) : slots) {
      if (pos.k >= items.length) return
      const it = items[pos.k]
      if (slot.t.k === 'arr' || slot.t.k === 'struct') {
        if (it.e === 'init') {
          pos.k++
          this.fillAggregate(slot, it.items, { k: 0 })
        } else if (it.e === 'str' && slot.t.k === 'arr') {
          pos.k++
          const n = slot.t.n!
          for (let k = 0; k < n && k <= it.bytes.length; k++) this.store(slot.addr + k, T.char, k < it.bytes.length ? it.bytes[k] : 0)
        } else this.fillAggregate(slot, items, pos)
      } else {
        pos.k++
        const v = it.e === 'init' ? it.items[0] : it
        this.assignTo(slot, this.rvalue(v), it.line)
      }
    }
  }

  scope(): Scope {
    const f = this.frames[this.frames.length - 1]
    return f.scopes[f.scopes.length - 1]
  }

  tick(line: number) {
    this.line = line
    if (++this.stepCount > this.opts.maxSteps) this.err(`stopped after ${this.opts.maxSteps} steps (an infinite loop?)`)
  }

  snap(line: number, note?: string) {
    if (!this.opts.trace || this.steps.length >= 3000) return
    const frames: FrameView[] = this.frames.map((f) => {
      const vars: VarView[] = []
      for (const s of f.scopes) for (const [name, lv] of s.vars) vars.push(this.view(name, lv))
      return { fn: f.fn, vars, line: f.line }
    })
    const statics = [...[...this.globals].map(([n, lv]) => this.view(n, lv)), ...this.statics.map((s) => this.view(s.name, s.lv))]
    const prev = this.steps[this.steps.length - 1]
    if (prev) {
      const pv = new Map<string, string>()
      prev.frames.forEach((f, i) => f.vars.forEach((v) => pv.set(`${i}:${v.name}`, v.value)))
      prev.statics.forEach((v) => pv.set(`s:${v.name}`, v.value))
      frames.forEach((f, i) => f.vars.forEach((v) => (v.changed = pv.has(`${i}:${v.name}`) && pv.get(`${i}:${v.name}`) !== v.value)))
      statics.forEach((v) => (v.changed = pv.has(`s:${v.name}`) && pv.get(`s:${v.name}`) !== v.value))
    }
    this.steps.push({ line, frames, statics, out: this.out, note })
  }

  view(name: string, lv: LV): VarView {
    return { name, type: typeName(lv.t), addr: lv.addr, value: this.show(lv) }
  }
  show(lv: LV, depth = 0): string {
    const t = lv.t
    if (t.k === 'arr') {
      const n = Math.min(t.n ?? 0, 12)
      if (t.of.k === 'prim' && t.of.p === 'char' && depth === 0) {
        let s = ''
        for (let k = 0; k < (t.n ?? 0); k++) {
          const b = this.mem.getUint8(lv.addr + k)
          if (!b) break
          s += String.fromCharCode(b)
        }
        return JSON.stringify(s)
      }
      const parts: string[] = []
      for (let k = 0; k < n; k++) parts.push(this.show({ addr: lv.addr + k * sizeOf(t.of), t: t.of }, depth + 1))
      return `{${parts.join(', ')}${(t.n ?? 0) > n ? ', …' : ''}}`
    }
    if (t.k === 'struct') {
      return `{${t.def.members.map((m) => `.${m.name}=${this.show({ addr: lv.addr + m.off, t: m.t }, depth + 1)}`).join(', ')}}`
    }
    for (let k = 0; k < sizeOf(t); k++) if (!this.init[lv.addr + k]) return '?'
    return fmtVal(this, t, this.load(lv.addr, t))
  }

  execBlock(b: Stmt & { s: 'block' }, newScope = true) {
    const f = this.frames[this.frames.length - 1]
    if (newScope) f.scopes.push({ vars: new Map() })
    const sp = this.sp
    try {
      this.execList(b.body)
    } finally {
      if (newScope) {
        f.scopes.pop()
        this.sp = sp
      }
    }
  }
  execList(list: Stmt[]) {
    for (const s of list) this.exec(s)
  }

  exec(s: Stmt) {
    this.tick(s.line)
    this.frames[this.frames.length - 1].line = s.line
    switch (s.s) {
      case 'block':
        this.execBlock(s)
        return
      case 'decl':
        for (const d of s.decls) this.declare(d, true)
        this.snap(s.line)
        return
      case 'expr':
        if (s.x) {
          this.modified = new Map()
          this.eval(s.x)
          this.modified = null
        }
        this.snap(s.line)
        return
      case 'if': {
        this.modified = new Map()
        const c = this.truth(this.rvalue(s.c))
        this.modified = null
        this.snap(s.line, `condition ${s.c.src} is ${c ? 'true' : 'false'}`)
        if (c) this.exec(s.a)
        else if (s.b) this.exec(s.b)
        return
      }
      case 'while':
        for (;;) {
          this.tick(s.line)
          this.modified = new Map()
          const c = this.truth(this.rvalue(s.c))
          this.modified = null
          this.snap(s.line, `while (${s.c.src}) is ${c ? 'true' : 'false'}`)
          if (!c) return
          try {
            this.exec(s.body)
          } catch (e) {
            if (e instanceof Break) return
            if (!(e instanceof Continue)) throw e
          }
        }
      case 'do':
        for (;;) {
          try {
            this.exec(s.body)
          } catch (e) {
            if (e instanceof Break) return
            if (!(e instanceof Continue)) throw e
          }
          this.tick(s.line)
          this.modified = new Map()
          const c = this.truth(this.rvalue(s.c))
          this.modified = null
          this.snap(s.line, `while (${s.c.src}) is ${c ? 'true' : 'false'}`)
          if (!c) return
        }
      case 'for': {
        const f = this.frames[this.frames.length - 1]
        f.scopes.push({ vars: new Map() })
        try {
          if (s.init) this.exec(s.init)
          for (;;) {
            this.tick(s.line)
            if (s.c) {
              this.modified = new Map()
              const c = this.truth(this.rvalue(s.c))
              this.modified = null
              this.snap(s.line, `for condition ${s.c.src} is ${c ? 'true' : 'false'}`)
              if (!c) return
            }
            try {
              this.exec(s.body)
            } catch (e) {
              if (e instanceof Break) return
              if (!(e instanceof Continue)) throw e
            }
            if (s.step) {
              this.modified = new Map()
              this.eval(s.step)
              this.modified = null
            }
          }
        } finally {
          f.scopes.pop()
        }
      }
      case 'switch': {
        this.modified = new Map()
        const v = this.rvalue(s.c)
        this.modified = null
        if (!isInt(v.t)) this.err('switch quantity is not an integer')
        const body = s.body.s === 'block' ? s.body.body : [s.body]
        const vv = this.convert(v.v, v.t, this.promote(v.t))
        let start = body.findIndex((st) => st.s === 'case' && st.v && this.constCase(st.v) === vv)
        if (start < 0) start = body.findIndex((st) => st.s === 'case' && !st.v)
        this.snap(s.line, `switch (${s.c.src}) = ${vv}${start < 0 ? ': no case matches' : ''}`)
        if (start < 0) return
        const f = this.frames[this.frames.length - 1]
        f.scopes.push({ vars: new Map() })
        try {
          this.execList(body.slice(start))
        } catch (e) {
          if (!(e instanceof Break)) throw e
        } finally {
          f.scopes.pop()
        }
        return
      }
      case 'case':
        return
      case 'break':
        throw new Break()
      case 'continue':
        throw new Continue()
      case 'return': {
        this.modified = new Map()
        const v = s.x ? this.rvalue(s.x) : null
        this.modified = null
        this.snap(s.line, v ? `return ${fmtVal(this, v.t, v.v)}` : 'return')
        throw new Return(v)
      }
    }
  }
  constCase(x: Expr): number {
    if (x.e === 'num') return x.v
    if (x.e === 'un' && x.op === '-') return -this.constCase(x.a)
    if (x.e === 'bin') return this.arith(x.op, { t: T.int, v: this.constCase(x.a) }, { t: T.int, v: this.constCase(x.b) }, x.line).v
    return this.err('case label does not reduce to an integer constant')
  }

  run(): RunResult {
    let exit: number | null = null
    let error: CError | null = null
    try {
      for (const g of this.prog.globals) this.declare(g, false)
      const main = this.prog.fns.get('main')
      if (!main) throw new CError("undefined reference to 'main'", 0, 'compile')
      const r = this.call({ e: 'call', f: { e: 'id', name: 'main', line: main.line, src: 'main' }, args: [], line: main.line, src: 'main()' })
      exit = r.t.k === 'prim' && r.t.p === 'void' ? 0 : r.v
    } catch (e) {
      if (e instanceof ExitSignal) exit = e.code
      else if (e instanceof CError) error = e
      else if (e instanceof RangeError) error = new CError('stack overflow (the recursion is too deep or never ends)', this.line)
      else throw e
    }
    this.snap(this.line, error ? `error: ${error.message}` : 'program finished')
    return { ok: !error, out: this.out, exit, error, steps: this.steps, calls: this.calls, maxDepth: this.maxDepth, warnings: this.warnings }
  }
}

class ExitSignal {
  code: number
  constructor(code: number) {
    this.code = code
  }
}

const BUILTINS = ['printf', 'putchar', 'puts', 'getchar', 'strlen', 'strcpy', 'strcat', 'strcmp', 'malloc', 'calloc', 'free', 'abs', 'sqrt', 'pow', 'exit']
const BUILTIN_RET: Record<string, CType> = {
  printf: T.int,
  putchar: T.int,
  puts: T.int,
  getchar: T.int,
  strlen: T.ulong,
  strcpy: { k: 'ptr', to: T.char },
  strcat: { k: 'ptr', to: T.char },
  strcmp: T.int,
  malloc: { k: 'ptr', to: T.void },
  calloc: { k: 'ptr', to: T.void },
  abs: T.int,
  sqrt: T.double,
  pow: T.double,
}

/* ── printf ────────────────────────────────────────────────────────── */

function fmtFloat(v: number, prec: number, conv: string): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? 'nan' : v > 0 ? 'inf' : '-inf'
  if (conv === 'f') return v.toFixed(prec)
  if (conv === 'e') {
    const s = v.toExponential(prec)
    return s.replace(/e([+-])(\d)$/, 'e$10$2')
  }
  // %g
  const p = prec === 0 ? 1 : prec
  if (v === 0) return '0'
  const exp = Math.floor(Math.log10(Math.abs(v)))
  let s: string
  if (exp < -4 || exp >= p) s = v.toExponential(p - 1).replace(/e([+-])(\d)$/, 'e$10$2')
  else s = v.toFixed(Math.max(0, p - 1 - exp))
  if (s.includes('.')) s = s.replace(/\.?0+(e|$)/, '$1')
  return s
}

export function cFormat(m: Machine, fmt: string, args: Val[]): string {
  let out = ''
  let ai = 0
  const next = () => {
    if (ai >= args.length) m.err('printf: too few arguments for the format (undefined behaviour)')
    return args[ai++]
  }
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i]
    if (c !== '%') {
      out += c
      continue
    }
    const mm = /^([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?(hh|h|ll|l|z)?([diuxXocsfeEgGp%])/.exec(fmt.slice(i + 1))
    if (!mm) m.err(`printf: unsupported conversion in "${fmt.slice(i, i + 4)}"`)
    i += mm![0].length
    const [, flags, w, pr, len, conv] = mm!
    if (conv === '%') {
      out += '%'
      continue
    }
    let width = w === '*' ? next().v : w ? Number(w) : 0
    const prec = pr === '*' ? next().v : pr !== undefined ? Number(pr) : null
    const a = next()
    let s: string
    const intLike = 'diuxXoc'.includes(conv)
    if (intLike && !isInt(a.t)) m.err(`printf: %${conv} expects an integer but the argument has type '${typeName(a.t)}' (undefined behaviour)`)
    if ('feEgG'.includes(conv) && !isFloat(a.t)) m.err(`printf: %${conv} expects a double but the argument has type '${typeName(a.t)}' (undefined behaviour)`)
    if (conv === 's' && !isPtr(a.t)) m.err(`printf: %s expects a char * but the argument has type '${typeName(a.t)}' (undefined behaviour)`)
    const lt = len === 'l' || len === 'll' || len === 'z' ? (conv === 'd' || conv === 'i' ? T.long : T.ulong) : conv === 'd' || conv === 'i' ? T.int : T.uint
    switch (conv) {
      case 'd':
      case 'i': {
        const v = m.convert(a.v, a.t, len === 'h' ? T.short : len === 'hh' ? T.char : lt)
        s = String(Math.abs(v))
        if (prec !== null) s = s.padStart(prec, '0')
        s = (v < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '') + s
        break
      }
      case 'u':
      case 'x':
      case 'X':
      case 'o': {
        const v = m.convert(a.v, a.t, len === 'h' ? prim('short', true) : len === 'hh' ? T.uchar : lt)
        s = conv === 'u' ? String(v) : conv === 'o' ? v.toString(8) : v.toString(16)
        if (conv === 'X') s = s.toUpperCase()
        if (prec !== null) s = s.padStart(prec, '0')
        if (flags.includes('#') && v !== 0) s = (conv === 'o' ? '0' : conv === 'x' ? '0x' : conv === 'X' ? '0X' : '') + s
        break
      }
      case 'c':
        s = String.fromCharCode(m.convert(a.v, a.t, T.uchar))
        break
      case 's': {
        s = m.readCString(a.v)
        if (prec !== null) s = s.slice(0, prec)
        break
      }
      case 'p':
        s = a.v === 0 ? '0x0' : `0x${a.v.toString(16)}`
        break
      default: {
        const lc = conv.toLowerCase()
        s = fmtFloat(a.v, prec ?? 6, lc)
        if (conv === 'E' || conv === 'G') s = s.toUpperCase()
        if (a.v >= 0 && flags.includes('+')) s = '+' + s
      }
    }
    if (width < 0) width = -width
    if (s.length < width) {
      if (flags.includes('-')) s = s.padEnd(width)
      else if (flags.includes('0') && conv !== 's' && conv !== 'c') {
        const sign = /^[-+ ]/.test(s) ? s[0] : ''
        s = sign + s.slice(sign.length).padStart(width - sign.length, '0')
      } else s = s.padStart(width)
    }
    out += s
  }
  return out
}

export function fmtVal(m: Machine, t: CType, v: number): string {
  if (t.k === 'ptr') {
    if (v === 0) return 'NULL'
    const fn = m.addrFn.get(v)
    if (fn) return `&${fn}`
    return `0x${v.toString(16)}`
  }
  if (t.k === 'prim') {
    if (t.p === 'char') return `${v}${v >= 32 && v < 127 ? ` '${String.fromCharCode(v)}'` : ''}`
    if (t.p === 'float' || t.p === 'double') return fmtFloat(v, 6, 'g')
  }
  return String(v)
}

/* ── Entry points ──────────────────────────────────────────────────── */

/** Compile and run a program. Compile errors come back as `error` with kind 'compile'. */
export function runC(src: string, opts: RunOptions = {}): RunResult {
  let prog: Program
  try {
    prog = parse(src)
  } catch (e) {
    if (e instanceof CError) {
      e.kind = 'compile'
      return { ok: false, out: '', exit: null, error: e, steps: [], calls: [], maxDepth: 0, warnings: [] }
    }
    throw e
  }
  return new Machine(prog, opts).run()
}

export interface ExplainStep {
  expr: string
  value: string
  type: string
  note?: string
  depth: number
}

/**
 * Evaluate one expression after some declarations and explain it operator by
 * operator: the operands, the conversions applied, the result and its type;
 * skipped operands of && || ?: are reported as skipped. `decls` is C code such
 * as "int a = 5, b = 3; unsigned u = 1;". Returns the steps, the final value
 * and the variables afterwards.
 */
export function explainExpr(decls: string, expr: string): { steps: ExplainStep[]; value: string; type: string; vars: VarView[]; error: string | null } {
  const src = `int main(void) {\n${decls}\n__probe = (${expr});\nreturn 0;\n}`
  let prog: Program
  try {
    const toks = preprocess(src)
    const p = new Parser(toks, src)
    prog = p.program()
  } catch (e) {
    return { steps: [], value: '', type: '', vars: [], error: (e as Error).message }
  }
  const m = new Machine(prog, { trace: false })
  const steps: ExplainStep[] = []
  let depth = 0
  const origEval = m.eval.bind(m)
  const origRv = m.rvalue.bind(m)
  const main = prog.fns.get('main')!
  const last = main.body.body[main.body.body.length - 2]
  const target = last.s === 'expr' && last.x && last.x.e === 'assign' ? last.x.b : null
  let inTarget = false
  const record = (x: Expr, v: Val, note?: string) => {
    if (!inTarget) return
    if (x.e === 'num' || x.e === 'str') return
    steps.push({ expr: x.src, value: fmtVal(m, v.t, v.v), type: typeName(v.t), note, depth })
  }
  m.rvalue = (x: Expr) => {
    depth++
    try {
      const v = origRv(x)
      if (x.e === 'id' || x.e === 'index' || x.e === 'member' || (x.e === 'un' && x.op === '*')) record(x, v)
      return v
    } finally {
      depth--
    }
  }
  m.eval = (x: Expr) => {
    if (x === target) inTarget = true
    depth++
    try {
      let note: string | undefined
      if (inTarget && x.e === 'bin' && (x.op === '&&' || x.op === '||')) {
        const v = origEval(x)
        const left = steps.length
        void left
        note = undefined
        record(x, v, note)
        return v
      }
      const v = origEval(x)
      if (inTarget && x.e === 'bin' && !['&&', '||', '==', '!=', '<', '>', '<=', '>='].includes(x.op)) {
        const ta = m.typeOf(x.a)
        const tb = m.typeOf(x.b)
        if (isArith(ta) && isArith(tb) && (!sameType(m.promote(ta), m.promote(tb)) || !sameType(ta, m.promote(ta)) || !sameType(tb, m.promote(tb))))
          note = `operands converted to ${typeName(v.t)}`
      }
      if (inTarget && x.e === 'cast') note = `converted to ${typeName(x.t)}`
      record(x, v, note)
      return v
    } finally {
      depth--
      if (x === target) inTarget = false
    }
  }
  // Declare the probe as a long double-free container: we only read the target's own value.
  let value = ''
  let type = ''
  let error: string | null = null
  try {
    const decl = main.body.body.slice(0, -2)
    m.frames.push({ fn: 'main', scopes: [{ vars: new Map() }], sp: m.sp, line: 1 })
    for (const st of decl) m.exec(st)
    // Mark which operands of && || ?: were skipped by comparing the evaluated set.
    m.modified = new Map()
    const v = m.eval(target!)
    value = fmtVal(m, v.t, v.v)
    type = typeName(v.t)
    markSkipped(target!, steps)
  } catch (e) {
    error = (e as Error).message
  }
  const vars: VarView[] = []
  const f = m.frames[0]
  if (f) for (const s of f.scopes) for (const [n, lv] of s.vars) vars.push(m.view(n, lv))
  return { steps, value, type, vars, error }
}

function markSkipped(x: Expr, steps: ExplainStep[]) {
  const seen = new Set(steps.map((s) => s.expr))
  const walk = (e: Expr) => {
    if (e.e === 'bin' && (e.op === '&&' || e.op === '||') && seen.has(e.a.src) === false && e.a.e !== 'num') return
    if (e.e === 'bin' && (e.op === '&&' || e.op === '||') && !seen.has(e.b.src) && e.b.e !== 'num')
      steps.push({ expr: e.b.src, value: '—', type: '', note: `not evaluated: ${e.op} already decided by the left operand`, depth: 1 })
    if (e.e === 'cond') {
      if (!seen.has(e.a.src) && e.a.e !== 'num') steps.push({ expr: e.a.src, value: '—', type: '', note: 'not evaluated: the condition is false', depth: 1 })
      if (!seen.has(e.b.src) && e.b.e !== 'num') steps.push({ expr: e.b.src, value: '—', type: '', note: 'not evaluated: the condition is true', depth: 1 })
    }
    for (const k of ['a', 'b', 'c', 'f', 'i'] as const) {
      const sub = (e as Record<string, unknown>)[k]
      if (sub && typeof sub === 'object' && 'e' in (sub as object)) walk(sub as Expr)
    }
  }
  walk(x)
}

/* ── Presets (programs the labs offer; each is also a test vector) ─── */

export interface Preset {
  id: string
  title: string
  src: string
  input?: string
}
