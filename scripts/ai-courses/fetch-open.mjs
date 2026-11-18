#!/usr/bin/env node
// Downloads the freely available papers (arXiv and other legal open copies found
// by verify-sources.mjs) into the paper library, docs/ai-courses/private/library/
// <NN>-<course>/<paper-id>.pdf (see library.mjs), for agents to read.
// That folder is git-ignored: PDFs are never committed or re-hosted (arXiv's
// default licence doesn't allow re-hosting; publishers' licences don't either).
//
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs             all open papers
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs ho-2020 ...  only these ids
//
// Paywalled papers are not fetched: the owner downloads them with institutional
// access; `library.mjs import <folder>` files them (the list is in sources/DOWNLOAD.md).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pathOf } from './library.mjs'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
const want = new Set(process.argv.slice(2))
const check = JSON.parse(readFileSync(join(DOCS, 'sources/check.json'), 'utf8'))
const papersById = new Map(JSON.parse(readFileSync(join(DOCS, 'sources/papers.json'), 'utf8')).papers.map((x) => [x.id, x]))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Articles that exist only as web pages. */
const WEB_ONLY = /transformer-circuits\.pub/
async function grab(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'NexoraGuru-source-fetch/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(60000) })
  const buf = Buffer.from(await r.arrayBuffer())
  if (!r.ok) return { status: r.status }
  if (buf.subarray(0, 5).toString() === '%PDF-') return { pdf: buf, url: r.url }
  return { html: buf.toString('utf8'), url: r.url }
}

let got = 0
let skipped = 0
const failed = []
for (const p of check.papers) {
  if (want.size && !want.has(p.id)) continue
  const file = pathOf(p)
  mkdirSync(dirname(file), { recursive: true })
  if (existsSync(file) || existsSync(file.replace(/\.pdf$/, '.html'))) {
    skipped++
    continue
  }
  // A direct PDF address in papers.json (`pdf`) wins; then arXiv; then the open copy the check found.
  const src = papersById.get(p.id) || p
  const url = src.pdf || (p.arxiv ? `https://arxiv.org/pdf/${p.arxiv}` : p.check?.access === 'open' ? p.check.read : null)
  if (!url) continue // paywalled: the owner downloads it
  try {
    let r = await grab(url)
    if (!r.pdf && r.html) {
      // A landing page: journals name the PDF in <meta name="citation_pdf_url">; else take a link to a .pdf.
      const meta = r.html.match(/<meta[^>]+name=["']citation_pdf_url["'][^>]+content=["']([^"']+)["']/i) || r.html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_pdf_url["']/i)
      const link = meta?.[1] || [...r.html.matchAll(/href=["']([^"']+\.pdf)["']/gi)].map((m) => m[1])[0]
      if (link) r = await grab(new URL(link, r.url).href)
      else if (WEB_ONLY.test(url)) {
        writeFileSync(file.replace(/\.pdf$/, '.html'), r.html) // published only as a web article
        got++
        continue
      }
    }
    if (!r.pdf) throw new Error(r.status ? `HTTP ${r.status}` : 'no PDF found on its page (open it by hand)')
    writeFileSync(file, r.pdf)
    got++
  } catch (e) {
    failed.push(`${p.id}: ${e.message} (${url})`)
  }
  await sleep(p.arxiv ? 3100 : 800)
}
console.log(`Downloaded ${got}, already there ${skipped}, failed ${failed.length}. Library: docs/ai-courses/private/library (git-ignored).`)
execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'library.mjs'), 'index'], { stdio: 'inherit' })
if (failed.length) console.log('Open these by hand:\n- ' + failed.join('\n- '))
