export interface Diag {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
  /** A plain-English "what it means", when the error is a common one. */
  hint?: { label: string; text: string }
}

/*
  Pulls the student's own line out of every runner's error format, so the
  editor can mark the exact line, and adds a plain-English "what it means"
  for the common errors. Formats (checked against real output from Wandbox,
  Compiler Explorer, Paiza.io, the Kotlin Playground and our own runners;
  tests/fixtures/diagnostics-real.json):

    gcc / clang / Go / Kotlin / Swift / Haskell / Lua / Ruby   file:L:C: …  or  file:L: …
    javac                                                       file:L: error: …
    Rust                                                        --> file:L:C   and   panicked at file:L:C:
    C# / TypeScript / F#                                        file(L,C): error …
    D / Nim / Pascal                                            file(L): …   file(L,C) Error: …
    Python                                                      File "…", line L
    PHP                                                         … in file on line L
    Perl                                                        … at file line L.
    OCaml                                                       File "…", line L, characters a-b:
    Crystal                                                     In file:L:C
    Groovy                                                      @ line L, column C.
    Scheme                                                      … at line L
    Node                                                        file:L (first line)  and  at … (file:L:C)
    Java / Kotlin stack                                         (Main.java:L)  (File.kt:L)
    C# stack                                                    in file:line L

  Only the student's own file counts (<source>, prog.*, Main.*, main.*,
  example.*, File.kt, Solution.*, arena_*), never a library or system header.
*/

const STUDENT_NAME = /^(?:<source>|(?:prog|Main|main|example|File|Solution|solution|arena_[\w-]+)(?:\.[A-Za-z0-9]+)?)$/
const NOT_STUDENT = /\/(?:include|lib|lib64|site-packages|dist-packages|node_modules|usr|opt)\/|^node:|internal\//

/** Is this path the student's own file? */
export function isStudentFile(path: string): boolean {
  const p = path.trim().replace(/^["']|["']$/g, '')
  if (!p || NOT_STUDENT.test(p)) return false
  const base = p.split('/').pop() ?? p
  return STUDENT_NAME.test(base)
}

/* A path in an error message: <source>, or a run of path characters with an extension. */
const PATH = String.raw`(<source>|(?:[A-Za-z]:)?[\w./\\-]*?[\w-]+\.[A-Za-z0-9]+)`

/** Swift's crash report: "Program crashed: Illegal instruction" and the function it stopped in. */
function swiftCrash(text: string): string | null {
  const why = text.match(/\*\*\* Program crashed: (.+?) at 0x/)?.[1]
  if (!why) return null
  const where = text.match(/^\s*0 .*?0x[0-9a-f]+ (?:specialized )?(.+?) in \S+ at /m)?.[1]
  return where ? `Crashed in ${where} (${why})` : `Crashed: ${why}`
}

/** The runtime error's own one-line summary (the exception and its message). */
function runtimeSummary(text: string): string | null {
  const pick = (re: RegExp, i = 1) => {
    const m = text.match(re)
    return m ? m[i].trim() : null
  }
  // Python: the last line of the traceback.
  const py = [...text.matchAll(/^(\w+(?:Error|Exception|Warning|Exit|Interrupt|Iteration))(?::\s*(.*))?$/gm)].pop()
  if (py) return py[2] ? `${py[1]}: ${py[2]}` : py[1]
  return (
    pick(/Exception in thread "[^"]+" (?:[\w$]+\.)*([\w$]+(?:Exception|Error)(?::[^\n]*)?)/) ??
    pick(/^\s*(?:java|kotlin)\.(?:[\w$]+\.)*([\w$]+(?:Exception|Error)(?::[^\n]*)?)/m) ??
    pick(/Unhandled exception\.\s*(?:System\.)?(?:[\w]+\.)*([\w]+Exception(?::[^\n]*)?)/) ??
    pick(/^panic: ([^\n]+)/m) ??
    pick(/panicked at [^\n]*:\n([^\n]+)/) ??
    pick(/^(?:Fatal error|Swift\/[\w.]+:\d+: Fatal error): ([^\n]+)/m) ??
    swiftCrash(text) ??
    pick(/terminate called after throwing an instance of '([^']+)'(?:\n\s*what\(\):\s*([^\n]+))?/) ??
    pick(/^\S+: ((?:Prelude\.)?[\w.]+: [^\n]+)/m) ??
    null
  )
}

export function parseDiagnostics(text: string, language?: string): Diag[] {
  if (!text) return []
  const out: Diag[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')
  const summary = runtimeSummary(text)
  const push = (line: number, column: number, message: string, severity: Diag['severity'] = 'error') => {
    if (!Number.isFinite(line) || line < 1) return
    const msg = message.replace(/\s+/g, ' ').trim().slice(0, 240) || 'Error here'
    const key = `${line}:${msg}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ line, column: Math.max(1, column || 1), message: msg, severity })
  }
  /** The message on a line, else the next line that says something (rustc, GHC, Haskell put it there). */
  const messageAt = (i: number, rest: string) => {
    let m = rest.replace(/^\s*(?:(?:fatal )?error|warning|note|Error|Warning)(?:\[[\w-]+\])?:?\s*/, '').trim()
    if (/^\[?[A-Z]+-?\d+\]?$/.test(m)) m = ''
    if (!m) {
      const next = lines.slice(i + 1, i + 7)
      // An "Error: …" line below (OCaml, Crystal) is the message; else the first line that says something.
      const err = next.find((x) => /^\s*(?:Error|error)\b:?/.test(x))
      const say = err ?? next.find((x) => x.trim() && !/^\s*\d* *\|/.test(x) && !/^[\s^~|`-]*$/.test(x))
      if (say) return say.replace(/^\s*[*•]\s*/, '').replace(/^\s*(?:Error|error)(?:\[[\w-]+\])?:\s*/, '').trim()
    }
    return m
  }
  const sev = (s: string) => (/warning|note/i.test(s) ? 'warning' : 'error')

  lines.forEach((raw, i) => {
    const l = raw.replace(/\r$/, '')
    let m: RegExpMatchArray | null

    // Rust compile errors: "error[E0308]: mismatched types" then " --> prog.rs:2:16".
    if ((m = l.match(new RegExp(String.raw`^\s*-->\s*${PATH}:(\d+):(\d+)`))) && isStudentFile(m[1])) {
      const head = [...lines.slice(Math.max(0, i - 3), i)].reverse().find((x) => /^(error|warning)/.test(x)) ?? 'error'
      push(+m[2], +m[3], head.replace(/^(error|warning)(\[\w+\])?:\s*/, ''), sev(head))
      return
    }
    // Rust panics: "thread 'main' panicked at /app/example.rs:4:18:" then the message.
    if ((m = l.match(new RegExp(String.raw`panicked at ${PATH}:(\d+):(\d+)`))) && isStudentFile(m[1])) {
      push(+m[2], +m[3], lines[i + 1]?.trim() || summary || 'The program panicked here')
      return
    }
    // C# / TypeScript / F# / D / Nim / Pascal: file(L,C): error …   file(L): …
    if ((m = l.match(new RegExp(String.raw`${PATH}\((\d+)(?:,(\d+))?\)\s*:?\s*(.*)`))) && isStudentFile(m[1])) {
      push(+m[2], +(m[3] || 1), messageAt(i, m[4].replace(/^(?:error|warning|Error|Warning|Fatal)\s+\w*\d*:?\s*/i, '')), sev(m[4]))
      return
    }
    // C# stack: "at P.Main() in /app/example.cs:line 2"
    if ((m = l.match(new RegExp(String.raw`\bin ${PATH}:line (\d+)`))) && isStudentFile(m[1])) {
      push(+m[2], 1, summary ?? 'The program stopped here')
      return
    }
    // Java / Kotlin stack: "at Main.main(Main.java:4)"
    if ((m = l.match(new RegExp(String.raw`\(${PATH}:(\d+)\)`))) && isStudentFile(m[1])) {
      push(+m[2], 1, summary ?? 'The program stopped here')
      return
    }
    // Node stack frame: "at Object.<anonymous> (/workspace/Main.js:2:15)"
    if ((m = l.match(new RegExp(String.raw`\(${PATH}:(\d+):(\d+)\)`))) && isStudentFile(m[1])) {
      push(+m[2], +m[3], summary ?? 'The program stopped here')
      return
    }
    // Python and OCaml: File "<source>", line 12[, characters 4-9]
    if ((m = l.match(/File "([^"]+)", line (\d+)(?:, characters (\d+))?/)) && isStudentFile(m[1])) {
      const isOcaml = m[3] !== undefined
      const msg = isOcaml ? messageAt(i, '') : summary ?? 'Error here'
      push(+m[2], isOcaml ? +m[3] + 1 : 1, msg)
      return
    }
    // PHP: "… in /workspace/Main.php on line 2"
    if ((m = l.match(new RegExp(String.raw`^(?:PHP )?(.*?) in ${PATH} on line (\d+)`))) && isStudentFile(m[2])) {
      push(+m[3], 1, m[1].replace(/^(?:PHP )?(?:Parse error|Fatal error|Warning|Notice):\s*/i, ''), sev(m[1]))
      return
    }
    // Perl: "Illegal division by zero at <source> line 2."
    if ((m = l.match(new RegExp(String.raw`^(.*?) at ${PATH} line (\d+)`))) && isStudentFile(m[2])) {
      push(+m[3], 1, m[1])
      return
    }
    // Crystal: "In prog.cr:3:5" then "Error: …"
    if ((m = l.match(new RegExp(String.raw`^In ${PATH}:(\d+):(\d+)`))) && isStudentFile(m[1])) {
      push(+m[2], +m[3], messageAt(i, ''))
      return
    }
    // Swift backtrace frame: "main + 176 in output.s at /app/example.swift:3:8"
    if ((m = l.match(new RegExp(String.raw`\bin \S+ at ${PATH}:(\d+):(\d+)\s*$`))) && isStudentFile(m[1])) {
      push(+m[2], +m[3], summary ?? 'The program crashed here')
      return
    }
    // Go panic stack: "\t./example.go:6 +0x17"; Haskell: "head, called at /app/example.hs:1:15 in main:Main"
    if ((m = l.match(new RegExp(String.raw`^\s+${PATH}:(\d+) \+0x`))) && isStudentFile(m[1])) {
      push(+m[2], 1, summary ?? 'The program stopped here')
      return
    }
    if ((m = l.match(new RegExp(String.raw`called at ${PATH}:(\d+):(\d+)`))) && isStudentFile(m[1])) {
      push(+m[2], +m[3], summary ?? 'The program stopped here')
      return
    }
    // gcc / clang / javac / Go / Kotlin / Swift / GHC / Lua / Ruby / Node's first line: file:L(:C)?(: message)?
    if ((m = l.match(new RegExp(String.raw`(?:^|[\s:'"(])${PATH}:(\d+)(?::(\d+))?(?::|$)\s*(.*)$`))) && isStudentFile(m[1])) {
      // A traceback frame ("<source>:2: in main chunk") repeats a line already reported.
      if (/^in (?:main chunk|function|local|upvalue|method|field|\?)/.test(m[4]) && out.some((d) => d.line === +m![2])) return
      const rest = m[4].replace(/^in [`'][^'`]*['`]:\s*/, '')
      // Node prints "file:L" and then the faulty line; the error is further down.
      const msg = rest ? messageAt(i, rest) : summary ?? messageAt(i, '')
      if (/^\s*note:/.test(rest)) return
      push(+m[2], +(m[3] || 1), msg, sev(rest))
      return
    }
    // Groovy: "@ line 3, column 5."
    if ((m = l.match(/@ line (\d+), column (\d+)/))) {
      push(+m[1], +m[2], lines.slice(Math.max(0, i - 1), i + 1).join(' ').replace(/@ line.*$/, ''))
      return
    }
  })

  // Ruby's newer parser: "<source>: --> <source>", the message, then "> 3  end" excerpts.
  if (out.length === 0 && /^<source>: --> <source>/m.test(text)) {
    const msg = lines.find((x) => x.trim() && !/^(?:<source>|>|\s*\^|\s*$)/.test(x))?.trim() ?? 'Syntax error'
    const at = [...text.matchAll(/^>\s*(\d+)\s/gm)].pop()
    if (at) push(+at[1], 1, msg)
  }

  // Last resort: "line 12" (Scheme and the rest).
  if (out.length === 0) {
    for (const m of text.matchAll(/\bline (\d+)\b/gi)) push(+m[1], 1, summary ?? 'Error reported near here')
  }

  for (const d of out) {
    const h = explainError(`${d.message}\n${summary ?? ''}`, language)
    if (h) d.hint = h
  }
  return out.slice(0, 40)
}

/* ── What it means ── */

type Rule = { re: RegExp; label: string; text: string; langs?: string[] }

const RULES: Rule[] = [
  {
    re: /class \w+ is public, should be declared in a file named/,
    label: 'Java public class',
    text: 'In Java the public class must be named Main here. Rename it to Main, or remove the word public.',
  },
  {
    re: /'(?:cout|cin|endl|vector|string|map|set|sort|printf|scanf|max|min|swap)' (?:was not declared|undeclared)|cannot find symbol[\s\S]{0,80}class (?:Scanner|ArrayList|HashMap|List|Map|Arrays|Collections)|Unresolved reference:? '?(?:Scanner|ArrayList)|unknown type name '(?:bool|string|vector)'/,
    label: 'Missing import',
    text: 'This name comes from a library that is not included yet. Add the #include, import or using line for it at the top.',
  },
  {
    re: /IndentationError|unexpected indent|unindent does not match|TabError|expected an indented block|inconsistent use of tabs/,
    label: 'Indentation',
    text: 'Python reads the spaces at the start of a line. This line is indented differently from the lines around it: use 4 spaces per level, and never mix tabs and spaces.',
  },
  {
    re: /expected ['‘]?;['’]?|expected ',' or ';'|missing ';'|';' expected|Expected ';'|expected `;`|Syntax error:? .*';'/,
    label: 'Missing ;',
    text: 'A statement is missing the ; at its end. The real place is usually the end of the line just before this one.',
  },
  {
    re: /expected ['‘]?[)}\]]['’]?|unmatched|Unmatched|was never closed|unexpected end of (?:file|input)|unexpected <eof>|near <eof>|unexpected EOF|EOF while parsing|missing [)}\]]|unclosed|Unclosed|expected '}' at end|reached end of file while parsing|'[({[]' was not closed|missing terminating/,
    label: 'Brackets',
    text: 'A bracket ( ), { } or [ ], or a quote, is opened and never closed (or closed one time too many). Count them back from this line.',
  },
  {
    re: /expected unqualified-id|expected identifier or '\('|class, interface, enum,? or record expected|statements are not allowed at the top level|non-declaration statement outside function body|Expecting a top level declaration|expected declaration/,
    label: 'Outside a function',
    text: 'This code is outside every function. Statements belong inside main (or another function).',
  },
  {
    re: /missing return|control reaches end of non-void|not all code paths return|A 'return' expression required|function .* may not return|does not return a value|must return a value/,
    label: 'Missing return',
    text: 'This function promises to return a value, but some path through it reaches the end without a return.',
  },
  {
    re: /redefinition|already (?:been )?(?:defined|declared)|[Dd]uplicate|redeclared|[Cc]onflicting declarations|Multiple declarations|Redeclaration|has already been declared|is already defined/,
    label: 'Declared twice',
    text: 'This name is declared twice in the same place. Rename one of them, or remove the second declaration.',
  },
  {
    re: /NullPointer|null reference|NullReferenceException|NoneType|nil value|for nil|Cannot read propert(?:y|ies) of (?:null|undefined)|on a `None` value|Unexpectedly found nil|KotlinNullPointer|null object|is null|undefined is not|nil pointer dereference|Option::unwrap\(\)/,
    label: 'Empty value',
    text: 'The code uses something that has no value (null / None / nil). Check it was given a value before this line.',
  },
  {
    re: /empty list|Prelude\.head|List is empty|pop from empty|pop from an empty|EmptyStackException|Collection contains no element|Array is empty|empty vector|front\(\) called on empty|index out of range.*\bempty\b/,
    label: 'Empty list',
    text: 'The code takes an element from a list, stack or queue that is empty. Check that it is not empty first.',
  },
  {
    re: /undeclared|not declared|undefined: |Unbound (?:value|module|constructor)|undefined identifier|undefined (?:local variable or )?method|cannot find (?:symbol|value|name|function)|is not defined|NameError|Unresolved reference|does not exist in the current context|unknown identifier|not in scope|undefined (?:local variable|method|variable)|use of undeclared|cannot find '\w+' in scope|Undefined variable/,
    label: 'Unknown name',
    text: 'The code uses a name the computer does not know at this point. Check the spelling (capital letters count), and that it is declared before this line.',
  },
  {
    re: /Array\.subscript|index out of (?:range|bounds)|IndexOutOfRange|ArrayIndexOutOfBounds|StringIndexOutOfBounds|out_of_range|IndexError|Index was outside|_M_range_check|Index \d+ out of bounds|index out of bounds|Array index out of range/,
    label: 'Index out of range',
    text: 'The code reads a position that is not in the array, list or string. Valid positions are 0 to length − 1: check the loop limits and the index.',
  },
  {
    re: /division by zero|divide by zero|ZeroDivisionError|DivideByZero|\/ by zero|Floating point exception|SIGFPE|attempt to divide by zero|Division by zero|integer divide by zero|attempt to perform 'n%%0'/,
    label: 'Division by zero',
    text: 'The code divides (or takes the remainder %) by zero. Check the divisor before dividing.',
  },
  {
    re: /NumberFormatException|invalid literal for int|ParseIntError|invalid digit|FormatException|InputMismatchException|could not convert string to float|invalid syntax for (?:integer|number)|is not a valid integer/,
    label: 'Not a number',
    text: 'Reading a number failed: the text read is not a number. Check the input format, and that the lines are read in the right order.',
  },
  {
    re: /EOFError|NoSuchElementException|EOF when reading|end of stream|UnexpectedEof|Unexpected end of input stream|readLine\(\)!! must not be null|Unexpectedly found nil while unwrapping.*readLine/,
    label: 'Read past the input',
    text: 'The program tried to read more input than there is. Check how many values the input really has, and the loop that reads them.',
  },
  {
    re: /RecursionError|maximum recursion depth|StackOverflowError|stack overflow|Maximum call stack|has overflowed its stack|Stack overflow|stack exhausted/,
    label: 'Recursion too deep',
    text: 'Too many calls inside calls: the recursion is too deep or never stops. Check the base case, or use a loop.',
  },
  {
    re: /out of memory|OutOfMemoryError|MemoryError|bad_alloc|Cannot allocate memory|heap out of memory|memory allocation of \d+ bytes failed/,
    label: 'Out of memory',
    text: 'The program used too much memory. Use smaller arrays, or do not keep values that are no longer needed.',
  },
  {
    re: /mismatched types|incompatible types|cannot (?:be )?convert|not assignable|type mismatch|cannot implicitly convert|No instance for|unsupported operand|can only concatenate|expected `[^`]+`, found|Initializer type mismatch|invalid conversion|cannot use .* as .* value|TypeError: can't multiply/i,
    label: 'Wrong type',
    text: 'A value of one type is used where another is needed (for example text where a number is expected). Convert it first, or change the variable’s type.',
  },
  {
    re: /SyntaxError|syntax error|Parse error|unexpected token|Unexpected token|invalid syntax|parse error|Expecting an expression|expected expression/,
    label: 'Syntax',
    text: 'This line is not valid code as written: something is missing, extra or misspelled near the mark (often a bracket, quote, comma or colon).',
  },
]

/** A plain-English explanation for a common error, or null. */
export function explainError(message: string, language?: string): Diag['hint'] | null {
  if (!message) return null
  for (const r of RULES) {
    if (r.langs && language && !r.langs.includes(language)) continue
    if (r.re.test(message)) return { label: r.label, text: r.text }
  }
  return null
}
