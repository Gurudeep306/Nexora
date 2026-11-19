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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
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
/** Not worth indexing: site code bundles, minified files, translations, tag and listing pages. */
const JUNK = /(\.min\.js|bundle\.js|template\.v\d\.js|\/dist\/[^/]*\.js|\/assets\/js\/|\/translations?\/|(^|[_/])tags?[_/]|[_/]page[_/]\d|[_/]categories[_/]|node_modules|\.lock$|package-lock)/i
const OCR = join(DOCS, 'private/ocr')
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
/** Text of a scanned PDF by OCR (tesseract), cached in private/ocr so it runs once. */
function ocr(path) {
  const cache = join(OCR, relative(LIB, path).replace(/[/\\]/g, '__') + '.txt')
  if (existsSync(cache)) return readFileSync(cache, 'utf8')
  let has = true
  try {
    execFileSync('tesseract', ['--version'], { stdio: 'ignore' })
  } catch {
    has = false
  }
  if (!has) return ''
  mkdirSync(OCR, { recursive: true })
  const tmp = join(OCR, 'tmp')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp)
  execFileSync('pdftoppm', ['-r', '200', '-gray', '-png', path, join(tmp, 'p')], { stdio: 'ignore' })
  const pages = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort()
  const text = pages.map((f) => {
    try {
      return execFileSync('tesseract', [join(tmp, f), '-', '--psm', '1'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      return ''
    }
  }).join('\f')
  rmSync(tmp, { recursive: true, force: true })
  writeFileSync(cache, text)
  console.log(`  OCR: ${relative(LIB, path)} (${pages.length} pages)`)
  return text
}

function chunks(path) {
  if (/\.pdf$/i.test(path)) {
    let t = ''
    try {
      t = execFileSync('pdftotext', ['-q', path, '-'], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      return []
    }
    // A scan has (almost) no text layer: read it with OCR instead.
    if (t.replace(/\s+/g, '').length < 500 && statSync(path).size > 100000) t = ocr(path)
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
    if (!w || JUNK.test(p) || (/\.(js|ts|jsx|tsx)$/i.test(p) && w.kind !== 'repo')) continue
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

/** One word as an FTS group, with its American spelling too (optimiser → optimizer). */
const group = (w) => {
  const us = w.replace(/is(e|ed|es|er|ers|ing|ation|ations)$/, 'iz$1').replace(/our$/, 'or')
  return us !== w ? `("${w}" OR "${us}")` : `"${w}"`
}
const usPhrase = (t) => t.map((w) => w.replace(/is(e|ed|es|er|ers|ing|ation|ations)$/, 'iz$1')).join(' ')

function search(db, q, { kind, source, limit = 10, mode = 'OR', also } = {}) {
  const t = terms(q)
  if (!t.length) return []
  // PHRASE: the words next to each other; AND: all of them; OR: any.
  // also: extra title words, at least one of which must appear too (stops a common tag like "zero" matching anything).
  let match =
    mode === 'PHRASE' ? (usPhrase(t) !== t.join(' ') ? `("${t.join(' ')}" OR "${usPhrase(t)}")` : `"${t.join(' ')}"`) : t.map(group).join(` ${mode} `)
  const extra = also ? terms(also).filter((w) => !t.includes(w)) : []
  if (extra.length) match = `(${match}) AND (${extra.map(group).join(' OR ')})`
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
  const papersById = new Map(JSON.parse(readFileSync(join(DOCS, 'sources/papers.json'), 'utf8')).papers.map((p) => [p.id, p]))
  const out = { about: 'Where each topic is covered in the library (pointers only, no text). Generated by search.mjs --map; check by hand before citing.', topics: {} }
  const L = ['# Topic map: where each topic is covered', '', 'Generated by `node scripts/ai-courses/search.mjs --map` from the private library index. Pointers only (source, file, page or line), found by keyword search: **a starting point for the writer, not a citation**. Check each one before using it.', '']
  for (const c of cur.courses) {
    L.push(`## ${c.title}`, '')
    for (const ch of c.chapters)
      for (const t of ch.topics) {
        // The words that name the idea: the title (without "derived", "in full"…) plus the topic's paper tags.
        const q = t.title.replace(/\(.*?\)/g, ' ').replace(/\b(derived|in full|from scratch|step by step|and why[^:]*|in practice|introduction)\b/gi, ' ')
        const tags = [...new Set(t.papers.flatMap((p) => papersById.get(p)?.topics || []).map((x) => x.replace(/-/g, ' ')))]
        const best = {}
        for (const k of KINDS) {
          const seen = new Set()
          const take = (rows) => rows.filter((x) => !seen.has(x.source) && seen.add(x.source))
          let picked = []
          // The topic's own papers first: its best page in each.
          if (k === 'paper')
            for (const pid of t.papers) {
              const hit = take(search(db, q, { kind: k, source: pid, limit: 1 }).concat(search(db, `${q} ${tags.join(' ')}`, { kind: k, source: pid, limit: 1 })))
              // Its own paper is always listed, even when the old wording doesn't match ("back-propagating").
              picked.push(...(hit.length ? hit : seen.has(pid) ? [] : (seen.add(pid), [{ source: pid, file: `${pid}.pdf`, loc: 'whole paper' }])))
            }
          // Then the exact phrase, then all words, then all words of a tag, then any word.
          // No "any word" fallback: a wrong pointer is worse than "nothing found".
          for (const [query, mode, also] of [[q, 'PHRASE'], [q, 'AND'], ...tags.map((g) => [g, 'PHRASE', q])]) {
            if (picked.length >= 3) break
            picked.push(...take(search(db, query, { kind: k, limit: 12, mode, also })))
          }
          best[k] = picked.slice(0, k === 'paper' ? Math.max(3, t.papers.length) : 3).map((x) => ({ source: x.source, file: x.file, loc: x.loc }))
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
