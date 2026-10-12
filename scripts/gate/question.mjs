#!/usr/bin/env node
/*
  Prints GATE questions for solution authors.

    node scripts/gate/question.mjs cse-2012-cs-40      # one question
    node scripts/gate/question.mjs cse-2012            # a whole paper (in paper order)
    node scripts/gate/question.mjs cse-2012 --todo     # only those without a v2 solution
    node scripts/gate/question.mjs cse-2012-cs-40 --json
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'gate', 'questions.json'), 'utf8'))
const args = process.argv.slice(2)
const target = args.find((a) => !a.startsWith('--'))
if (!target) {
  console.log('usage: question.mjs <questionId | paperId> [--todo] [--json]')
  process.exit(1)
}
const isPaper = bank.papers.some((p) => p.id === target)
const paperOf = isPaper ? target : bank.questions.find((q) => q.id === target)?.paper
const solFile = paperOf && path.join(ROOT, 'src', 'gate', 'solutions', `${paperOf}.json`)
const done = solFile && fs.existsSync(solFile) ? new Set(Object.keys(JSON.parse(fs.readFileSync(solFile, 'utf8')).solutions)) : new Set()

let qs = isPaper ? bank.questions.filter((q) => q.paper === target) : bank.questions.filter((q) => q.id === target)
qs.sort((a, b) => (a.section === 'ga' ? 0 : 1) - (b.section === 'ga' ? 0 : 1) || String(a.number).localeCompare(String(b.number), undefined, { numeric: true }))
if (args.includes('--todo')) qs = qs.filter((q) => !done.has(q.id))
if (!qs.length) {
  console.log(isPaper || paperOf ? 'Nothing to show.' : `No question or paper "${target}".`)
  process.exit(isPaper || paperOf ? 0 : 1)
}
if (args.includes('--json')) {
  console.log(JSON.stringify(qs.map(({ solution, ...q }) => q), null, 2))
  process.exit(0)
}
for (const q of qs) {
  console.log(`\n══ ${q.id}  ${q.type} · ${q.marks ?? '?'} mark(s) · ${q.subject}/${q.topic}${done.has(q.id) ? '  [v2 done]' : ''}`)
  console.log(`   key: ${JSON.stringify(q.answer)} (${q.answerSource ?? 'no source'})${q.needsReview ? `  ⚠ needsReview: ${q.reviewNote ?? ''}` : ''}`)
  console.log(q.text.split('\n').map((l) => `   ${l}`).join('\n'))
  for (const o of q.options || []) console.log(`   (${o.l}) ${o.t}`)
  for (const f of q.figures || []) console.log(`   [figure ${f.f}] ${f.alt}`)
}
