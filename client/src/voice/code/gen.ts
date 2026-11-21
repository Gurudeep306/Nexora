/*
  Code by voice, lane C: turn a parsed edit into exact code for the editor's
  language, rename safely, and describe code aloud. No AI, no guessing: a
  language we have no template for gets an honest "not yet" instead.

  Pure and type-strippable (tests/voice-code.test.js).
*/
import type { Insert } from './parse.ts'

type Family = 'c' | 'java' | 'csharp' | 'js' | 'go' | 'rust' | 'kotlin' | 'swift' | 'python' | 'ruby'

const FAMILY: Record<string, Family> = {
  c: 'c', cpp: 'c', objectivec: 'c', d: 'c',
  java: 'java', groovy: 'java', scala: 'java',
  csharp: 'csharp',
  javascript: 'js', typescript: 'js', dart: 'js',
  go: 'go', rust: 'rust', kotlin: 'kotlin', swift: 'swift',
  python: 'python', python3: 'python', pypy: 'python', nim: 'python',
  ruby: 'ruby', crystal: 'ruby',
}

export function familyOf(lang: string): Family | null {
  return FAMILY[lang] ?? null
}

/** Languages without braces use indentation (or `end`) for blocks. */
export function opensBlock(lineText: string, lang: string): boolean {
  const t = lineText.replace(/\s+$/, '')
  const f = familyOf(lang)
  if (f === 'python') return t.endsWith(':')
  if (f === 'ruby') return /\b(do|then)\s*(\|[^|]*\|)?$/.test(t) || /^\s*(def|if|while|unless|until|class|module)\b/.test(t)
  return t.endsWith('{')
}

export interface Snippet {
  /** Lines without the base indent; `\t` marks one indent unit. */
  lines: string[]
  /** Which line (0-based) the cursor goes to afterwards. */
  cursorLine: number
}

/**
 * The code for one spoken insert, or null when the language has no template.
 * In C, print assumes an int (`%d`): the note says so.
 */
export function snippet(ins: Insert, lang: string): Snippet | null {
  const f = familyOf(lang)
  if (!f) return null
  const block = (head: string): Snippet => {
    if (f === 'python') return { lines: [head + ':', '\tpass'], cursorLine: 1 }
    if (f === 'ruby') return { lines: [head, '\t', 'end'], cursorLine: 1 }
    return { lines: [head + ' {', '\t', '}'], cursorLine: 1 }
  }
  const semi = f === 'python' || f === 'ruby' || f === 'go' || f === 'kotlin' || f === 'swift' ? '' : ';'
  switch (ins.what) {
    case 'for': {
      const { v, from: a, to: b } = ins
      const cmp = ins.inclusive ? '<=' : '<'
      if (f === 'python') return block(`for ${v} in range(${a}, ${ins.inclusive ? `${b} + 1` : b})`)
      if (f === 'ruby') return block(`(${a}${ins.inclusive ? '..' : '...'}${b}).each do |${v}|`)
      if (f === 'go') return block(`for ${v} := ${a}; ${v} ${cmp} ${b}; ${v}++`)
      if (f === 'rust') return block(`for ${v} in ${a}..${ins.inclusive ? '=' : ''}${b}`)
      if (f === 'kotlin') return block(`for (${v} in ${a}${ins.inclusive ? '..' : ' until '}${b})`)
      if (f === 'swift') return block(`for ${v} in ${a}${ins.inclusive ? '...' : '..<'}${b}`)
      const decl = f === 'js' ? 'let' : 'int'
      return block(`for (${decl} ${v} = ${a}; ${v} ${cmp} ${b}; ${v}++)`)
    }
    case 'while': {
      const c = pyCond(ins.cond, f)
      if (f === 'python') return block(`while ${c}`)
      if (f === 'ruby') return { lines: [`while ${c}`, '\t', 'end'], cursorLine: 1 }
      if (f === 'go' || f === 'rust' || f === 'swift') return block(`${f === 'go' ? 'for' : 'while'} ${c}`)
      return block(`while (${c})`)
    }
    case 'if': {
      const c = pyCond(ins.cond, f)
      if (f === 'python') return block(`if ${c}`)
      if (f === 'ruby') return { lines: [`if ${c}`, '\t', 'end'], cursorLine: 1 }
      if (f === 'go' || f === 'rust' || f === 'swift') return block(`if ${c}`)
      return block(`if (${c})`)
    }
    case 'print': {
      const e = ins.expr
      const line =
        f === 'python' ? `print(${e})`
        : f === 'ruby' ? `puts ${e}`
        : f === 'go' ? `fmt.Println(${e})`
        : f === 'rust' ? `println!("{}", ${e});`
        : f === 'kotlin' ? `println(${e})`
        : f === 'swift' ? `print(${e})`
        : f === 'js' ? `console.log(${e});`
        : f === 'java' ? `System.out.println(${e});`
        : f === 'csharp' ? `Console.WriteLine(${e});`
        : lang === 'c' ? `printf("%d\\n", ${e});`
        : `cout << ${e} << '\\n';`
      return { lines: [line], cursorLine: 0 }
    }
    case 'return':
      return { lines: [`return ${pyCond(ins.expr, f)}${semi}`], cursorLine: 0 }
  }
}

/** Python and Ruby spell && || ! as words. */
function pyCond(c: string, f: Family): string {
  if (f !== 'python' && f !== 'ruby') return c
  return c.replace(/&&/g, 'and').replace(/\|\|/g, 'or').replace(/!(?!=)/g, 'not ')
}

/* ── Rename ──────────────────────────────────────────────────────────── */

const HASH_COMMENTS = new Set(['python', 'ruby'])

/**
 * Rename an identifier everywhere it is code: not inside strings or comments,
 * not as part of a longer name, not after a dot (a field of something else).
 * Returns the new text and how many places changed; `clash` when the new
 * name is already used (nothing is changed then).
 */
export function renameInCode(text: string, from: string, to: string, lang: string): { text: string; count: number; clash: boolean } {
  const hash = HASH_COMMENTS.has(familyOf(lang) ?? '')
  const spans: [number, number][] = [] // code spans
  let i = 0
  let start = 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    const c2 = text.slice(i, i + 2)
    let end = -1
    if (c2 === '//' && !hash) end = text.indexOf('\n', i)
    else if (c === '#' && hash) end = text.indexOf('\n', i)
    else if (c2 === '/*' && !hash) {
      end = text.indexOf('*/', i + 2)
      end = end < 0 ? n : end + 2
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < n && text[j] !== c && !(text[j] === '\n' && c !== '`')) j += text[j] === '\\' ? 2 : 1
      end = Math.min(n, j + 1)
    }
    if (end !== -1) {
      if (end < 0) end = n
      spans.push([start, i])
      start = end
      i = end
    } else i++
  }
  spans.push([start, n])
  const word = new RegExp(`(?<![\\w$.])${from.replace(/[$]/g, '\\$')}(?![\\w$])`, 'g')
  const used = new RegExp(`(?<![\\w$])${to.replace(/[$]/g, '\\$')}(?![\\w$])`)
  if (spans.some(([a, b]) => used.test(text.slice(a, b)))) return { text, count: 0, clash: true }
  let count = 0
  let out = ''
  let last = 0
  for (const [a, b] of spans) {
    out += text.slice(last, a)
    out += text.slice(a, b).replace(word, () => {
      count++
      return to
    })
    last = b
  }
  out += text.slice(last)
  return { text: out, count, clash: false }
}

/* ── Saying code aloud ───────────────────────────────────────────────── */

const SAY_OPS: [RegExp, string][] = [
  [/<=/g, ' less than or equal to '],
  [/>=/g, ' greater than or equal to '],
  [/==/g, ' equals '],
  [/!=/g, ' not equal to '],
  [/\+\+/g, ' plus plus '],
  [/--/g, ' minus minus '],
  [/&&/g, ' and '],
  [/\|\|/g, ' or '],
  [/<</g, ' '],
  [/>>/g, ' '],
  [/</g, ' less than '],
  [/>/g, ' greater than '],
  [/\+=/g, ' plus equals '],
  [/-=/g, ' minus equals '],
  [/=/g, ' gets '],
  [/\+/g, ' plus '],
  [/(?<=\s|\w)-(?=\s|\w)/g, ' minus '],
  [/\*/g, ' times '],
  [/%/g, ' mod '],
  [/\[([^\]]+)\]/g, ' of $1 '],
  [/[{}();,]/g, ' '],
]

/** A line of code in words a speech voice reads well. */
export function sayLine(line: string): string {
  let s = line.trim()
  if (!s) return ''
  for (const [re, to] of SAY_OPS) s = s.replace(re, to)
  return s.replace(/\s+/g, ' ').trim()
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const count = (k: number, one: string, many: string) => `${k < 10 ? NUMBER_WORDS[k] : k} ${k === 1 ? one : many}`

/**
 * Summary first ("a loop from 0 to n−1 with an if inside"), lines only when
 * asked. Built from the code's shape: functions, loops, nesting, checks.
 */
export function summarize(text: string, lang: string): string {
  const f = familyOf(lang)
  const lines = text.split('\n')
  const code = lines.filter((l) => l.trim() && !/^\s*(\/\/|#(?!include)|\/\*|\*)/.test(l))
  if (!code.length) return 'The editor is empty.'
  const indent = (l: string) => (l.match(/^\s*/)?.[0] ?? '').replace(/\t/g, '    ').length
  const fnRe =
    f === 'python' ? /^\s*def\s+(\w+)/
    : f === 'ruby' ? /^\s*def\s+(\w+)/
    : f === 'go' ? /^\s*func\s+(?:\([^)]*\)\s*)?(\w+)/
    : f === 'rust' ? /^\s*(?:pub\s+)?fn\s+(\w+)/
    : f === 'kotlin' ? /^\s*fun\s+(\w+)/
    : f === 'swift' ? /^\s*func\s+(\w+)/
    : f === 'js' ? /^\s*(?:async\s+)?function\s+(\w+)|^\s*(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/
    : /^\s*(?:[\w:<>,*&\s]+?)\s+(\w+)\s*\([^;]*\)\s*(?:const\s*)?\{?\s*$/
  const fns: string[] = []
  const loops: { depth: number; nested: boolean }[] = []
  let ifs = 0
  const open: number[] = [] // indents of loops still open
  for (const l of code) {
    const d = indent(l)
    while (open.length && d <= open[open.length - 1]) open.pop()
    const t = l.trim()
    const fm = l.match(fnRe)
    if (fm && !/^\s*(if|for|while|switch|return|else)\b/.test(l)) fns.push(fm[1] ?? fm[2])
    if (/^(for|while)\b|\.each\b|\.forEach\(/.test(t)) {
      loops.push({ depth: open.length, nested: open.length > 0 })
      open.push(d)
    }
    if (/^(if|elif|else if|\} else if)\b/.test(t)) ifs++
  }
  const parts: string[] = [`${code.length} lines of code.`]
  if (fns.length) parts.push(fns.length === 1 ? `One function, ${fns[0]}.` : `${count(fns.length, 'function', 'functions')}: ${fns.slice(0, 4).join(', ')}.`)
  if (loops.length) {
    const nested = loops.filter((x) => x.nested).length
    const head = count(loops.length, 'loop', 'loops')
    parts.push(nested ? `${head}, ${nested === 1 ? 'one is' : `${count(nested, '', '').trim()} are`} nested inside another.` : `${head}, none nested.`)
  } else parts.push('No loops.')
  if (ifs) parts.push(`${count(ifs, 'if check', 'if checks')}.`)
  parts.push('Say “read line” and a number to hear one line.')
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(' ')
}
