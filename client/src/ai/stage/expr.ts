/*
  Safe maths expressions for Stage scenes: "exp(-(x^2 + y^2) / 2)".

  A lesson can describe a surface or a vector field as a formula instead of
  code. The formula is parsed once into a closure; nothing is ever passed to
  eval() or new Function(), so a scene file can't run code.

  Grammar (usual precedence, ^ is right-associative, unary minus binds
  looser than ^ so -x^2 = -(x^2)):
    expr   := term (('+' | '-') term)*
    term   := unary (('*' | '/') unary)*
    unary  := '-' unary | power
    power  := atom ('^' unary)?
    atom   := number | name | name '(' args ')' | '(' expr ')'
  Names: the variables the caller allows (x, y, t …), the parameters of the
  scene, the constants pi and e, and the functions in FUNCS.

  Shared with Node tests: dependency-free and erasable-syntax only.
*/

export type Fn = (vars: Record<string, number>) => number

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  hypot: Math.hypot,
  sigmoid: (z) => 1 / (1 + Math.exp(-z)),
  relu: (z) => Math.max(0, z),
  softplus: (z) => Math.log1p(Math.exp(z)),
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }

export class ExprError extends Error {}

type Tok = { k: 'num'; v: number } | { k: 'name'; v: string } | { k: 'op'; v: string }

function lex(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i))
    if (num) {
      out.push({ k: 'num', v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const name = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(src.slice(i))
    if (name) {
      out.push({ k: 'name', v: name[0] })
      i += name[0].length
      continue
    }
    if ('+-*/^(),'.includes(c)) {
      out.push({ k: 'op', v: c })
      i++
      continue
    }
    throw new ExprError(`Unexpected "${c}" at ${i + 1} in "${src}"`)
  }
  return out
}

/**
 * Compile a formula. `allowed` lists the variable and parameter names it may
 * use; any other name is an error (so a typo fails at load, not as NaN).
 */
export function compile(src: string, allowed: readonly string[]): Fn {
  if (typeof src !== 'string' || src.length > 2000) throw new ExprError('A formula must be a string of at most 2000 characters')
  const toks = lex(src)
  let p = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek()?.k === 'op' && peek().v === v
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`Expected "${v}" in "${src}"`)
    p++
  }
  const vars = new Set(allowed)

  function expr(): Fn {
    let a = term()
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v
      const l = a
      const r = term()
      a = op === '+' ? (s) => l(s) + r(s) : (s) => l(s) - r(s)
    }
    return a
  }
  function term(): Fn {
    let a = unary()
    while (isOp('*') || isOp('/')) {
      const op = toks[p++].v
      const l = a
      const r = unary()
      a = op === '*' ? (s) => l(s) * r(s) : (s) => l(s) / r(s)
    }
    return a
  }
  function unary(): Fn {
    if (isOp('-')) {
      p++
      const a = unary()
      return (s) => -a(s)
    }
    if (isOp('+')) {
      p++
      return unary()
    }
    return power()
  }
  function power(): Fn {
    const base = atom()
    if (isOp('^')) {
      p++
      const ex = unary()
      return (s) => Math.pow(base(s), ex(s))
    }
    return base
  }
  function atom(): Fn {
    const t = peek()
    if (!t) throw new ExprError(`Unexpected end of "${src}"`)
    if (t.k === 'num') {
      p++
      const v = t.v
      return () => v
    }
    if (t.k === 'name') {
      p++
      if (isOp('(')) {
        // Own names only: never `constructor`, `__proto__` or anything inherited.
        const f = Object.hasOwn(FUNCS, t.v) ? FUNCS[t.v] : undefined
        if (!f) throw new ExprError(`Unknown function "${t.v}" in "${src}"`)
        p++
        const args: Fn[] = []
        if (!isOp(')')) {
          args.push(expr())
          while (isOp(',')) {
            p++
            args.push(expr())
          }
        }
        expect(')')
        return (s) => f(...args.map((a) => a(s)))
      }
      if (Object.hasOwn(CONSTS, t.v)) {
        const v = CONSTS[t.v]
        return () => v
      }
      if (!vars.has(t.v)) throw new ExprError(`Unknown name "${t.v}" in "${src}" (allowed: ${[...vars].join(', ') || 'none'}, pi, e)`)
      const name = t.v
      return (s) => s[name]
    }
    if (isOp('(')) {
      p++
      const a = expr()
      expect(')')
      return a
    }
    throw new ExprError(`Unexpected "${t.v}" in "${src}"`)
  }

  const f = expr()
  if (p !== toks.length) throw new ExprError(`Unexpected "${toks[p].v}" in "${src}"`)
  return f
}
