#!/usr/bin/env node
// The ladder check for the AI courses (docs/ai-courses/curriculum.json):
//   - every topic id is unique;
//   - everything a topic needs is taught BEFORE it (earlier in the same course,
//     or in an earlier course), so no lesson ever uses an idea not yet taught;
//   - every paper id exists in sources/papers.json.
// Then writes docs/ai-courses/CURRICULUM.md from the same data (never edit that file by hand).
//
//   node scripts/ai-courses/check-curriculum.mjs          check and write
//   node scripts/ai-courses/check-curriculum.mjs --check  check only (CI)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
const cur = JSON.parse(readFileSync(join(DIR, 'curriculum.json'), 'utf8'))
const papers = new Map(JSON.parse(readFileSync(join(DIR, 'sources/papers.json'), 'utf8')).papers.map((p) => [p.id, p]))

const errors = []
const order = new Map() // topic id -> position in teaching order
const where = new Map() // topic id -> course title
let n = 0
for (const c of cur.courses)
  for (const ch of c.chapters)
    for (const t of ch.topics) {
      if (order.has(t.id)) errors.push(`${t.id}: used twice`)
      order.set(t.id, n++)
      where.set(t.id, c.title)
    }
const used = new Set()
for (const c of cur.courses)
  for (const ch of c.chapters)
    for (const t of ch.topics) {
      if (!t.needs.length && order.get(t.id) > 0 && c.id !== 'foundations') errors.push(`${t.id}: needs nothing — every topic after Foundations builds on something`)
      for (const p of t.needs) {
        if (!order.has(p)) errors.push(`${t.id}: needs "${p}", which doesn't exist`)
        else if (order.get(p) >= order.get(t.id)) errors.push(`${t.id}: needs "${p}", which is taught later (${where.get(p)}) — move one of them`)
      }
      for (const p of t.papers) {
        if (!papers.has(p)) errors.push(`${t.id}: paper "${p}" is not in sources/papers.json`)
        used.add(p)
      }
    }

const unused = [...papers.keys()].filter((p) => !used.has(p))
if (errors.length) {
  console.error(`The ladder is broken (${errors.length}):\n- ` + errors.join('\n- '))
  process.exit(1)
}
console.log(`Ladder OK: ${n} topics in ${cur.courses.length} courses; every prerequisite comes first. Papers used: ${used.size} of ${papers.size}.`)
if (unused.length) console.log(`Papers in the registry no topic cites yet: ${unused.join(', ')}`)
if (process.argv.includes('--check')) process.exit(0)

// ── CURRICULUM.md ──
const title = new Map()
for (const c of cur.courses) for (const ch of c.chapters) for (const t of ch.topics) title.set(t.id, t.title)
const L = [
  '# Curriculum',
  '',
  'Generated from `curriculum.json` by `node scripts/ai-courses/check-curriculum.mjs`. Edit the JSON, not this file.',
  '',
  'The courses are in teaching order. Every topic builds only on topics above it ("Builds on"), so a student can start at the first line knowing nothing and reach the last. Topics marked **GATE DA** are in the GATE Data Science & AI syllabus.',
  '',
  `${n} topics · ${cur.courses.length} courses · ${used.size} papers`,
  '',
]
for (const [ci, c] of cur.courses.entries()) L.push(`- [${ci}. ${c.title}](#${ci}-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`)
L.push('')
for (const [ci, c] of cur.courses.entries()) {
  L.push(`## ${ci}. ${c.title}`, '', c.blurb, '', `Nexus subject: \`${c.nexus}\``, '')
  for (const [hi, ch] of c.chapters.entries()) {
    L.push(`### ${ci}.${hi + 1} ${ch.title}`, '')
    for (const t of ch.topics) {
      L.push(`- **${t.title}** \`${t.id}\`${t.gateDA ? ' · GATE DA' : ''}`)
      if (t.needs.length) L.push(`  - Builds on: ${t.needs.map((p) => title.get(p)).join('; ')}`)
      if (t.visual) L.push(`  - See it: ${t.visual}`)
      if (t.papers.length) L.push(`  - Papers: ${t.papers.map((p) => { const x = papers.get(p); return `${x.authors} ${x.year}, *${x.title}*` }).join('; ')}`)
    }
    L.push('')
  }
}
writeFileSync(join(DIR, 'CURRICULUM.md'), L.join('\n'))
console.log('Wrote docs/ai-courses/CURRICULUM.md')
