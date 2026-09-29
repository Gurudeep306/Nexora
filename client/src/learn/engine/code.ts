import type { Lang } from './types'

export interface ParsedCode {
  lines: string[]
  /** step id → 0-based line indexes */
  steps: Map<string, number[]>
}

const MARK = /\s*(?:\/\/|#|--)\s*@([\w,.-]+)\s*$/
/** A marker after a real comment: `x = 1   // 1 op   @init` keeps "// 1 op". */
const MARK_NOTE = /(\/\/|#)(\s*)([^@]*?\S)\s+@([\w,.-]+)\s*$/

/**
 * Code is authored with trailing step markers, e.g.
 *   `if (a[j] < a[best]) best = j;   // @compare`
 * The marker is stripped from what the learner sees and remembered as
 * "this line belongs to step compare". A line may carry several steps
 * (`@compare,swap`), and a step may span several lines.
 */
export function parseCode(src: string): ParsedCode {
  const raw = src.replace(/^\n+|\s+$/g, '').split('\n')
  const lines: string[] = []
  const steps = new Map<string, number[]>()
  raw.forEach((line, i) => {
    const m = MARK.exec(line)
    const n = m ? null : MARK_NOTE.exec(line)
    if (m) {
      for (const s of m[1].split(',')) steps.set(s, [...(steps.get(s) ?? []), i])
      lines.push(line.slice(0, m.index).replace(/\s+$/, ''))
    } else if (n) {
      for (const s of n[4].split(',')) steps.set(s, [...(steps.get(s) ?? []), i])
      lines.push(line.slice(0, n.index) + n[1] + n[2] + n[3])
    } else lines.push(line)
  })
  return { lines, steps }
}

const cache = new Map<string, ParsedCode>()
export function parsed(src: string): ParsedCode {
  let p = cache.get(src)
  if (!p) {
    p = parseCode(src)
    cache.set(src, p)
  }
  return p
}

/* ── A tiny, dependable syntax highlighter (keywords, strings, numbers, comments) ── */

const KW: Record<Lang, string[]> = {
  pseudo: ['function', 'for', 'to', 'downto', 'while', 'do', 'if', 'else', 'then', 'return', 'and', 'or', 'not', 'end', 'each', 'in', 'step', 'swap', 'break', 'continue', 'true', 'false'],
  cpp: ['int', 'long', 'void', 'for', 'while', 'if', 'else', 'return', 'auto', 'const', 'vector', 'std', 'using', 'namespace', 'bool', 'true', 'false', 'break', 'continue', 'size_t', 'include', 'string', 'double', 'swap', 'new', 'delete', 'nullptr', 'struct', 'class', 'template', 'typename', 'unordered_map', 'cin', 'cout', 'main'],
  java: ['int', 'long', 'void', 'for', 'while', 'if', 'else', 'return', 'public', 'static', 'class', 'new', 'boolean', 'true', 'false', 'break', 'continue', 'final', 'private', 'import', 'String', 'double', 'null', 'HashMap', 'Map', 'ArrayList', 'List'],
  python: ['def', 'for', 'in', 'range', 'while', 'if', 'elif', 'else', 'return', 'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue', 'len', 'import', 'from', 'class', 'lambda', 'print', 'self'],
  js: ['function', 'for', 'while', 'if', 'else', 'return', 'const', 'let', 'var', 'of', 'in', 'true', 'false', 'null', 'undefined', 'break', 'continue', 'new', 'class', 'Map', 'Math'],
  c: ['int', 'long', 'void', 'for', 'while', 'if', 'else', 'return', 'const', 'struct', 'sizeof', 'malloc', 'free', 'realloc', 'include', 'break', 'continue', 'NULL', 'bool', 'true', 'false', 'size_t', 'printf', 'scanf', 'main'],
}

export interface Tok {
  t: string
  k?: 'kw' | 'str' | 'num' | 'com' | 'fn'
}

export function tokenize(line: string, lang: Lang): Tok[] {
  const kws = new Set(KW[lang])
  const out: Tok[] = []
  const comment = lang === 'python' ? '#' : lang === 'pseudo' ? '//' : '//'
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|(\s+)|(.)/g
  const ci = line.indexOf(comment)
  const code = ci >= 0 ? line.slice(0, ci) : line
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    if (m[1]) out.push({ t: m[1], k: 'str' })
    else if (m[2]) out.push({ t: m[2], k: 'num' })
    else if (m[3]) out.push({ t: m[3], k: kws.has(m[3]) ? 'kw' : 'fn' })
    else if (m[4]) out.push({ t: m[4], k: kws.has(m[4]) ? 'kw' : undefined })
    else out.push({ t: m[0] })
  }
  if (ci >= 0) out.push({ t: line.slice(ci), k: 'com' })
  return out
}
