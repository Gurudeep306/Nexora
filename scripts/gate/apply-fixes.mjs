#!/usr/bin/env node
/*
  Applies question corrections from src/gate/fixes/<paperId>.json to
  src/gate/questions.json — deterministically and idempotently.

    node scripts/gate/apply-fixes.mjs            # apply every fixes file
    node scripts/gate/apply-fixes.mjs cse-2012   # only these papers
    node scripts/gate/apply-fixes.mjs --check    # dry run: report, write nothing

  A fixes file:
    { "paper": "cse-2012",
      "fixes": [ { "id": "cse-2012-cs-40", "field": "answer",
                   "before": "C", "after": "D",
                   "reason": "Official key lists D", "source": "pdf p.12" } ] }

  For each fix, the current value of question[field] must deep-equal either
  `after` (already applied → skipped) or `before` (→ replaced by `after`).
  Anything else is a conflict: nothing is written and the exit code is 1.
  The file is re-serialised with the same formatting (2-space JSON, no
  trailing newline), so a no-op run leaves it byte-identical.
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIX_DIR = path.join(ROOT, 'src', 'gate', 'fixes')
const BANK = path.join(ROOT, 'src', 'gate', 'questions.json')

export const FIELDS = ['text', 'options', 'answer', 'type', 'marks', 'figures', 'topic', 'subject', 'tags', 'needsReview', 'reviewNote', 'solution']

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Shape errors for a fixes file (returns a list of messages). */
export function checkFixesFile(data, name, bank) {
  const errs = []
  if (!data || typeof data !== 'object') return [`${name}: not an object`]
  if (data.paper !== name) errs.push(`${name}: "paper" is ${JSON.stringify(data.paper)} but the file is ${name}.json`)
  if (!Array.isArray(data.fixes)) return [...errs, `${name}: "fixes" must be an array`]
  const seen = new Set()
  data.fixes.forEach((f, i) => {
    const at = `${name}.fixes[${i}]`
    for (const k of ['id', 'field', 'reason', 'source']) if (typeof f[k] !== 'string' || !f[k].trim()) errs.push(`${at}: "${k}" must be a non-empty string`)
    if (!('before' in f) || !('after' in f)) errs.push(`${at}: needs both "before" and "after" (use null for an empty value)`)
    for (const k of Object.keys(f)) if (!['id', 'field', 'before', 'after', 'reason', 'source'].includes(k)) errs.push(`${at}: unknown key "${k}"`)
    if (f.field && !FIELDS.includes(f.field)) errs.push(`${at}: field "${f.field}" cannot be fixed (allowed: ${FIELDS.join(', ')})`)
    const q = bank && bank.questions.find((x) => x.id === f.id)
    if (bank && !q) errs.push(`${at}: no question "${f.id}"`)
    else if (q && q.paper !== data.paper) errs.push(`${at}: ${f.id} belongs to ${q.paper}`)
    const key = `${f.id}/${f.field}`
    if (seen.has(key)) errs.push(`${at}: a second fix for ${key} — fold them into one before/after`)
    seen.add(key)
  })
  return errs
}

/** Applies fixes to a parsed bank in place. Returns { applied, skipped, conflicts, errors }. */
export function applyFixes(bank, files) {
  const out = { applied: [], skipped: [], conflicts: [], errors: [] }
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  for (const { name, data } of files) {
    const errs = checkFixesFile(data, name, bank)
    if (errs.length) {
      out.errors.push(...errs)
      continue
    }
    for (const f of data.fixes) {
      const q = byId.get(f.id)
      const cur = q[f.field] === undefined ? null : q[f.field]
      const tag = `${f.id}.${f.field}`
      if (same(cur, f.after)) out.skipped.push(tag)
      else if (same(cur, f.before)) {
        q[f.field] = f.after
        out.applied.push(tag)
      } else out.conflicts.push(`${tag}: current value ${JSON.stringify(cur).slice(0, 80)} matches neither "before" nor "after"`)
    }
  }
  return out
}

export function fixesFiles(args = []) {
  if (!fs.existsSync(FIX_DIR)) return []
  const names = args.length ? args.map((a) => path.basename(a, '.json')) : fs.readdirSync(FIX_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
  return names.sort().map((name) => {
    const file = path.join(FIX_DIR, `${name}.json`)
    return { name, file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const files = fixesFiles(args.filter((a) => !a.startsWith('--')))
  const raw = fs.readFileSync(BANK, 'utf8')
  const bank = JSON.parse(raw)
  const r = applyFixes(bank, files)
  for (const e of r.errors) console.log(`error    ${e}`)
  for (const c of r.conflicts) console.log(`conflict ${c}`)
  for (const a of r.applied) console.log(`${check ? 'would apply' : 'applied'}  ${a}`)
  console.log(`\n${files.length} fixes files: ${r.applied.length} to apply, ${r.skipped.length} already applied, ${r.conflicts.length} conflicts, ${r.errors.length} errors`)
  if (r.errors.length || r.conflicts.length) {
    console.log('Nothing written.')
    process.exit(1)
  }
  if (!check && r.applied.length) {
    fs.writeFileSync(BANK, JSON.stringify(bank, null, 2))
    console.log(`Wrote ${path.relative(ROOT, BANK)}`)
  }
}
