#!/usr/bin/env node
/*
  Folds per-batch part files into each paper's canonical files.

  Parallel authoring agents write
    src/gate/solutions/<paper>.part-<n>.json   { paper, version: 2, solutions: { id: Solution } }
    src/gate/fixes/<paper>.part-<n>.json       { paper, fixes: [ ... ] }
  so they never edit the same file. This script merges every part into
    src/gate/solutions/<paper>.json and src/gate/fixes/<paper>.json
  (a part's solution replaces an existing one for the same question; a fix
  identical to one already present is skipped; two different fixes for the
  same question+field are a conflict and stop the run), then deletes the
  parts. Run scripts/gate/apply-fixes.mjs afterwards.

    node scripts/gate/combine-parts.mjs            all papers with parts
    node scripts/gate/combine-parts.mjs cse-2022   one paper
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOL_DIR = path.join(ROOT, 'src', 'gate', 'solutions')
const FIX_DIR = path.join(ROOT, 'src', 'gate', 'fixes')
const PART = /^(.+)\.part-(\d+)\.json$/

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)

/** Questions in paper order: GA before CS, then by number (a-1-i style ids sort as strings). */
function questionOrder(id) {
  const m = id.match(/-(ga|cs|it|da|[a-z])-(\d+)(.*)$/)
  if (!m) return [2, 0, id]
  return [m[1] === 'ga' ? 0 : 1, Number(m[2]), m[3]]
}
function byQuestion(a, b) {
  const x = questionOrder(a)
  const y = questionOrder(b)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1
  return 0
}

function partsIn(dir, only) {
  const out = new Map()
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const m = name.match(PART)
    if (!m || (only && m[1] !== only)) continue
    if (!out.has(m[1])) out.set(m[1], [])
    out.get(m[1]).push(path.join(dir, name))
  }
  for (const list of out.values()) list.sort((a, b) => Number(a.match(PART)[2]) - Number(b.match(PART)[2]))
  return out
}

const only = process.argv[2]
let problems = 0

for (const [paper, files] of partsIn(SOL_DIR, only)) {
  const target = path.join(SOL_DIR, `${paper}.json`)
  const merged = fs.existsSync(target) ? readJson(target) : { paper, version: 2, solutions: {} }
  for (const file of files) {
    const part = readJson(file)
    if (part.paper !== paper) {
      console.error(`✗ ${path.relative(ROOT, file)}: paper is "${part.paper}", expected "${paper}"`)
      problems++
      continue
    }
    Object.assign(merged.solutions, part.solutions)
  }
  merged.solutions = Object.fromEntries(Object.entries(merged.solutions).sort(([a], [b]) => byQuestion(a, b)))
  writeJson(target, merged)
  for (const file of files) fs.rmSync(file)
  console.log(`✓ solutions ${paper}: ${files.length} part(s) → ${Object.keys(merged.solutions).length} solutions`)
}

for (const [paper, files] of partsIn(FIX_DIR, only)) {
  const target = path.join(FIX_DIR, `${paper}.json`)
  const merged = fs.existsSync(target) ? readJson(target) : { paper, fixes: [] }
  const seen = new Map(merged.fixes.map((f) => [`${f.id}\u0000${f.field}`, f]))
  let conflicts = 0
  for (const file of files) {
    for (const fix of readJson(file).fixes || []) {
      const key = `${fix.id}\u0000${fix.field}`
      const prior = seen.get(key)
      if (prior) {
        if (JSON.stringify(prior.after) === JSON.stringify(fix.after)) continue
        console.error(`✗ ${paper}: two different fixes for ${fix.id}.${fix.field} (${path.relative(ROOT, file)})`)
        conflicts++
        continue
      }
      seen.set(key, fix)
      merged.fixes.push(fix)
    }
  }
  if (conflicts) {
    problems += conflicts
    continue
  }
  writeJson(target, merged)
  for (const file of files) fs.rmSync(file)
  console.log(`✓ fixes ${paper}: ${files.length} part(s) → ${merged.fixes.length} fixes`)
}

if (problems) {
  console.error(`\n${problems} problem(s); parts with problems were left in place.`)
  process.exit(1)
}
