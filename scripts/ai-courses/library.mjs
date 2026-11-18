#!/usr/bin/env node
// The paper library for the AI courses: every PDF in one place, sorted by course.
//
//   docs/ai-courses/private/library/<NN>-<course>/<paper-id>.pdf   (git-ignored, never committed)
//   docs/ai-courses/private/library/manifest.json                  (what we have, where it came from)
//   docs/ai-courses/sources/LIBRARY.md                             (committed: which papers we have, no PDFs)
//
//   node scripts/ai-courses/library.mjs import <folder>   identify PDFs the owner gave (by their text, see MATCH)
//                                                          and file them under their paper ids
//   node scripts/ai-courses/library.mjs index             rebuild manifest.json and LIBRARY.md
//   node scripts/ai-courses/library.mjs pack <out.zip>    zip the owner-supplied (paywalled) papers, sorted,
//                                                          so the owner can keep them and re-upload in a new session
//
// Free papers are fetched into the same folders by fetch-open.mjs.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
export const LIB = join(DOCS, 'private/library')
const papers = JSON.parse(readFileSync(join(DOCS, 'sources/papers.json'), 'utf8')).papers
const courses = JSON.parse(readFileSync(join(DOCS, 'curriculum.json'), 'utf8')).courses.map((c) => c.id)
export const folderOf = (course) => `${String(courses.indexOf(course)).padStart(2, '0')}-${course}`
export const pathOf = (p) => join(LIB, folderOf(p.course), `${p.id}.pdf`)

/** Phrases from each paper's first pages that identify it (checked on the real PDFs). */
const MATCH = {
  'shannon-1948': /mathematical theory of communication/i,
  'polyak-1964': /speeding up the convergence of iteration methods/i,
  'metropolis-1953': /equation of state calculations by fast computing machines/i,
  'hastings-1970': /monte carlo sampling methods using markov chains/i,
  'cox-1958': /regression analysis of binary sequences|D\. R\. Cox/i,
  'hoerl-1970': /ridge regression: biased estimation/i,
  'tibshirani-1996': /regression shrinkage and selection via the lasso/i,
  'cover-1967': /nearest neighbor decision rule assigns/i,
  'friedman-2001': /gradient boosting machine/i,
  'boser-1992': /training algorithm that maximizes the margin/i,
  'hotelling-1933': /analysis of a complex of statistical variables into principal components/i,
  'hyvarinen-2000': /independent component analysis: algorithms/i,
  'rabiner-1989': /tutorial on hidden markov models/i,
  'vapnik-1971': /uniform convergence of relative frequencies/i,
  'rosenblatt-1958': /the perceptron: a probabilistic model/i,
  'hornik-1989': /multilayer feedforward networks are universal approximators/i,
  'bengio-1994': /learning long-term dependencies with gradient descent is difficult/i,
  'hochreiter-1997': /long short-term memory/i,
  'fukushima-1980': /neocognitron/i,
  'hinton-2006': /fast learning algorithm for deep belief nets/i,
  'hinton-2006b': /reduce the dimensionality of data/i,
  'vincent-2008': /robust features with denoising autoencoders/i,
  'deng-2009': /imagenet: a large-scale hierarchical image database/i,
  'pennington-2014': /glove: global vectors for word representation/i,
  'mnih-2015': /human-level control through deep reinforcement learning/i,
  'silver-2016': /mastering the game of go with deep neural networks and tree search/i,
  'silver-2017': /mastering the game of go without human knowledge/i,
  'patarasuk-2009': /bandwidth optimal all-reduce/i,
}
/** Scanned PDFs with no text layer: identified by eye, matched by file name. */
const SCANNED = { 'backprop_old.pdf': 'rumelhart-1986', 'bias-variance.pdf': 'geman-1992' }
/** Known partial copies. */
const NOTES = { 'hotelling-1933': 'Part 2 only (the continuation, from the next issue). Part 1 is still needed.' }

const text = (f) => {
  try {
    return execFileSync('pdftotext', ['-l', '3', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  } catch {
    return ''
  }
}
const isPdf = (f) => readFileSync(f).subarray(0, 5).toString() === '%PDF-'
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))
const manifestPath = join(LIB, 'manifest.json')
const loadManifest = () => (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { papers: {} })

function importFolder(dir) {
  const man = loadManifest()
  const byId = new Map(papers.map((p) => [p.id, p]))
  const out = []
  for (const f of walk(dir).filter((x) => x.toLowerCase().endsWith('.pdf') && !basename(x).startsWith('._'))) {
    if (!isPdf(f)) {
      out.push(`skip ${basename(f)}: not a PDF`)
      continue
    }
    const t = text(f).replace(/\s+/g, ' ')
    const id = SCANNED[basename(f)] || Object.keys(MATCH).find((k) => MATCH[k].test(t))
    if (!id) {
      out.push(`?? ${basename(f)}: not recognised (add a MATCH phrase)`)
      continue
    }
    const p = byId.get(id)
    mkdirSync(dirname(pathOf(p)), { recursive: true })
    copyFileSync(f, pathOf(p))
    man.papers[id] = { source: 'owner (institutional access)', original: basename(f), ...(NOTES[id] ? { note: NOTES[id] } : {}) }
    out.push(`ok ${basename(f)} -> ${folderOf(p.course)}/${id}.pdf`)
  }
  writeFileSync(manifestPath, JSON.stringify(man, null, 1))
  console.log(out.join('\n'))
}

function index() {
  const man = loadManifest()
  mkdirSync(LIB, { recursive: true })
  const pages = (f) => {
    try {
      return Number(execFileSync('pdfinfo', [f], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1])
    } catch {
      return null
    }
  }
  let have = 0
  const rows = []
  for (const p of papers) {
    const f = pathOf(p)
    const e = man.papers[p.id] || {}
    if (existsSync(f)) {
      have++
      const buf = readFileSync(f)
      Object.assign(e, { file: `${folderOf(p.course)}/${p.id}.pdf`, bytes: buf.length, pages: pages(f), sha256: createHash('sha256').update(buf).digest('hex'), source: e.source || 'free copy (fetch-open.mjs)' })
      man.papers[p.id] = e
    } else delete man.papers[p.id]
    rows.push({ p, e: existsSync(f) ? e : null })
  }
  writeFileSync(manifestPath, JSON.stringify(man, null, 1))
  const L = [
    '# Paper library',
    '',
    'Generated by `node scripts/ai-courses/library.mjs index`. Lists which papers we hold; the PDFs themselves live in `docs/ai-courses/private/library/<NN>-<course>/<paper-id>.pdf` (git-ignored, never committed or published).',
    '',
    `**${have} of ${papers.length} papers in the library.** Free copies come from \`fetch-open.mjs\`; the paywalled ones from the owner's institutional access (\`library.mjs import\`).`,
    '',
  ]
  for (const c of courses) {
    const list = rows.filter((r) => r.p.course === c)
    if (!list.length) continue
    L.push(`## ${folderOf(c)}`, '', '| Paper | Id | Have | Pages | From | Note |', '|---|---|---|---|---|---|')
    for (const { p, e } of list) L.push(`| ${p.authors} (${p.year}). ${p.title} | ${p.id} | ${e ? 'yes' : '**missing**'} | ${e?.pages ?? ''} | ${e ? (e.source.startsWith('owner') ? 'owner' : 'free') : ''} | ${e?.note || ''} |`)
    L.push('')
  }
  writeFileSync(join(DOCS, 'sources/LIBRARY.md'), L.join('\n'))
  console.log(`Library: ${have} of ${papers.length} papers. Wrote manifest.json and sources/LIBRARY.md`)
}

function pack(out) {
  const man = loadManifest()
  const files = Object.entries(man.papers).filter(([, e]) => e.source?.startsWith('owner') && e.file).map(([, e]) => e.file)
  execFileSync('zip', ['-q', '-X', out, 'manifest.json', ...files], { cwd: LIB })
  console.log(`Packed ${files.length} owner papers into ${out}`)
}

const [cmd, arg] = process.argv.slice(2)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (!isMain) {
  // imported by fetch-open.mjs: no command
} else if (cmd === 'import' && arg) importFolder(arg), index()
else if (cmd === 'index') index()
else if (cmd === 'pack' && arg) pack(arg)
else console.log('Usage: library.mjs import <folder> | index | pack <out.zip>')
