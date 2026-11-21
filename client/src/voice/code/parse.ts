/*
  Code by voice, lane C (docs/voice/BLUEPRINT.md §4.3): short spoken edits for
  the code editor, with no AI. "line 12 pe jao", "rename i to j", "for loop
  daalo 0 se n tak", "undo", "line 5 padho", "code samjhao".

  Rule: speak ideas, show code. Only small, exact edits are done here; an
  approach ("pehle sort karo phir two pointers") is not a command and goes
  to the tutor.

  Pure and type-strippable; tests/voice-code.test.js checks it against
  docs/voice/tests/code.json.
*/

export type Insert =
  | { what: 'for'; v: string; from: string; to: string; inclusive?: boolean }
  | { what: 'while'; cond: string }
  | { what: 'if'; cond: string }
  | { what: 'print'; expr: string }
  | { what: 'return'; expr: string }

export type CodeCommand =
  | { verb: 'goto'; line: number }
  | { verb: 'goto'; where: 'top' | 'bottom' }
  | { verb: 'read'; line?: number }
  | { verb: 'summary' }
  | { verb: 'rename'; from: string; to: string }
  | ({ verb: 'insert' } & Insert)
  | { verb: 'undo' }
  | { verb: 'redo' }
  | { verb: 'delete'; line?: number }
  | { verb: 'duplicate'; line?: number }
  | { verb: 'comment'; line?: number; off?: boolean }
  | { verb: 'format' }

const NUM_WORDS: Record<string, number> = {
  zero: 0, shunya: 0, one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5,
  six: 6, chhe: 6, che: 6, seven: 7, saat: 7, eight: 8, aath: 8, nine: 9, nau: 9, ten: 10, das: 10, eleven: 11, gyarah: 11,
  twelve: 12, barah: 12, baarah: 12, thirteen: 13, terah: 13, fourteen: 14, chaudah: 14, fifteen: 15, pandrah: 15,
  sixteen: 16, solah: 16, seventeen: 17, satrah: 17, eighteen: 18, atharah: 18, nineteen: 19, unnis: 19, twenty: 20, bees: 20,
  thirty: 30, tees: 30, forty: 40, chalis: 40, fifty: 50, pachas: 50, hundred: 100, sau: 100,
}

const DEVANAGARI: Record<string, string> = {
  'लाइन': 'line', 'पंक्ति': 'line', 'जाओ': 'jao', 'पढ़ो': 'padho', 'हटाओ': 'hatao', 'मिटाओ': 'mitao', 'अनडू': 'undo',
  'वापस': 'wapas', 'नाम': 'naam', 'रखो': 'rakho', 'से': 'se', 'तक': 'tak', 'डालो': 'daalo', 'लूप': 'loop', 'कोड': 'code',
  'समझाओ': 'samjhao', 'पर': 'par', 'पे': 'pe', 'को': 'ko', 'करो': 'karo',
}

/** Words recognition often mishears when someone speaks code ("ears that know the page"). */
const EARS: [RegExp, string][] = [
  [/\bdye extra\b|\bdike stra\b|\bdijkstra s\b/g, 'dijkstra'],
  [/\bplus plus\b/g, '++'],
  [/\bminus minus\b/g, '--'],
  [/\bcolon colon\b/g, '::'],
  [/\bsee out\b/g, 'cout'],
  [/\bsee in\b/g, 'cin'],
]

/** Lower-case, fold Devanagari words, keep code symbols, squeeze spaces. */
export function clean(text: string): string {
  let s = text.normalize('NFC').toLowerCase()
  s = s.replace(/[ऀ-ॿ]+/g, (w) => ` ${DEVANAGARI[w] ?? w} `)
  s = s.replace(/[“”"'`?!,।]/g, ' ').replace(/\.(?!\d)/g, ' ')
  s = ` ${s.replace(/\s+/g, ' ').trim()} `
  for (const [re, to] of EARS) s = s.replace(re, to)
  return s.trim().replace(/\s+/g, ' ')
}

export function numberFrom(w: string | undefined): number | null {
  if (w == null) return null
  if (/^\d+$/.test(w)) return Number(w)
  return w in NUM_WORDS ? NUM_WORDS[w] : null
}

/** "line twelve", "line number 12", "12 number line", "barah line". */
function lineNumber(s: string): number | null {
  const a = s.match(/\bline(?: number| no)? (\w+)\b/)
  const n1 = numberFrom(a?.[1])
  if (n1 != null && n1 > 0) return n1
  const b = s.match(/\b(\w+)(?: number| no)? (?:line|wali line|vali line)\b/)
  const n2 = numberFrom(b?.[1])
  return n2 != null && n2 > 0 ? n2 : null
}

/** Spoken single letters that recognisers spell out. */
const LETTERS: Record<string, string> = { eye: 'i', jay: 'j', jey: 'j', kay: 'k', en: 'n', em: 'm', ex: 'x', why: 'y', zed: 'z', zee: 'z' }

/** A spoken identifier: "arr", "eye", "left index" → leftIndex. */
export function identifier(words: string): string | null {
  const w = words.trim().split(' ').filter(Boolean).map((x) => LETTERS[x] ?? x)
  if (!w.length || w.length > 3) return null
  if (!w.every((x) => /^[a-z_][a-z0-9_]*$/.test(x))) return null
  const id = w[0] + w.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join('')
  return KEYWORDS.has(id) ? null : id
}
const KEYWORDS = new Set(['for', 'while', 'if', 'else', 'return', 'int', 'loop', 'line', 'to', 'the', 'and', 'or', 'not'])

/** Spoken operators, longest first. */
const OPS: [RegExp, string][] = [
  [/\b(is )?less than or equal to\b|\b(is )?at most\b/g, ' <= '],
  [/\b(is )?greater than or equal to\b|\b(is )?at least\b/g, ' >= '],
  [/\b(is )?not equal to\b|\bnot equals\b/g, ' != '],
  [/\b(is )?equal to\b|\bequals equals\b|\bequals\b|\bbarabar hai\b|\bbarabar\b/g, ' == '],
  [/\b(is )?less than\b|\bse chhota\b|\bse kam\b/g, ' < '],
  [/\b(is )?greater than\b|\bse bada\b|\bse zyada\b/g, ' > '],
  [/\bplus\b/g, ' + '],
  [/\bminus\b/g, ' - '],
  [/\btimes\b|\bmultiplied by\b|\binto\b/g, ' * '],
  [/\bdivided by\b|\bdivide by\b/g, ' / '],
  [/\bmod\b|\bmodulo\b/g, ' % '],
  [/\band\b/g, ' && '],
  [/\bor\b/g, ' || '],
  [/\bnot\b/g, ' !'],
]

/**
 * A short spoken expression → code: "i plus 1" → "i + 1", "arr of i" →
 * "arr[i]", "low less than or equal to high" → "low <= high". Returns null
 * when it doesn't look like a small expression (then nothing is inserted).
 */
export function expression(spoken: string): string | null {
  let s = ` ${spoken.trim()} `
  if (!s.trim()) return null
  for (const [re, to] of OPS) s = s.replace(re, to)
  // "arr of i" / "a index i" → arr[i]
  s = s.replace(/\b([a-z_]\w*) (?:of|index) ([a-z_]\w*|\d+)\b/g, '$1[$2]')
  const parts = s.trim().split(/\s+/)
  const out: string[] = []
  for (const p of parts) {
    const n = numberFrom(p)
    if (n != null) out.push(String(n))
    else if (/^(<=|>=|!=|==|<|>|\+|-|\*|\/|%|&&|\|\||!|\+\+|--)$/.test(p)) out.push(p)
    else if (/^[a-z_]\w*(\[[a-z_\d]\w*\])?$/.test(p)) out.push(LETTERS[p] ?? p)
    else if (/^!?[a-z_]\w*$/.test(p)) out.push(p)
    else return null
  }
  if (out.length > 9) return null
  // Operands and operators must alternate (a unary ! sticks to its operand).
  const joined = out.join(' ').replace(/! /g, '!')
  const toks = joined.split(' ')
  for (let i = 0; i < toks.length; i++) {
    const isOp = /^(<=|>=|!=|==|<|>|\+|-|\*|\/|%|&&|\|\|)$/.test(toks[i])
    if (isOp !== (i % 2 === 1)) return null
  }
  if (toks.length % 2 === 0) return null
  return joined
}

function stripLead(s: string, re: RegExp): string {
  return s.replace(re, '').trim()
}

/** Parse one utterance; null when it is not a code edit. */
export function parseCode(utterance: string): CodeCommand | null {
  const s = clean(utterance)
  if (!s) return null
  const line = lineNumber(s)

  // Undo / redo
  if (/^(undo|undo karo|wapas karo|ctrl z|pichla hatao)$/.test(s) || /\bundo\b/.test(s) && s.split(' ').length <= 3) return { verb: 'undo' }
  if (/^(redo|redo karo|phir se karo)$/.test(s) || /\bredo\b/.test(s) && s.split(' ').length <= 3) return { verb: 'redo' }

  // Format
  if (/\b(format|indent|saaf)\b.*\b(code|file)\b|^(format|format karo|format the code)$/.test(s)) return { verb: 'format' }

  // Summary: "read my code", "code samjhao", "summarize the code", "what does my code do"
  if (/\b(summar\w*|overview)\b/.test(s) && /\bcode\b/.test(s)) return { verb: 'summary' }
  if (/\b(read|padho|sunao)\b.*\b(my |the |whole |pura |poora )?code\b/.test(s) && line == null) return { verb: 'summary' }
  if (/\bcode\b.*\b(samjhao|kya karta hai|kya kar raha hai)\b|\bwhat does (my|the|this) code do\b/.test(s)) return { verb: 'summary' }

  // Read a line: "read line 5", "line 5 padho", "what is on line 5"
  if (line != null && /\b(read|padho|sunao|what is on|what s on|kya hai|kya likha)\b/.test(s)) return { verb: 'read', line }
  if (/^(read (this|the current) line|ye line padho|yeh line padho|is line ko padho)$/.test(s)) return { verb: 'read' }

  // Go to
  if (line != null && /\b(go to|goto|jump to|jao|chalo|le chalo|move to|open)\b/.test(s)) return { verb: 'goto', line }
  if (/\b(go to|jao|jump to)\b.*\b(top|start|shuru|upar)\b/.test(s)) return { verb: 'goto', where: 'top' }
  if (/\b(go to|jao|jump to)\b.*\b(bottom|end|neeche|niche|aakhir)\b/.test(s)) return { verb: 'goto', where: 'bottom' }

  // Delete / duplicate / comment a line
  const thisLine = line == null && /\b(this|current|ye|yeh|is)\b/.test(s)
  if (/\b(delete|remove|hatao|mitao|erase)\b/.test(s) && /\bline\b/.test(s) && (line != null || thisLine)) return { verb: 'delete', line: line ?? undefined }
  if (/\b(duplicate|copy|dobara|double)\b/.test(s) && /\bline\b/.test(s) && (line != null || thisLine)) return { verb: 'duplicate', line: line ?? undefined }
  if (/\b(uncomment|comment hatao|comment remove)\b/.test(s) && /\bline\b/.test(s)) return { verb: 'comment', line: line ?? undefined, off: true }
  if (/\b(comment out|comment karo|comment)\b/.test(s) && /\bline\b/.test(s) && (line != null || thisLine)) return { verb: 'comment', line: line ?? undefined }

  // Rename: "rename i to j", "i ka naam j rakho", "change the name of i to j"
  {
    let m = s.match(/^(?:rename|change (?:the )?name of|naam badlo) (.+?) (?:to|into|as|se) (.+)$/)
    if (!m) m = s.match(/^(.+?) (?:ka|ki|ke) naam (.+?) (?:rakho|karo|kardo|kar do|badlo)$/)
    if (!m) m = s.match(/^(.+?) (?:ko) (.+?) (?:mein|me) (?:rename|badlo)(?: karo)?$/)
    if (m) {
      const from = identifier(m[1])
      const to = identifier(m[2])
      if (from && to && from !== to) return { verb: 'rename', from, to }
    }
  }

  // Insert a for loop: "for loop 0 se n tak", "for i from 0 to n", "loop from 1 to n inclusive"
  if (/\b(for loop|for|loop)\b/.test(s) && /\b(to|tak|till|until|se|from)\b/.test(s) && !/\bwhile\b/.test(s)) {
    let body = stripLead(s, /^(add|insert|write|likho|daalo|dalo|lagao|banao)\b/)
    body = body.replace(/\b(add|insert|write|likho|daalo|dalo|lagao|banao|chalao|karo)\b/g, ' ').replace(/\s+/g, ' ').trim()
    const inclusive = /\b(inclusive|including|tak bhi|equal)\b/.test(body)
    body = body.replace(/\b(inclusive|including)\b/g, '').trim()
    // English: [a] for [loop] [over|with] [i] from A to B
    let m = body.match(/\b(?:for|loop)(?: loop)?(?: (?:over|with|using|on))? ?(?:([a-z_]\w*|eye|jay|kay) )?(?:from|going from) (.+?) (?:to|till|until|up to) (.+)$/)
    let v: string | null = null, a: string | null = null, b: string | null = null
    if (m) {
      v = m[1] ? identifier(m[1]) : 'i'
      a = expression(m[2])
      b = expression(m[3])
    } else {
      // Hinglish: [i] [ka] for loop A se B tak
      m = body.match(/^(?:(?!for\b|loop\b)([a-z_]\w*) (?:ka |ki |ke |wala |vala )?)?(?:for loop|for|loop) (.+?) se (.+?) tak$/)
      if (m) {
        v = m[1] ? identifier(m[1]) : 'i'
        a = expression(m[2])
        b = expression(m[3])
      }
    }
    if (v && a && b) return { verb: 'insert', what: 'for', v, from: a, to: b, ...(inclusive ? { inclusive: true } : {}) }
  }

  // while / if: "while low less than or equal to high", "if arr of i greater than max", "agar x 0 ke barabar"
  {
    const lead = /^(?:add |insert |write |likho |daalo |dalo )?(?:an? )?/
    const body = s.replace(lead, '')
    let m = body.match(/^(while|jab tak)(?: loop)? (.+?)(?: (?:likho|daalo|dalo|lagao|tak))?$/)
    if (m) {
      const cond = expression(m[2])
      if (cond) return { verb: 'insert', what: 'while', cond }
    }
    m = body.match(/^(?:if|agar)(?: condition)? (.+?)(?: (?:likho|daalo|dalo|lagao|to|toh))?$/)
    if (m) {
      const cond = expression(m[1].replace(/ ke == /g, ' == '))
      if (cond) return { verb: 'insert', what: 'if', cond }
    }
    m = body.match(/^(?:print|cout|output|print karo|dikhao) (.+?)(?: (?:print karo|likho))?$/) ?? body.match(/^(.+?) (?:print karo|ko print karo)$/)
    if (m) {
      const expr = expression(m[1])
      if (expr) return { verb: 'insert', what: 'print', expr }
    }
    m = body.match(/^return (.+)$/) ?? body.match(/^(.+?) return karo$/)
    if (m) {
      const expr = expression(m[1])
      if (expr) return { verb: 'insert', what: 'return', expr }
    }
  }

  // A bare "line 12" means go there.
  if (line != null && /^(line|line number) \w+$/.test(s)) return { verb: 'goto', line }
  return null
}
