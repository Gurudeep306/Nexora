// What is missing from the imported problems, per source and per problem —
// the same audit as Admin → Problem sources → "What is missing".
//
//   node scripts/problems/audit.mjs                         every source: counts of each gap
//   node scripts/problems/audit.mjs --source codechef       that source, with its problems listed
//   node scripts/problems/audit.mjs --source cses --gap samples --limit 50
//   node scripts/problems/audit.mjs --json                  machine-readable
//
// Reads the database the server uses (DB_PATH, or Turso with TURSO_DATABASE_URL);
// it only reads. A gap is only counted where the judge publishes that thing
// at all (LeetCode has no time limits, Project Euler no samples).
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(path.join(ROOT, 'package.json'))
const imp = require('./src/problem-import')
const sources = require('./src/sources')

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const json = args.includes('--json')
const only = opt('source')
const gap = opt('gap')
const limit = Number(opt('limit')) || 30

if (only && !sources.SOURCES[only]) {
  console.error(`Unknown source "${only}". Sources: ${sources.MODULES.join(', ')}`)
  process.exit(2)
}
if (gap && !imp.GAPS.includes(gap)) {
  console.error(`Unknown gap "${gap}". Gaps: ${imp.GAPS.join(', ')}`)
  process.exit(2)
}

const ids = only ? [only] : sources.MODULES
const report = []
for (const id of ids) {
  const { summary, rows } = await imp.auditSource(id, { refresh: true })
  report.push({ ...summary, name: sources.SOURCES[id].name, rows: only ? rows.filter((r) => !gap || r.gaps.includes(gap)) : undefined })
}

if (json) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const pad = (s, n) => String(s).padEnd(n)
const num = (n) => String(n).padStart(11)
console.log(`${pad('Source', 16)}${num('problems')}${num('statements')}${imp.GAPS.map((g) => num(g)).join('')}`)
console.log(`${pad('', 16)}${num('')}${num('')}${imp.GAPS.map(() => num('missing')).join('')}`)
for (const r of report) {
  const cells = imp.GAPS.map((g) => (r.notPublished.includes(g) ? num('—') : num(r.gaps[g])))
  console.log(`${pad(r.name, 16)}${num(r.problems)}${num(r.statements)}${cells.join('')}`)
}
console.log('\n— means the judge does not publish it, so it is never a gap.')

if (only) {
  const r = report[0]
  console.log(`\n${r.name}: ${r.rows.length} problem${r.rows.length === 1 ? '' : 's'} with gaps${gap ? ` (${imp.GAP_LABEL[gap].toLowerCase()})` : ''}${r.rows.length > limit ? `, first ${limit}` : ''}:`)
  for (const p of r.rows.slice(0, limit)) console.log(`  ${pad(p.problemId, 14)} ${pad(p.title.slice(0, 40), 42)} ${p.gaps.map((g) => imp.GAP_LABEL[g]).join(', ')}`)
}
