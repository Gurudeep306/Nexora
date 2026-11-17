import type { Diag } from './diagnostics'

/*
  A live syntax check while typing, for every language the judge runs:
  brackets that are never closed, closed twice or closed by the wrong kind,
  strings that are never closed, and (Python) indentation that mixes tabs and
  spaces. It runs in the browser on every pause in typing, so it is a fast
  scanner, not a compiler.

  It must never cry wolf: brackets inside strings, comments, character
  literals ('{'), regex literals (/[(]/), raw strings (r"(", R"(…)"),
  template literals (`${a}`) and Lisp characters (#\( ) are skipped, and a
  language whose quoting is too irregular to scan safely (shell, Perl) gets
  only the Python-style indentation check when it applies — nothing else.
*/

type StrRule = { open: string; close: string; esc?: string; multiline: boolean; doubled?: boolean }
interface LangRules {
  line: string[]
  block: [string, string, boolean?][] // [open, close, nests]
  strings: StrRule[]
  /** How ' is used: a C-style character literal, a string, or nothing to check. */
  quote: 'char' | 'string' | 'ignore'
  brackets: string
  regex?: boolean
  template?: boolean // JS/TS backticks with ${…}
  rawRust?: boolean
  rawCpp?: boolean
  verbatimCs?: boolean
  lispChar?: '#\\' | '\\'
  haskellDash?: boolean
  luaLong?: boolean
  rubyChar?: boolean
}

const DQ: StrRule = { open: '"', close: '"', esc: '\\', multiline: false }
const SQ: StrRule = { open: "'", close: "'", esc: '\\', multiline: false }
const TDQ: StrRule = { open: '"""', close: '"""', esc: '\\', multiline: true }
const TSQ: StrRule = { open: "'''", close: "'''", esc: '\\', multiline: true }
const BT: StrRule = { open: '`', close: '`', multiline: true }

const C_LIKE: LangRules = { line: ['//'], block: [['/*', '*/']], strings: [DQ], quote: 'char', brackets: '()[]{}' }

const RULES: Record<string, LangRules> = {
  c: C_LIKE,
  cpp: { ...C_LIKE, rawCpp: true },
  objectivec: C_LIKE,
  java: { ...C_LIKE, strings: [TDQ, DQ] },
  csharp: { ...C_LIKE, verbatimCs: true, strings: [TDQ, DQ] },
  javascript: { ...C_LIKE, strings: [DQ, SQ], quote: 'string', regex: true, template: true },
  typescript: { ...C_LIKE, strings: [DQ, SQ], quote: 'string', regex: true, template: true },
  go: { ...C_LIKE, strings: [DQ, BT] },
  rust: { ...C_LIKE, block: [['/*', '*/', true]], rawRust: true },
  kotlin: { ...C_LIKE, strings: [TDQ, DQ] },
  swift: { ...C_LIKE, block: [['/*', '*/', true]], strings: [TDQ, DQ], quote: 'ignore' },
  scala: { ...C_LIKE, strings: [TDQ, DQ] },
  dart: { ...C_LIKE, strings: [TDQ, TSQ, DQ, SQ], quote: 'string' },
  groovy: { ...C_LIKE, strings: [TDQ, TSQ, DQ, SQ], quote: 'string' },
  php: { ...C_LIKE, line: ['//', '#'], strings: [DQ, SQ], quote: 'string' },
  d: { ...C_LIKE, block: [['/*', '*/'], ['/+', '+/', true]], strings: [DQ, BT] },
  zig: { ...C_LIKE, block: [] },
  python: { line: ['#'], block: [], strings: [TDQ, TSQ, DQ, SQ], quote: 'string', brackets: '()[]{}' },
  ruby: { line: ['#'], block: [['=begin', '=end']], strings: [DQ, SQ], quote: 'string', brackets: '()[]{}', regex: true, rubyChar: true },
  crystal: { line: ['#'], block: [], strings: [DQ], quote: 'char', brackets: '()[]{}' },
  lua: { line: ['--'], block: [], strings: [DQ, SQ], quote: 'string', brackets: '()[]{}', luaLong: true },
  haskell: { line: [], block: [['{-', '-}', true]], strings: [DQ], quote: 'ignore', brackets: '()[]{}', haskellDash: true },
  ocaml: { line: [], block: [['(*', '*)', true]], strings: [DQ], quote: 'ignore', brackets: '()[]{}' },
  fsharp: { line: ['//'], block: [['(*', '*)', true]], strings: [TDQ, DQ], quote: 'ignore', brackets: '()[]{}' },
  elixir: { line: ['#'], block: [], strings: [TDQ, DQ, SQ], quote: 'string', brackets: '()[]{}' },
  julia: { line: ['#'], block: [['#=', '=#', true]], strings: [TDQ, DQ], quote: 'ignore', brackets: '()[]{}' },
  nim: { line: ['#'], block: [['#[', ']#', true]], strings: [TDQ, DQ], quote: 'char', brackets: '()[]{}' },
  r: { line: ['#'], block: [], strings: [DQ, SQ], quote: 'string', brackets: '()[]{}' },
  pascal: { line: ['//'], block: [['{', '}'], ['(*', '*)']], strings: [{ open: "'", close: "'", multiline: false, doubled: true }], quote: 'ignore', brackets: '()[]' },
  commonlisp: { line: [';'], block: [['#|', '|#', true]], strings: [DQ], quote: 'ignore', brackets: '()', lispChar: '#\\' },
  scheme: { line: [';'], block: [['#|', '|#', true]], strings: [DQ], quote: 'ignore', brackets: '()[]', lispChar: '#\\' },
  clojure: { line: [';'], block: [], strings: [DQ], quote: 'ignore', brackets: '()[]{}', lispChar: '\\' },
}

const OPEN_OF: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
const NAME: Record<string, string> = { '(': 'parenthesis (', ')': 'parenthesis )', '[': 'bracket [', ']': 'bracket ]', '{': 'brace {', '}': 'brace }' }

/** Languages the bracket and string check runs for. */
export function syntaxChecked(lang: string): boolean {
  return lang in RULES
}

type Bracket = { ch: string; line: number; col: number }
interface Scan {
  brackets: Bracket[]
  strIssues: Diag[]
  /** Lines (1-based) that start inside a multi-line string or comment. */
  inside: Set<number>
}

/** Walk the code once: every bracket that is code (not text or comment), and the strings left open. */
function scan(code: string, lang: string, R: LangRules): Scan {
  const n = code.length
  const brackets: Bracket[] = []
  const inside = new Set<number>()
  let inToken = false
  let i = 0
  let line = 1
  let col = 1
  const strIssues: Diag[] = []
  let lastSig = '' // last non-space character outside strings/comments (for regex detection)

  const adv = (k = 1) => {
    for (let t = 0; t < k && i < n; t++) {
      if (code[i] === '\n') {
        line++
        col = 1
        if (inToken) inside.add(line)
      } else col++
      i++
    }
  }
  const at = (s: string) => code.startsWith(s, i)

  /** Skip a string from its opening; report it when it never closes. */
  const skipString = (r: StrRule) => {
    const sl = line
    const sc = col
    adv(r.open.length)
    while (i < n) {
      if (r.esc && code[i] === r.esc) {
        adv(2)
        continue
      }
      if (at(r.close)) {
        if (r.doubled && code.startsWith(r.close + r.close, i)) {
          adv(2 * r.close.length)
          continue
        }
        adv(r.close.length)
        return
      }
      if (!r.multiline && code[i] === '\n') break
      adv()
    }
    strIssues.push({ line: sl, column: sc, severity: 'warning', message: 'This string is never closed', hint: { label: 'String not closed', text: 'A quote opens text that never ends on this line. Add the closing quote.' } })
  }

  while (i < n) {
    inToken = true
    const ch = code[i]
    // Block comments (some nest).
    const blk = R.block.find(([o]) => at(o))
    if (blk) {
      const [o, c, nests] = blk
      adv(o.length)
      let depth = 1
      while (i < n && depth > 0) {
        if (nests && at(o)) {
          depth++
          adv(o.length)
        } else if (at(c)) {
          depth--
          adv(c.length)
        } else adv()
      }
      continue
    }
    // Lua long comments and strings: --[[ ]], --[==[ ]==], [[ ]].
    if (R.luaLong) {
      const m = /^(--)?\[(=*)\[/.exec(code.slice(i, i + 12))
      if (m) {
        const close = `]${m[2]}]`
        const end = code.indexOf(close, i + m[0].length)
        adv((end < 0 ? n : end + close.length) - i)
        continue
      }
    }
    // Haskell: a comment is two or more dashes not followed by another symbol (--> is an operator).
    if (R.haskellDash && at('--')) {
      let k = i
      while (code[k] === '-') k++
      if (!/[!#$%&*+./<=>?@\\^|~:]/.test(code[k] ?? '')) {
        while (i < n && code[i] !== '\n') adv()
        continue
      }
    }
    // Line comments.
    if (R.line.some((s) => at(s))) {
      while (i < n && code[i] !== '\n') adv()
      continue
    }
    // Raw strings: Rust r"…" / r#"…"#, C++ R"d(…)d", C# @"…" (with "" inside).
    if (R.rawRust && ch === 'r' && /^r(#*)"/.test(code.slice(i, i + 10)) && !/\w/.test(code[i - 1] ?? '')) {
      const hashes = /^r(#*)"/.exec(code.slice(i, i + 10))![1]
      const close = `"${hashes}`
      const end = code.indexOf(close, i + 2 + hashes.length)
      adv((end < 0 ? n : end + close.length) - i)
      continue
    }
    if (R.rawCpp && ch === 'R' && code[i + 1] === '"' && !/\w/.test(code[i - 1] ?? '')) {
      const m = /^R"([^(\s]{0,16})\(/.exec(code.slice(i, i + 24))
      if (m) {
        const close = `)${m[1]}"`
        const end = code.indexOf(close, i + m[0].length)
        adv((end < 0 ? n : end + close.length) - i)
        continue
      }
    }
    if (R.verbatimCs && (at('@"') || at('$@"') || at('@$"'))) {
      adv(code[i] === '@' && code[i + 1] === '"' ? 2 : 3)
      while (i < n) {
        if (at('""')) adv(2)
        else if (code[i] === '"') {
          adv()
          break
        } else adv()
      }
      continue
    }
    // JS/TS template literals: skip the text, count ${…} braces separately.
    if (R.template && ch === '`') {
      const sl = line
      const sc = col
      adv()
      let depth = 0
      let closed = false
      while (i < n) {
        if (code[i] === '\\') {
          adv(2)
          continue
        }
        if (depth === 0 && code[i] === '`') {
          adv()
          closed = true
          break
        }
        if (at('${')) {
          depth++
          adv(2)
          continue
        }
        if (depth > 0 && code[i] === '}') depth--
        adv()
      }
      if (!closed) strIssues.push({ line: sl, column: sc, severity: 'warning', message: 'This template string is never closed', hint: { label: 'String not closed', text: 'A backtick ` opens text that never ends. Add the closing backtick.' } })
      lastSig = '`'
      continue
    }
    // Lisp characters: #\( (Common Lisp, Scheme) and \( (Clojure).
    if (R.lispChar && at(R.lispChar)) {
      adv(R.lispChar.length + 1)
      continue
    }
    // Ruby character literals: ?( ?x.
    if (R.rubyChar && ch === '?' && /[\s(=,[]/.test(code[i - 1] ?? ' ') && code[i + 1] && !/\s/.test(code[i + 1]) && !/\w/.test(code[i + 2] ?? '')) {
      adv(2)
      continue
    }
    // Strings.
    const str = R.strings.find((r) => at(r.open))
    if (str) {
      skipString(str)
      lastSig = '"'
      continue
    }
    // ' as a character literal ('a', '\n', '{') — or a Rust lifetime / C++ digit separator, which are not.
    if (ch === "'" && R.quote === 'char') {
      if (/[0-9a-fA-F]/.test(code[i - 1] ?? '') && /[0-9a-fA-F]/.test(code[i + 1] ?? '') && lang === 'cpp') {
        adv()
        continue
      }
      const m = /^'(\\.[^']{0,8}|[^'\\\n])'/.exec(code.slice(i, i + 12))
      adv(m ? m[0].length : 1)
      lastSig = "'"
      continue
    }
    // Regex literals in JS/TS/Ruby: / after an operator or at the start.
    if (R.regex && ch === '/' && code[i + 1] !== '/' && code[i + 1] !== '*' && (lastSig === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(lastSig))) {
      let k = i + 1
      let inClass = false
      let ok = false
      while (k < n && code[k] !== '\n') {
        if (code[k] === '\\') {
          k += 2
          continue
        }
        if (code[k] === '[') inClass = true
        else if (code[k] === ']') inClass = false
        else if (code[k] === '/' && !inClass) {
          ok = true
          break
        }
        k++
      }
      if (ok) {
        adv(k + 1 - i)
        lastSig = '/'
        continue
      }
    }
    // Code from here on.
    inToken = false
    if (R.brackets.includes(ch)) brackets.push({ ch, line, col })
    if (!/\s/.test(ch)) lastSig = ch
    adv()
  }
  return { brackets, strIssues, inside }
}

export function checkSyntax(code: string, lang: string): Diag[] {
  const out: Diag[] = []
  if (lang === 'python') out.push(...mixedIndent(code))
  const R = RULES[lang]
  if (!R || code.length > 200_000) return out
  const { brackets, strIssues } = scan(code, lang, R)
  const stack: Bracket[] = []
  let bracketIssue: Diag | null = null
  for (const { ch, line, col } of brackets) {
    {
      if ('([{'.includes(ch)) stack.push({ ch, line, col })
      else {
        const top = stack[stack.length - 1]
        if (!top) {
          bracketIssue ||= {
            line,
            column: col,
            severity: 'warning',
            message: `This ${NAME[ch]} has nothing to close`,
            hint: { label: 'Brackets', text: `There is one ${ch} too many here, or an opening ${OPEN_OF[ch]} is missing before it.` },
          }
        } else if (top.ch !== OPEN_OF[ch]) {
          bracketIssue ||= {
            line,
            column: col,
            severity: 'warning',
            message: `This ${ch} closes the ${NAME[top.ch]} from line ${top.line}`,
            hint: { label: 'Brackets', text: `The ${top.ch} on line ${top.line} is closed by a ${ch}. One of them is the wrong kind, or one is missing.` },
          }
          stack.pop()
        } else stack.pop()
      }
    }
  }
  if (!bracketIssue && stack.length) {
    const o = stack[stack.length - 1]
    bracketIssue = {
      line: o.line,
      column: o.col,
      severity: 'warning',
      message: `This ${NAME[o.ch]} is never closed`,
      hint: { label: 'Brackets', text: `The ${o.ch} here has no matching closing bracket. Add it where this part ends.` },
    }
  }
  if (bracketIssue) out.push(bracketIssue)
  out.push(...strIssues.slice(0, 3))
  return out
}

/** Python: tabs and spaces mixed in the indentation. */
function mixedIndent(code: string): Diag[] {
  let first: 'tab' | 'space' | null = null
  const lines = code.split('\n')
  for (let k = 0; k < lines.length; k++) {
    const lead = /^[ \t]*/.exec(lines[k])![0]
    if (!lead || !lines[k].trim()) continue
    const kind = lead.includes('\t') ? (lead.includes(' ') ? 'both' : 'tab') : 'space'
    if (kind === 'both' || (first && kind !== first)) {
      return [
        {
          line: k + 1,
          column: 1,
          severity: 'warning',
          message: kind === 'both' ? 'This line is indented with both tabs and spaces' : `This line is indented with ${kind === 'tab' ? 'tabs' : 'spaces'}, the lines above with ${first === 'tab' ? 'tabs' : 'spaces'}`,
          hint: { label: 'Indentation', text: 'Python reads the spaces at the start of a line. Use 4 spaces per level everywhere, never tabs and spaces mixed.' },
        },
      ]
    }
    first ||= kind as 'tab' | 'space'
  }
  return []
}

/* ── Format: re-indent brace languages; tidy the rest ── */

/** Languages whose blocks are braces, so indentation can be rebuilt from them. */
const BRACE_LANGS = new Set(['c', 'cpp', 'objectivec', 'java', 'csharp', 'javascript', 'typescript', 'go', 'rust', 'kotlin', 'swift', 'scala', 'dart', 'groovy', 'php', 'd', 'zig'])
/** Go and Swift put `case` at the switch's own level (gofmt, the Swift guide). */
const CASE_AT_SWITCH = new Set(['go', 'swift'])

export type FormatKind = 'indent' | 'trim'
export function formatKind(lang: string): FormatKind {
  return BRACE_LANGS.has(lang) ? 'indent' : 'trim'
}

/**
 * Re-indent a brace language by its bracket depth (strings and comments that
 * span lines are left exactly as written), and trim trailing spaces. Other
 * languages only get trailing spaces trimmed: in Python, Haskell and the like
 * the indentation is part of the program.
 */
export function formatCode(code: string, lang: string, unit = '    '): string {
  const src = code.replace(/\r\n?/g, '\n')
  const lines = src.split('\n')
  const R = RULES[lang]
  // Lines inside a multi-line string keep every character, trailing spaces too.
  const keep = R ? scan(src, lang, R).inside : new Set<number>()
  if (!BRACE_LANGS.has(lang) || !R) return tidyEnd(lines, keep)
  const ind = lang === 'go' ? '\t' : unit
  const { brackets, inside } = scan(src, lang, R)
  // Depth at the start of each line, and the closers each line starts with.
  const byLine = new Map<number, Bracket[]>()
  for (const b of brackets) {
    const list = byLine.get(b.line) ?? []
    list.push(b)
    byLine.set(b.line, list)
  }
  const out: string[] = []
  let depth = 0
  let caseLevel = -1
  let prevCode = ''
  for (let k = 0; k < lines.length; k++) {
    const ln = k + 1
    const raw = lines[k]
    const here = byLine.get(ln) ?? []
    const startDepth = depth
    for (const b of here) depth = Math.max(0, depth + ('([{'.includes(b.ch) ? 1 : -1))
    if (inside.has(ln)) {
      out.push(raw) // inside a multi-line string or comment: exactly as written
      continue
    }
    const text = raw.trim()
    if (!text) {
      out.push('')
      continue
    }
    if (/^#/.test(text) && (lang === 'c' || lang === 'cpp' || lang === 'objectivec')) {
      out.push(text) // preprocessor lines stay at the margin
      continue
    }
    let lead = 0
    while (lead < text.length && ')]}'.includes(text[lead])) lead++
    let level = Math.max(0, startDepth - lead)
    const isCase = /^(case\b.*:|default\s*:)/.test(text)
    if (caseLevel >= 0 && startDepth < caseLevel) caseLevel = -1
    if (isCase) {
      caseLevel = startDepth
      if (CASE_AT_SWITCH.has(lang)) level = Math.max(0, level - 1)
    } else if (caseLevel >= 0 && startDepth === caseLevel && lead === 0 && !CASE_AT_SWITCH.has(lang)) {
      level++ // the statements of a case sit one level in
    }
    if ((lang === 'cpp' || lang === 'objectivec') && /^(public|private|protected)\s*:/.test(text)) level = Math.max(0, level - 1)
    // A chained call or a continued condition: one level in from the line above.
    if (/^(\.|&&|\|\||\?)/.test(text) && prevCode && !/[;{}]$/.test(prevCode)) level++
    out.push(ind.repeat(level) + text)
    prevCode = text.replace(/\/\/.*$/, '').trim()
  }
  return tidyEnd(out, inside)
}

/** No trailing spaces (except inside multi-line strings), and one newline at the end. */
function tidyEnd(lines: string[], keep: Set<number>): string {
  const out = lines.map((l, k) => (keep.has(k + 1) ? l : l.replace(/[ \t]+$/, '')))
  while (out.length > 1 && out[out.length - 1] === '') out.pop()
  return `${out.join('\n')}\n`
}
