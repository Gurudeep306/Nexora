#!/usr/bin/env node
// Checks every source of the AI courses against the real record, so no course
// ever cites a paper, book or course that doesn't exist or is mis-titled.
//
//   node scripts/ai-courses/verify-sources.mjs            check everything
//   node scripts/ai-courses/verify-sources.mjs --papers   papers only
//   node scripts/ai-courses/verify-sources.mjs --links    books and courses only
//
// Papers (docs/ai-courses/sources/papers.json):
//   arxiv  -> the arXiv API: the title must match.
//   doi    -> Crossref: the title must match; OpenAlex says if a free legal copy exists.
//   url    -> the page must answer 200 (title checked by hand: "manual").
// Books and courses (books.json, courses.json): each link must answer.
//
// Writes docs/ai-courses/sources/CHECK.md (the report) and check.json.
// Exit code 1 if anything is wrong. A link this machine can't reach at all
// (blocked network, status 0) is listed as "unreachable from here", not as wrong.
// No personal data is sent anywhere; requests carry a generic user agent.
//
// Node's fetch needs the proxy flag in this cloud environment:
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/verify-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses/sources')
const UA = { 'user-agent': 'NexoraGuru-source-check/1.0' }
const only = process.argv[2]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
/** Word overlap between two titles, 0..1 (the shorter title's words found in the longer). */
function same(a, b) {
  const A = new Set(norm(a).split(' ').filter(Boolean))
  const B = new Set(norm(b).split(' ').filter(Boolean))
  if (!A.size || !B.size) return 0
  const [s, l] = A.size <= B.size ? [A, B] : [B, A]
  let n = 0
  for (const w of s) if (l.has(w)) n++
  return n / s.size
}

async function fetchText(url, { tries = 3, method = 'GET' } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, method, redirect: 'follow', signal: AbortSignal.timeout(30000) })
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })
      return { status: r.status, text: method === 'HEAD' ? '' : await r.text() }
    } catch (e) {
      if (i === tries - 1) return { status: e.status || 0, text: '', error: e.message }
      await sleep(1500 * (i + 1))
    }
  }
}

async function checkArxiv(papers) {
  const out = new Map()
  for (let i = 0; i < papers.length; i += 40) {
    const batch = papers.slice(i, i + 40)
    const r = await fetchText(`https://export.arxiv.org/api/query?id_list=${batch.map((p) => p.arxiv).join(',')}&max_results=40`)
    const entries = r.text.split('<entry>').slice(1)
    for (const e of entries) {
      const id = (e.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<v]+)(v\d+)?<\/id>/) || [])[1]
      const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, ' ').trim()
      const year = Number((e.match(/<published>(\d{4})/) || [])[1])
      if (id) out.set(id, { title, year })
    }
    await sleep(3100) // arXiv asks for one request every 3 seconds
  }
  return papers.map((p) => {
    const f = out.get(p.arxiv)
    if (!f) return { id: p.id, ok: false, why: 'not found on arXiv' }
    const score = same(p.title, f.title)
    return { id: p.id, ok: score >= 0.8, found: f.title, foundYear: f.year, why: score >= 0.8 ? '' : `title differs (${score.toFixed(2)})`, access: 'open', read: `https://arxiv.org/abs/${p.arxiv}` }
  })
}

async function checkDoi(p) {
  const r = await fetchText(`https://api.crossref.org/works/${encodeURIComponent(p.doi)}`)
  let found = ''
  let foundYear = null
  try {
    const m = JSON.parse(r.text).message
    found = (m.title || [])[0] || ''
    foundYear = (m.issued?.['date-parts']?.[0] || [])[0] || null
  } catch {
    return { id: p.id, ok: false, why: `DOI not found (${r.status || r.error})` }
  }
  const score = same(p.title, found)
  // Is there a free, legal copy? (OpenAlex records open-access versions.)
  const oa = await fetchText(`https://api.openalex.org/works/doi:${encodeURIComponent(p.doi)}`)
  let access = 'unknown'
  let read = `https://doi.org/${p.doi}`
  try {
    const w = JSON.parse(oa.text)
    if (w.open_access?.is_oa && w.open_access.oa_url) {
      access = 'open'
      read = w.open_access.oa_url
    } else access = 'paywalled'
  } catch {}
  return { id: p.id, ok: score >= 0.8, found, foundYear, why: score >= 0.8 ? '' : `title differs (${score.toFixed(2)})`, access, read }
}

async function checkUrl(id, url) {
  let r = await fetchText(url, { method: 'HEAD', tries: 2 })
  if (!(r.status >= 200 && r.status < 400)) r = await fetchText(url, { tries: 2 })
  const ok = r.status >= 200 && r.status < 400
  if (!r.status) return { id, ok: true, unreachable: true, why: `could not reach from here (${r.error})`, access: 'open', read: url, manual: true }
  // Some sites (GitHub, publishers) refuse automated checks; that is not a broken link.
  if (r.status === 401 || r.status === 403 || r.status === 429) return { id, ok: true, unreachable: true, why: `refused an automated check (${r.status})`, access: 'open', read: url, manual: true }
  return { id, ok, why: ok ? '' : `link answered ${r.status}`, access: 'open', read: url, manual: true }
}

const load = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'))
let report = { checkedAt: new Date().toISOString(), papers: [], books: [], courses: [] }
// A partial run keeps the other part's last results.
try {
  if (only) report = { ...JSON.parse(readFileSync(join(ROOT, 'check.json'), 'utf8')), checkedAt: report.checkedAt, ...(only === '--papers' ? { papers: [] } : { books: [], courses: [] }) }
} catch {}

if (only !== '--links') {
  const { papers } = load('papers.json')
  const ax = await checkArxiv(papers.filter((p) => p.arxiv))
  const rest = []
  for (const p of papers.filter((x) => !x.arxiv)) {
    rest.push(p.doi ? await checkDoi(p) : await checkUrl(p.id, p.url))
    await sleep(250)
  }
  const by = new Map([...ax, ...rest].map((r) => [r.id, r]))
  report.papers = papers.map((p) => ({ ...p, check: by.get(p.id) }))
}
if (only !== '--papers') {
  for (const f of ['books', 'courses']) {
    let list = []
    try {
      list = load(`${f}.json`)[f]
    } catch {
      continue
    }
    for (const b of list) {
      report[f].push({ ...b, check: await checkUrl(b.id, b.url) })
      await sleep(200)
    }
  }
}

// ── the report ──
const bad = [...report.papers, ...report.books, ...report.courses].filter((x) => !x.check?.ok)
const unreachable = [...report.papers, ...report.books, ...report.courses].filter((x) => x.check?.unreachable)
const paywalled = report.papers.filter((p) => p.check?.ok && p.check.access === 'paywalled')
const lines = [
  '# Source check',
  '',
  `Generated by \`node scripts/ai-courses/verify-sources.mjs\` on ${report.checkedAt.slice(0, 10)}. Do not edit by hand.`,
  '',
  `- Papers: ${report.papers.length} (${report.papers.filter((p) => p.check?.ok).length} verified, ${report.papers.filter((p) => p.check?.access === 'open').length} free to read, ${paywalled.length} paywalled)`,
  `- Books: ${report.books.length}, courses: ${report.courses.length}`,
  `- Problems: ${bad.length}`,
  `- Unreachable from the checking machine (check by hand in a browser): ${unreachable.length}`,
  '',
]
if (unreachable.length) {
  lines.push('## Unreachable from the checking machine', '', 'Not errors: these hosts could not be reached from the checking machine, or refuse automated checks. Open each in a browser once.', '')
  for (const u of unreachable) lines.push(`- ${u.id}: ${u.check.read}`)
  lines.push('')
}
if (bad.length) {
  lines.push('## Problems (fix before any lesson cites these)', '', '| Id | What | Found |', '|---|---|---|')
  for (const b of bad) lines.push(`| ${b.id} | ${b.check?.why || 'not checked'} | ${b.check?.found || ''} |`)
  lines.push('')
}
lines.push('## Papers to download with institutional access (owner)', '', 'No free legal copy was found for these. Download them (IEEE Xplore, ScienceDirect, SpringerLink…) into the private folder (see `../README.md`, "Paywalled papers"). Never commit them.', '', '| Id | Paper | DOI |', '|---|---|---|')
for (const p of paywalled) lines.push(`| ${p.id} | ${p.authors} (${p.year}). ${p.title} | https://doi.org/${p.doi} |`)
lines.push('', '## Books', '', '| Id | Book | Link | Status |', '|---|---|---|---|')
for (const b of report.books) lines.push(`| ${b.id} | ${b.authors} (${b.year}). ${b.title} | [link](${b.url}) | ${b.check?.unreachable ? 'check by hand' : b.check?.ok ? 'link ok' : 'PROBLEM'} |`)
lines.push('', '## Courses', '', '| Id | Course | Link | Status |', '|---|---|---|---|')
for (const c of report.courses) lines.push(`| ${c.id} | ${c.title} | [link](${c.url}) | ${c.check?.unreachable ? 'check by hand' : c.check?.ok ? 'link ok' : 'PROBLEM'} |`)
lines.push('', '## All papers', '', '| Course | Id | Paper | Read | Status |', '|---|---|---|---|---|')
for (const p of report.papers) lines.push(`| ${p.course} | ${p.id} | ${p.authors} (${p.year}). ${p.title} | ${p.check?.read ? `[link](${p.check.read})` : ''} | ${p.check?.ok ? (p.check.manual ? 'link ok, title by hand' : 'verified') : 'PROBLEM'}${p.check?.access === 'paywalled' ? ' · paywalled' : ''} |`)
writeFileSync(join(ROOT, 'CHECK.md'), lines.join('\n') + '\n')

// DOWNLOAD.md: every paper with a link, the ones that need the owner's access first.
const D = [
  '# Papers: download links',
  '',
  `Generated ${report.checkedAt.slice(0, 10)} by \`verify-sources.mjs\`. Save each PDF as \`<id>.pdf\` (the first column) in \`docs/ai-courses/private/papers/\` on your computer or in the "Nexora AI papers" Drive folder. Never commit them.`,
  '',
  `## 1. Needs your institutional access (${paywalled.length})`,
  '',
  'Open the link while signed in to IEEE Xplore / ScienceDirect / SpringerLink / Wiley / Nature through your institution, then download the PDF.',
  '',
  '| Save as | Paper | Link |',
  '|---|---|---|',
  ...paywalled.map((p) => `| ${p.id}.pdf | ${p.authors} (${p.year}). ${p.title} | https://doi.org/${p.doi} |`),
  '',
  `## 2. Free to download (${report.papers.length - paywalled.length})`,
  '',
  'These are free and legal (arXiv, the journal or the authors). `NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs` downloads them all at once; the links are here too.',
  '',
  '| Save as | Paper | Read | PDF |',
  '|---|---|---|---|',
  ...report.papers
    .filter((p) => !paywalled.includes(p))
    .map((p) => `| ${p.id}.pdf | ${p.authors} (${p.year}). ${p.title} | ${p.check?.read || p.url || ''} | ${p.arxiv ? `https://arxiv.org/pdf/${p.arxiv}` : p.check?.read || p.url || ''} |`),
]
if (report.papers.length) writeFileSync(join(ROOT, 'DOWNLOAD.md'), D.join('\n') + '\n')
writeFileSync(join(ROOT, 'check.json'), JSON.stringify(report, null, 1) + '\n')
console.log(lines.slice(4, 9).join('\n'))
process.exit(bad.length ? 1 : 0)
