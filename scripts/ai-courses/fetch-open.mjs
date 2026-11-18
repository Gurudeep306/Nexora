#!/usr/bin/env node
// Downloads the freely available papers (arXiv and other legal open copies found
// by verify-sources.mjs) into docs/ai-courses/private/papers/, for agents to read.
// That folder is git-ignored: PDFs are never committed or re-hosted (arXiv's
// default licence doesn't allow re-hosting; publishers' licences don't either).
//
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs             all open papers
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs ho-2020 ...  only these ids
//
// Paywalled papers are not fetched: the owner downloads them with institutional
// access into the same folder, named <id>.pdf (the list is in sources/CHECK.md).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
const OUT = join(DOCS, 'private/papers')
mkdirSync(OUT, { recursive: true })
const want = new Set(process.argv.slice(2))
const check = JSON.parse(readFileSync(join(DOCS, 'sources/check.json'), 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let got = 0
let skipped = 0
const failed = []
for (const p of check.papers) {
  if (want.size && !want.has(p.id)) continue
  const file = join(OUT, `${p.id}.pdf`)
  if (existsSync(file)) {
    skipped++
    continue
  }
  const url = p.arxiv ? `https://arxiv.org/pdf/${p.arxiv}` : p.check?.access === 'open' ? p.check.read : null
  if (!url) continue // paywalled: the owner downloads it
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'NexoraGuru-source-fetch/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(60000) })
    const buf = Buffer.from(await r.arrayBuffer())
    if (!r.ok || buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(r.ok ? 'not a PDF (a landing page: open it by hand)' : `HTTP ${r.status}`)
    writeFileSync(file, buf)
    got++
  } catch (e) {
    failed.push(`${p.id}: ${e.message} (${url})`)
  }
  await sleep(p.arxiv ? 3100 : 800)
}
console.log(`Downloaded ${got}, already there ${skipped}, failed ${failed.length}. Folder: docs/ai-courses/private/papers (git-ignored).`)
if (failed.length) console.log('Open these by hand:\n- ' + failed.join('\n- '))
