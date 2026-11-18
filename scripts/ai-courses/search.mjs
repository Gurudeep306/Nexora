#!/usr/bin/env node
// Search everything in the AI-course library (papers, books, courses, sites, code)
// by meaning words, down to the page or line. So an agent asks "where is the
// LSTM gate equation derived?" and gets the book, the page and a snippet.
//
//   node scripts/ai-courses/search.mjs --build                      (re)build the index from the library
//   node scripts/ai-courses/search.mjs "backpropagation derivation" [--kind book|paper|course|site|repo] [--source d2l] [--limit 10]
//   node scripts/ai-courses/search.mjs --map                        for every topic in curriculum.json, find where it is
//                                                                   covered; writes sources/TOPIC-MAP.md and topic-map.json
//
// The index (docs/ai-courses/private/index.sqlite) holds text and stays private.
// TOPIC-MAP.md / topic-map.json are committed: they hold only pointers (source,
// file, page or line), never the text, so they survive when the machine is gone.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
const LIB = join(DOCS, 'private/library')
const DB = join(DOCS, 'private/index.sqlite')
const argv = process.argv.slice(2)
const opt = (k) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const CODE = /\.(py|ipynb|md|markdown|rst|tex|txt|c|h|cu|cuh|cpp|hpp|js|ts|jsx|tsx|jl)$/i
const MAX_FILE = 4e6

/** Kind and source id from a library path: <NN-course>/<paper>.pdf, or books|courses|sites|repos/<id>/... */
function where(file) {
  const parts = relative(LIB, file).split('/')
  if (/^\d\d-/.test(parts[0])) return { kind: 'paper', source: parts[1].replace(/\.pdf$/, ''), file: parts.slice(1).join('/') }
  const kind = { books: 'book', courses: 'course', sites: 'site', repos: 'repo' }[parts[0]]
  return kind ? { kind, source: parts[1], file: parts.slice(2).join('/') } : null
}

function* walk(d) {
  for (const n of readdirSync(d)) {
    if (n === '.git' || n === 'node_modules') continue
    const p = join(d, n)
    const s = statSync(p)
    if (s.isDirectory()) yield* walk(p)
    else yield [p, s.size]
  }
}

const stripHtml = (h) =>
  h
    .replace(/<(script|style|nav|header|footer|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')

/** Chunks of a file: [location, text]. PDFs by page, code by ~60 lines, HTML by ~1500 characters. */
function chunks(path) {
  if (/\.pdf$/i.test(path)) {
    let t = ''
    try {
      t = execFileSync('pdftotext', ['-q', path, '-'], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      return []
    }
    return t.split('\f').map((p, i) => [`p. ${i + 1}`, p.replace(/\s+/g, ' ')]).filter(([, p]) => p.length > 40)
  }
  if (/\.html?$/i.test(path)) {
    const t = stripHtml(readFileSync(path, 'utf8'))
    const out = []
    for (let i = 0; i < t.length; i += 1500) out.push([`part ${i / 1500 + 1}`, t.slice(i, i + 1600)])
    return out
  }
  if (CODE.test(path)) {
    let t = readFileSync(path, 'utf8')
    if (/\.ipynb$/i.test(path)) {
      try {
        t = JSON.parse(t).cells.map((c) => (Array.isArray(c.source) ? c.source.join('') : c.source)).join('\n\n')
      } catch {
        return []
      }
    }
    const lines = t.split('\n')
    const out = []
    for (let i = 0; i < lines.length; i += 60) out.push([`line ${i + 1}`, lines.slice(i, i + 60).join('\n')])
    return out
  }
  return []
}

function build() {
  if (existsSync(DB)) unlinkSync(DB)
  const db = new DatabaseSync(DB)
  db.exec(`CREATE VIRTUAL TABLE doc USING fts5(text, kind UNINDEXED, source UNINDEXED, file UNINDEXED, loc UNINDEXED, tokenize = 'porter unicode61')`)
  const ins = db.prepare('INSERT INTO doc(text, kind, source, file, loc) VALUES (?,?,?,?,?)')
  let files = 0
  let rows = 0
  db.exec('BEGIN')
  for (const [p, size] of walk(LIB)) {
    if (size > MAX_FILE * 25 || (!/\.pdf$/i.test(p) && size > MAX_FILE)) continue
    const w = where(p)
    if (!w) continue
    const cs = chunks(p)
    if (!cs.length) continue
    files++
    for (const [loc, text] of cs) {
      ins.run(text, w.kind, w.source, w.file, loc)
      rows++
    }
  }
  db.exec('COMMIT')
  console.log(`Index built: ${files} files, ${rows} passages. (${relative(process.cwd(), DB)}, private)`)
}

const STOP = new Set('a an and the of to in on for with by from as at is are be or vs its it how why what when one two many all more using use your our their into via and/or'.split(' '))
const terms = (q) =>
  q
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))

function search(db, q, { kind, source, limit = 10, mode = 'OR' } = {}) {
  const t = terms(q)
  if (!t.length) return []
  const match = t.map((w) => `"${w}"`).join(` ${mode} `)
  const where = ['doc MATCH ?']
  const params = [match]
  if (kind) where.push('kind = ?'), params.push(kind)
  if (source) where.push('source = ?'), params.push(source)
  return db
    .prepare(`SELECT kind, source, file, loc, bm25(doc) AS score, snippet(doc, 0, '[', ']', '…', 14) AS snip FROM doc WHERE ${where.join(' AND ')} ORDER BY score LIMIT ?`)
    .all(...params, limit)
}

function map() {
  const db = new DatabaseSync(DB, { readOnly: true })
  const cur = JSON.parse(readFileSync(join(DOCS, 'curriculum.json'), 'utf8'))
  const KINDS = ['paper', 'book', 'course', 'site', 'repo']
  const out = { about: 'Where each topic is covered in the library (pointers only, no text). Generated by search.mjs --map; check by hand before citing.', topics: {} }
  const L = ['# Topic map: where each topic is covered', '', 'Generated by `node scripts/ai-courses/search.mjs --map` from the private library index. Pointers only (source, file, page or line), found by keyword search: **a starting point for the writer, not a citation**. Check each one before using it.', '']
  for (const c of cur.courses) {
    L.push(`## ${c.title}`, '')
    for (const ch of c.chapters)
      for (const t of ch.topics) {
        const q = t.title.replace(/\(.*?\)/g, ' ')
        const best = {}
        for (const k of KINDS) {
          // All words first (precise); fall back to any word.
          let r = search(db, q, { kind: k, limit: 12, mode: 'AND' })
          if (r.length < 2) r = search(db, q, { kind: k, limit: 12 })
          const seen = new Set()
          best[k] = r
            .filter((x) => !seen.has(x.source) && seen.add(x.source))
            .slice(0, 3)
            .map((x) => ({ source: x.source, file: x.file, loc: x.loc }))
        }
        out.topics[t.id] = best
        const line = KINDS.filter((k) => best[k].length)
          .map((k) => `${k}s: ${best[k].map((x) => `${x.source} (${x.file.length > 40 ? '…' + x.file.slice(-38) : x.file}, ${x.loc})`).join('; ')}`)
          .join(' · ')
        L.push(`- **${t.title}** \`${t.id}\` — ${line || 'nothing found yet'}`)
      }
    L.push('')
  }
  writeFileSync(join(DOCS, 'sources/topic-map.json'), JSON.stringify(out, null, 1) + '\n')
  writeFileSync(join(DOCS, 'sources/TOPIC-MAP.md'), L.join('\n') + '\n')
  console.log(`Mapped ${Object.keys(out.topics).length} topics. Wrote sources/TOPIC-MAP.md and topic-map.json`)
}

if (argv.includes('--build')) build()
else if (argv.includes('--map')) map()
else {
  const q = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')).join(' ')
  if (!q) {
    console.log('Usage: search.mjs --build | --map | "words" [--kind k] [--source id] [--limit n]')
    process.exit(0)
  }
  if (!existsSync(DB)) {
    console.error('No index yet: run search.mjs --build')
    process.exit(1)
  }
  const db = new DatabaseSync(DB, { readOnly: true })
  for (const r of search(db, q, { kind: opt('kind'), source: opt('source'), limit: Number(opt('limit')) || 10 })) console.log(`${r.kind.padEnd(6)} ${r.source} · ${r.file} · ${r.loc}\n       ${r.snip}\n`)
}
