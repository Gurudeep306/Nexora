#!/usr/bin/env node
/*
  Validates GATE solution files (src/gate/solutions/<paperId>.json).

    node scripts/gate/validate-solutions.mjs                 # every file
    node scripts/gate/validate-solutions.mjs cse-2012 ...    # some papers (ids or paths)
    node scripts/gate/validate-solutions.mjs --strict        # warnings fail too

  Two layers:
    1. Structure — src/gate/solution.schema.json, checked by a small built-in
       JSON-Schema interpreter (type, enum, const, required, properties,
       additionalProperties, items, min/max*, pattern, oneOf, $ref and an
       OpenAPI-style `discriminator` on `kind` for precise frame errors).
    2. Meaning — the answer agrees with the stored key (or says why not),
       option analysis covers every option, KaTeX parses, every animation
       frame (base + cumulative step patches) is a valid frame whose ids,
       indices and ranges point at things that exist, paging simulations
       match `expectFaults`, K-map groups are real rectangles, size budget.

  Exit code 1 when any error (or, with --strict, any warning) is found.
  The rules are documented in docs/gate/SOLUTION_AUTHORING.md.
*/
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOL_DIR = path.join(ROOT, 'src', 'gate', 'solutions')
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'gate', 'solution.schema.json'), 'utf8'))
const engine = await import(pathToFileURL(path.join(ROOT, 'client', 'src', 'gate', 'solution', 'engine.ts')).href)

export const SIZE_LIMIT = 12 * 1024

let katex = null
try {
  katex = createRequire(path.join(ROOT, 'client', 'package.json'))('katex')
} catch {
  /* client deps not installed: KaTeX checks are skipped (warned once) */
}

/* ── Bank ────────────────────────────────────────────────────────────────── */

let bankCache = null
export function loadBank(file = path.join(ROOT, 'src', 'gate', 'questions.json')) {
  if (bankCache && bankCache.file === file) return bankCache
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  bankCache = { file, papers: new Set(raw.papers.map((p) => p.id)), byId: new Map(raw.questions.map((q) => [q.id, q])) }
  return bankCache
}

/* ── Mini JSON-Schema interpreter ────────────────────────────────────────── */

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)
const show = (v) => {
  const s = JSON.stringify(v)
  return s && s.length > 40 ? s.slice(0, 37) + '…' : s
}
function resolve(ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref ${ref}`)
  return ref
    .slice(2)
    .split('/')
    .reduce((o, k) => o[k], SCHEMA)
}
function typeOk(want, v) {
  const t = typeOf(v)
  const wants = Array.isArray(want) ? want : [want]
  return wants.some((w) => w === t || (w === 'number' && t === 'integer'))
}

/** Returns a list of "path: message" errors. */
export function checkSchema(schema, v, at, out = []) {
  if (schema.$ref) return checkSchema(resolve(schema.$ref), v, at, out)
  if (schema.discriminator) {
    if (typeOf(v) !== 'object') return out.push(`${at}: expected an object with "kind", got ${typeOf(v)}`), out
    const { propertyName, mapping } = schema.discriminator
    const k = v[propertyName]
    if (!(k in mapping)) {
      out.push(`${at}.${propertyName}: unknown ${propertyName} ${show(k)} (one of: ${Object.keys(mapping).join(', ')})`)
      return out
    }
    return checkSchema(resolve(mapping[k]), v, at, out)
  }
  if (schema.oneOf) {
    const branches = schema.oneOf.map((s) => checkSchema(s, v, at, []))
    const ok = branches.filter((b) => b.length === 0).length
    if (ok === 1) return out
    if (ok === 0) {
      // Report the branch whose type matched, else a summary.
      const typed = schema.oneOf.findIndex((s) => {
        const r = s.$ref ? resolve(s.$ref) : s
        return r.type ? typeOk(r.type, v) : r.const !== undefined ? false : true
      })
      if (typed >= 0) out.push(...branches[typed])
      else out.push(`${at}: ${show(v)} matches none of the allowed shapes`)
    }
    return out
  }
  if ('const' in schema && v !== schema.const) out.push(`${at}: must be ${show(schema.const)}, got ${show(v)}`)
  if (schema.enum && !schema.enum.includes(v)) out.push(`${at}: ${show(v)} is not one of ${schema.enum.map(show).join(', ')}`)
  if (schema.type && !typeOk(schema.type, v)) {
    out.push(`${at}: expected ${[].concat(schema.type).join(' or ')}, got ${typeOf(v)}`)
    return out
  }
  const t = typeOf(v)
  if (t === 'string') {
    if (schema.minLength != null && v.length < schema.minLength) out.push(`${at}: too short (${v.length} < ${schema.minLength} chars)`)
    if (schema.maxLength != null && v.length > schema.maxLength) out.push(`${at}: too long (${v.length} > ${schema.maxLength} chars)`)
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) out.push(`${at}: ${show(v)} does not match ${schema.pattern}`)
  }
  if (t === 'number' || t === 'integer') {
    if (schema.minimum != null && v < schema.minimum) out.push(`${at}: ${v} < minimum ${schema.minimum}`)
    if (schema.maximum != null && v > schema.maximum) out.push(`${at}: ${v} > maximum ${schema.maximum}`)
  }
  if (t === 'array') {
    if (schema.minItems != null && v.length < schema.minItems) out.push(`${at}: needs at least ${schema.minItems} items, has ${v.length}`)
    if (schema.maxItems != null && v.length > schema.maxItems) out.push(`${at}: at most ${schema.maxItems} items, has ${v.length}`)
    if (schema.items) v.forEach((x, i) => checkSchema(schema.items, x, `${at}[${i}]`, out))
  }
  if (t === 'object') {
    for (const r of schema.required || []) if (!(r in v)) out.push(`${at}: missing required "${r}"`)
    const props = schema.properties || {}
    for (const [k, x] of Object.entries(v)) {
      if (props[k]) checkSchema(props[k], x, `${at}.${k}`, out)
      else if (schema.additionalProperties === false) {
        out.push(`${at}: unknown key "${k}"${Object.keys(props).length ? ` (allowed: ${Object.keys(props).join(', ')})` : ''}`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        checkSchema(schema.additionalProperties, x, `${at}.${k}`, out)
      }
    }
  }
  return out
}

/* ── Markdown / KaTeX ────────────────────────────────────────────────────── */

let katexWarned = false
function checkTex(tex, display, at, err) {
  if (!katex) return
  try {
    katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'ignore' })
  } catch (e) {
    err(`${at}: KaTeX cannot parse ${show(tex)} — ${String(e.message || e).replace(/^KaTeX parse error: /, '').slice(0, 140)}`)
  }
}

/** Markdown rules for the solution renderer (client/src/learn/md.tsx). */
export function checkMarkdown(md, at, err, warn) {
  if (typeof md !== 'string') return
  // Display math blocks first, then inline.
  const display = []
  const rest = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => (display.push(tex), ' '))
  for (const tex of display) checkTex(tex, true, at, err)
  const dollars = (rest.replace(/\\\$/g, '').match(/\$/g) || []).length
  if (dollars % 2) {
    err(`${at}: unbalanced $ — every inline formula needs an opening and a closing $ (escape a literal dollar as \\$)`)
    return
  }
  const inline = [...rest.replace(/\\\$/g, '').matchAll(/\$([^$]+)\$/g)].map((m) => m[1])
  for (const tex of inline) {
    if (tex.includes('\n')) err(`${at}: inline math ${show(tex)} spans a line break — keep $…$ on one line or use $$…$$`)
    checkTex(tex, false, at, err)
  }
  const outside = rest.replace(/\$[^$]*\$/g, ' ').replace(/`[^`]*`/g, ' ')
  if (/<\/?(div|span|br|p|b|i|sub|sup|table|tr|td|img|font|u)\b[^>]*>/i.test(outside)) err(`${at}: raw HTML is not rendered — use markdown (**bold**, $x_1$, tables)`)
  for (const line of md.split('\n')) {
    if (!/^\s*\|/.test(line)) continue
    for (const cell of line.replace(/^\s*\||\|\s*$/g, '').split('|')) {
      if ((cell.replace(/\\\$/g, '').match(/\$/g) || []).length % 2) {
        err(`${at}: a table cell splits a formula — "|" inside $…$ breaks the table; write \\mid or \\lvert instead`)
        break
      }
    }
  }
  if (/^#\s/m.test(md)) warn(`${at}: "# " headings are not supported; use ### (or bold) inside steps`)
}

/* ── Frames ──────────────────────────────────────────────────────────────── */

const inRange = (i, n) => Number.isInteger(i) && i >= 0 && i < n

function treeIds(node, ids, dup) {
  if (!node) return
  const id = node.id ?? (Array.isArray(node.label) ? node.label.join('|') : String(node.label))
  if (ids.has(id)) dup.add(id)
  ids.add(id)
  for (const c of node.children || []) treeIds(c, ids, dup)
}

const VENN_KEYS = (ids) => {
  const out = new Set(['-'])
  const n = ids.length
  for (let mask = 1; mask < 1 << n; mask++) out.add(ids.filter((_, i) => mask & (1 << i)).join(''))
  return out
}

/** Semantic checks for one complete frame (structure already valid). */
export function checkFrameMeaning(f, at, err, warn) {
  const md = (s, where) => checkMarkdown(s, `${at}.${where}`, err, warn)
  if (f.caption) md(f.caption, 'caption')
  switch (f.kind) {
    case 'array': {
      const n = f.cells.length
      for (const [i, p] of (f.pointers || []).entries()) if (p.at < -1 || p.at > n) err(`${at}.pointers[${i}].at: ${p.at} is outside -1..${n}`)
      for (const [i, h] of (f.hl || []).entries()) {
        const [a, b] = Array.isArray(h.at) ? h.at : [h.at, h.at]
        if (!inRange(a, n) || !inRange(b, n) || a > b) err(`${at}.hl[${i}].at: ${show(h.at)} is not a cell position in 0..${n - 1}`)
      }
      for (const [i, r] of (f.ranges || []).entries()) if (!inRange(r.from, n) || !inRange(r.to, n) || r.from > r.to) err(`${at}.ranges[${i}]: ${r.from}..${r.to} is not inside 0..${n - 1}`)
      break
    }
    case 'stack':
    case 'queue':
      for (const [i, h] of (f.hl || []).entries()) if (!inRange(h.at, f.items.length)) err(`${at}.hl[${i}].at: ${h.at} is not an item position in 0..${f.items.length - 1}`)
      break
    case 'table': {
      const w = Math.max(...f.rows.map((r) => r.length))
      f.rows.forEach((r, i) => r.length !== w && err(`${at}.rows[${i}]: has ${r.length} cells, other rows have ${w} — pad with null`))
      if (f.cols && f.cols.length !== w) err(`${at}.cols: ${f.cols.length} headers for ${w} columns`)
      if (f.rowLabels && f.rowLabels.length !== f.rows.length) err(`${at}.rowLabels: ${f.rowLabels.length} labels for ${f.rows.length} rows`)
      for (const [i, m] of (f.hl || []).entries()) {
        if (m.r == null && m.c == null) err(`${at}.hl[${i}]: give r, c or both`)
        if (m.r != null && !inRange(m.r, f.rows.length)) err(`${at}.hl[${i}].r: ${m.r} is not a body row in 0..${f.rows.length - 1}`)
        if (m.c != null && !inRange(m.c, w)) err(`${at}.hl[${i}].c: ${m.c} is not a body column in 0..${w - 1}`)
      }
      for (const [i, a] of (f.arrows || []).entries())
        for (const end of ['from', 'to'])
          if (!inRange(a[end][0], f.rows.length) || !inRange(a[end][1], w)) err(`${at}.arrows[${i}].${end}: [${a[end]}] is not a body cell`)
      if (f.reveal != null && f.reveal > f.rows.length * w) warn(`${at}.reveal: ${f.reveal} exceeds the ${f.rows.length * w} cells`)
      break
    }
    case 'matrix':
      f.terms.forEach((t, i) => {
        if (typeof t === 'string') return
        const w = t.rows[0].length
        if (t.rows.some((r) => r.length !== w)) err(`${at}.terms[${i}].rows: rows have different lengths`)
        for (const [j, m] of (t.hl || []).entries())
          if ((m.r != null && !inRange(m.r, t.rows.length)) || (m.c != null && !inRange(m.c, w))) err(`${at}.terms[${i}].hl[${j}]: outside the matrix`)
      })
      break
    case 'graph': {
      const ids = new Set()
      for (const [i, n] of f.nodes.entries()) {
        if (ids.has(n.id)) err(`${at}.nodes[${i}].id: duplicate id "${n.id}"`)
        ids.add(n.id)
      }
      for (const [i, e] of f.edges.entries())
        for (const end of ['from', 'to']) if (!ids.has(e[end])) err(`${at}.edges[${i}].${end}: no node with id "${e[end]}"`)
      for (const k of Object.keys(f.tones || {})) if (!ids.has(k)) err(`${at}.tones: no node "${k}"`)
      for (const k of Object.keys(f.subs || {})) if (!ids.has(k)) err(`${at}.subs: no node "${k}"`)
      const edgeKeys = new Set(f.edges.flatMap((e) => (f.directed ? [`${e.from}>${e.to}`] : [`${e.from}>${e.to}`, `${e.to}>${e.from}`])))
      for (const k of Object.keys(f.edgeTones || {})) if (!edgeKeys.has(k)) err(`${at}.edgeTones: no edge "${k}" (keys are "from>to")`)
      const allXY = f.nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number')
      if (f.layout === 'manual' && !allXY) err(`${at}.layout: "manual" needs x and y on every node`)
      if (!f.layout && !allXY && f.nodes.some((n) => n.x != null)) warn(`${at}: some nodes have x/y and some do not — coordinates are ignored unless every node has them`)
      break
    }
    case 'tree': {
      const ids = new Set()
      const dup = new Set()
      treeIds(f.root, ids, dup)
      if (dup.size) err(`${at}.root: repeated node identity ${[...dup].map((d) => `"${d}"`).join(', ')} — give repeated labels distinct "id"s`)
      break
    }
    case 'automaton': {
      const ids = new Set()
      for (const [i, s] of f.states.entries()) {
        if (ids.has(s.id)) err(`${at}.states[${i}].id: duplicate id "${s.id}"`)
        ids.add(s.id)
      }
      const pairs = new Set()
      for (const [i, e] of f.edges.entries()) {
        for (const end of ['from', 'to']) if (!ids.has(e[end])) err(`${at}.edges[${i}].${end}: no state "${e[end]}"`)
        const k = `${e.from}→${e.to}`
        if (pairs.has(k)) err(`${at}.edges[${i}]: second edge ${k} — merge the symbols into one label ("0,1")`)
        pairs.add(k)
      }
      for (const c of f.current || []) if (!ids.has(c)) err(`${at}.current: no state "${c}"`)
      for (const k of Object.keys(f.edgeTones || {})) if (!pairs.has(k.replace('>', '→'))) err(`${at}.edgeTones: no edge "${k}" (keys are "from>to")`)
      if (!f.states.some((s) => s.start)) warn(`${at}.states: no start state marked`)
      if (f.layout === 'manual' && f.states.some((s) => typeof s.x !== 'number' || typeof s.y !== 'number')) err(`${at}.layout: "manual" needs x and y on every state`)
      if (f.tape && f.tape.head != null && f.tape.head > f.tape.cells.length) err(`${at}.tape.head: ${f.tape.head} is past the end (${f.tape.cells.length})`)
      break
    }
    case 'gantt':
      f.lanes.forEach((l, i) => {
        const bars = [...l.bars].sort((a, b) => a.start - b.start)
        l.bars.forEach((b, j) => b.end <= b.start && err(`${at}.lanes[${i}].bars[${j}]: end ${b.end} must be after start ${b.start}`))
        for (let j = 1; j < bars.length; j++) if (bars[j].start < bars[j - 1].end) err(`${at}.lanes[${i}]: bars "${bars[j - 1].label}" and "${bars[j].label}" overlap`)
      })
      break
    case 'pipeline': {
      const last = Math.max(...f.rows.map((r) => r.start + r.cells.length - 1))
      for (const [i, m] of (f.hl || []).entries()) {
        if (m.r != null && !inRange(m.r, f.rows.length)) err(`${at}.hl[${i}].r: ${m.r} is not a row in 0..${f.rows.length - 1}`)
        if (m.c != null && (m.c < 1 || m.c > last)) err(`${at}.hl[${i}].c: cycle ${m.c} is outside 1..${last}`)
      }
      for (const [i, fw] of (f.forwards || []).entries())
        for (const end of ['from', 'to']) {
          const [r, c] = fw[end]
          if (!inRange(r, f.rows.length) || c < f.rows[r].start || c >= f.rows[r].start + f.rows[r].cells.length) err(`${at}.forwards[${i}].${end}: [${r}, ${c}] is not a drawn cell`)
        }
      break
    }
    case 'paging': {
      const { faults } = engine.simulatePaging(f)
      if (f.expectFaults != null && f.expectFaults !== faults) err(`${at}.expectFaults: ${f.expectFaults}, but ${f.policy} with ${f.frames} frames gives ${faults} faults`)
      if (f.upto != null && f.upto > f.refs.length) err(`${at}.upto: ${f.upto} > ${f.refs.length} references`)
      break
    }
    case 'cache':
      if (f.access) {
        if (!inRange(f.access.set, f.sets.length)) err(`${at}.access.set: ${f.access.set} is not a set in 0..${f.sets.length - 1}`)
        else if (f.access.way != null && !inRange(f.access.way, f.sets[f.access.set].lines.length)) err(`${at}.access.way: ${f.access.way} is not a line of set ${f.access.set}`)
      }
      break
    case 'numberline':
      if (f.min >= f.max) err(`${at}: min must be < max`)
      for (const [i, p] of (f.points || []).entries()) if (p.x < f.min || p.x > f.max) warn(`${at}.points[${i}]: ${p.x} is off the line`)
      for (const [i, iv] of (f.intervals || []).entries()) if (iv.from > iv.to) err(`${at}.intervals[${i}]: from > to`)
      break
    case 'venn': {
      const ids = f.sets.map((s) => s.id)
      if (new Set(ids).size !== ids.length) err(`${at}.sets: duplicate set id`)
      const keys = VENN_KEYS(ids)
      for (const k of Object.keys(f.regions || {})) if (!keys.has(k)) err(`${at}.regions: unknown region "${k}" (use ${[...keys].join(', ')})`)
      for (const [i, h] of (f.hl || []).entries()) if (!keys.has(h.region)) err(`${at}.hl[${i}].region: unknown region "${h.region}"`)
      break
    }
    case 'equation':
      f.lines.forEach((l, i) => {
        if (/^\$|\$$/.test(l.tex.trim())) err(`${at}.lines[${i}].tex: write TeX without $ delimiters`)
        else checkTex(l.tex, true, `${at}.lines[${i}].tex`, err)
        if (l.note) md(l.note, `lines[${i}].note`)
      })
      if (f.reveal != null && f.reveal > f.lines.length) err(`${at}.reveal: ${f.reveal} > ${f.lines.length} lines`)
      break
    case 'code': {
      const n = f.code.split('\n').length
      if (f.line != null && f.line > n) err(`${at}.line: ${f.line} > ${n} lines of code`)
      for (const l of f.hl || []) if (l > n) err(`${at}.hl: line ${l} > ${n}`)
      break
    }
    case 'sequence':
      f.messages.forEach((m, i) => {
        for (const end of ['from', 'to']) if (!f.actors.includes(m[end])) err(`${at}.messages[${i}].${end}: "${m[end]}" is not an actor`)
        if (m.t1 != null && m.t1 < m.t0) err(`${at}.messages[${i}]: t1 < t0`)
      })
      break
    case 'circuit': {
      const ids = new Set()
      for (const x of [...f.inputs, ...f.gates]) {
        if (ids.has(x.id)) err(`${at}: duplicate signal id "${x.id}"`)
        ids.add(x.id)
      }
      const d = engine.circuitDepths(f)
      if (typeof d === 'string') err(`${at}.gates: ${d}`)
      f.gates.forEach((g, i) => {
        const one = g.type === 'NOT' || g.type === 'BUF'
        if (one && g.in.length !== 1) err(`${at}.gates[${i}]: ${g.type} takes exactly one input`)
        if (!one && g.in.length < 2) err(`${at}.gates[${i}]: ${g.type} needs at least two inputs`)
      })
      for (const [i, o] of f.outputs.entries()) if (!ids.has(o.from)) err(`${at}.outputs[${i}].from: no signal "${o.from}"`)
      break
    }
    case 'kmap': {
      const max = 1 << f.variables.length
      const ones = new Set(f.ones)
      const dcs = new Set(f.dcs || [])
      for (const m of [...ones, ...dcs]) if (m >= max) err(`${at}: minterm ${m} does not exist with ${f.variables.length} variables`)
      for (const m of dcs) if (ones.has(m)) err(`${at}: minterm ${m} is both a 1 and a don't-care`)
      for (const [i, g] of (f.groups || []).entries()) {
        const e = engine.kmapGroupError(f, g.cells)
        if (e) err(`${at}.groups[${i}]: ${e}`)
        for (const m of g.cells) if (!ones.has(m) && !dcs.has(m)) err(`${at}.groups[${i}]: covers minterm ${m}, which is a 0`)
      }
      for (const [i, h] of (f.hl || []).entries()) if (!inRange(h.cell, max)) err(`${at}.hl[${i}].cell: ${h.cell} is out of range`)
      break
    }
    case 'panels':
      f.panels.forEach((p, i) => checkFrameMeaning(p, `${at}.panels[${i}]`, err, warn))
      break
  }
}

/* ── Solutions ───────────────────────────────────────────────────────────── */

const CHOICE_TYPES = new Set(['MCQ', 'MSQ', 'TF', 'MATCH'])

export function validateSolution(id, sol, q, report) {
  const err = (m) => report.errors.push(`${id} › ${m}`)
  const warn = (m) => report.warnings.push(`${id} › ${m}`)
  const structural = checkSchema({ $ref: '#/$defs/solution' }, sol, 'solution')
  if (structural.length) {
    structural.forEach(err)
    return
  }
  if (!q) return err('no question with this id in src/gate/questions.json')

  const bytes = Buffer.byteLength(JSON.stringify(sol))
  if (bytes > SIZE_LIMIT) err(`solution is ${(bytes / 1024).toFixed(1)} KB; the budget is ${SIZE_LIMIT / 1024} KB (trim prose, share frames via step patches)`)

  // Markdown everywhere.
  checkMarkdown(sol.approach, 'approach', err, warn)
  if (sol.given) checkMarkdown(sol.given, 'given', err, warn)
  if (sol.shortcut) checkMarkdown(sol.shortcut, 'shortcut', err, warn)
  if (sol.verification) checkMarkdown(sol.verification, 'verification', err, warn)
  checkMarkdown(sol.answer.value, 'answer.value', err, warn)
  ;(sol.pitfalls || []).forEach((p, i) => checkMarkdown(p, `pitfalls[${i}]`, err, warn))
  ;(sol.optionAnalysis || []).forEach((o, i) => checkMarkdown(o.reason, `optionAnalysis[${i}].reason`, err, warn))
  sol.steps.forEach((s, i) => {
    checkMarkdown(s.title, `steps[${i}].title`, err, warn)
    checkMarkdown(s.body, `steps[${i}].body`, err, warn)
    if (/^\s*(step|method)\s*\d/i.test(s.title)) warn(`steps[${i}].title: don't number titles ("Step 2: …") — the page numbers them`)
    if (s.body.trim().length < 20) warn(`steps[${i}].body: very short — show the working`)
  })
  if (sol.steps.length < 3) warn(`only ${sol.steps.length} steps — fine for one-line facts, otherwise show more working`)

  // Answer vs key.
  const letters = (q.options || []).map((o) => o.l)
  const a = sol.answer
  const choiceType = CHOICE_TYPES.has(q.type) && letters.length > 0
  if (choiceType && !a.choice) err(`answer.choice: required for ${q.type} questions (the option letter${q.type === 'MSQ' ? 's' : ''} you proved)`)
  if (q.type === 'MCQ' && a.choice && a.choice.length !== 1) err(`answer.choice: an MCQ has exactly one correct option, got ${a.choice.length}`)
  if (q.type === 'NAT' && typeof a.number !== 'number') err('answer.number: required for NAT questions (the value you computed)')
  for (const l of a.choice || []) if (!letters.includes(l)) err(`answer.choice: option ${l} does not exist (options: ${letters.join(', ') || 'none'})`)
  let agrees = null
  if (a.choice && letters.length) {
    const key = engine.keyLetters(q.answer)
    agrees = key.length > 0 && JSON.stringify([...a.choice].sort()) === JSON.stringify(key)
  } else if (typeof a.number === 'number') {
    agrees = engine.numberMatchesKey(a.number, q.answer)
  }
  if (q.answer == null && a.matchesKey) err('answer.matchesKey: the question has no stored key, so this must be false (explain in keyNote)')
  if (agrees === false && a.matchesKey)
    err(`answer.matchesKey is true but the stored key is ${show(q.answer)} and this solution proves ${show(a.choice ?? a.number)} — re-check the working; if the key is wrong set matchesKey:false + keyNote and add a fixes entry`)
  if (agrees === true && !a.matchesKey) err(`answer.matchesKey is false but the solution agrees with the stored key ${show(q.answer)}`)
  if (!a.matchesKey) {
    if (!a.keyNote) err('answer.keyNote: required when matchesKey is false — say what the stored key is and why it is wrong or missing')
    const flagged = (report.fixes || []).some((f) => f.id === q.id && (f.field === 'answer' || (f.field === 'needsReview' && f.after === true)))
    if (!flagged)
      err(`answer disagrees with the stored key ${show(q.answer)} — add an entry for ${q.id} to src/gate/fixes/${q.paper}.json: field "answer" (if the official key confirms you) or "needsReview": true + "reviewNote"`)
  }

  // Option analysis.
  if (choiceType && !sol.optionAnalysis) err('optionAnalysis: required for questions with options — one entry per option explaining why it is right or wrong')
  if (sol.optionAnalysis) {
    const got = sol.optionAnalysis.map((o) => o.option)
    if (JSON.stringify(got) !== JSON.stringify(letters)) err(`optionAnalysis: must list each option once, in order (${letters.join(', ')}); got ${got.join(', ')}`)
    if (a.choice) {
      for (const o of sol.optionAnalysis) {
        const should = a.choice.includes(o.option)
        if (o.correct !== should) err(`optionAnalysis[${o.option}].correct is ${o.correct} but answer.choice ${should ? 'includes' : 'excludes'} ${o.option}`)
      }
    }
  }

  // Animation frames.
  const seen = new Set()
  const checkFrame = (f, where) => {
    if (!f || seen.has(f)) return
    seen.add(f)
    const e = checkSchema({ $ref: '#/$defs/frame' }, f, 'frame')
    if (e.length) return e.forEach((m) => err(`${where} ⇒ ${m}`))
    checkFrameMeaning(f, `${where} ⇒ frame`, err, (m) => warn(m))
  }
  if (sol.animation) checkFrame(sol.animation, 'animation')
  let frames
  try {
    frames = engine.stepFrames(sol)
  } catch (e) {
    return err(`steps: could not build animation frames (${e.message})`)
  }
  sol.steps.forEach((s, i) => {
    if (s.scene && !s.scene.kind && !sol.animation && !frames.slice(0, i).some(Boolean))
      err(`steps[${i}].scene: a patch (no "kind") needs a base — set solution.animation or give this scene a "kind"`)
    if (s.scene && s.scene.kind && sol.animation && s.scene.kind === sol.animation.kind && Object.keys(s.scene).length < 3)
      warn(`steps[${i}].scene: has "kind", so it REPLACES the whole frame — drop "kind" to patch the previous frame`)
    checkFrame(frames[i], `steps[${i}].scene`)
  })
}

export function validateFile(file, { bank = loadBank() } = {}) {
  const report = { file, errors: [], warnings: [], count: 0, fixes: [] }
  const name = path.basename(file, '.json')
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    report.errors.push(`${name}: not valid JSON — ${e.message}`)
    return report
  }
  const top = checkSchema({ type: 'object', required: ['paper', 'version', 'solutions'], additionalProperties: false, properties: { paper: SCHEMA.properties.paper, version: SCHEMA.properties.version, solutions: { type: 'object' } } }, data, name)
  if (top.length) {
    report.errors.push(...top)
    return report
  }
  const fixFile = path.join(ROOT, 'src', 'gate', 'fixes', `${name}.json`)
  if (fs.existsSync(fixFile)) {
    try {
      report.fixes = JSON.parse(fs.readFileSync(fixFile, 'utf8')).fixes || []
    } catch (e) {
      report.errors.push(`${name}: src/gate/fixes/${name}.json is not valid JSON — ${e.message}`)
    }
  }
  if (data.paper !== name) report.errors.push(`${name}: "paper" is "${data.paper}" but the file is ${name}.json`)
  if (!bank.papers.has(data.paper)) report.errors.push(`${name}: unknown paper "${data.paper}"`)
  for (const [id, sol] of Object.entries(data.solutions)) {
    report.count++
    const q = bank.byId.get(id)
    if (q && q.paper !== data.paper) report.errors.push(`${id} › belongs to paper ${q.paper}, not ${data.paper}`)
    validateSolution(id, sol, q, report)
  }
  return report
}

export function solutionFiles(args = []) {
  if (!fs.existsSync(SOL_DIR)) return []
  const all = fs
    .readdirSync(SOL_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => path.join(SOL_DIR, f))
  if (!args.length) return all
  return args.map((a) => (fs.existsSync(a) ? path.resolve(a) : path.join(SOL_DIR, `${a.replace(/\.json$/, '')}.json`)))
}

export function validateAll(args = []) {
  return solutionFiles(args).map((f) => validateFile(f))
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const reports = validateAll(args.filter((a) => !a.startsWith('--')))
  if (!katex && !katexWarned) console.warn('! KaTeX not found (run npm ci in client/) — formulas were not parsed')
  let errors = 0
  let warnings = 0
  let solutions = 0
  for (const r of reports) {
    solutions += r.count
    errors += r.errors.length
    warnings += r.warnings.length
    const rel = path.relative(ROOT, r.file)
    if (!r.errors.length && !r.warnings.length) {
      console.log(`✓ ${rel} (${r.count} solutions)`)
      continue
    }
    console.log(`${r.errors.length ? '✗' : '!'} ${rel} (${r.count} solutions)`)
    for (const e of r.errors) console.log(`  error   ${e}`)
    for (const w of r.warnings) console.log(`  warning ${w}`)
  }
  console.log(`\n${reports.length} files, ${solutions} solutions: ${errors} errors, ${warnings} warnings`)
  process.exit(errors || (strict && warnings) ? 1 : 0)
}
