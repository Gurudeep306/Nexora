#!/usr/bin/env node
/*
  Finds every SQL statement in src/ and lists the tables each one touches,
  so the database can be split into parts without breaking a query that
  needs two parts at once. Prints the statements that cross the proposed
  stores (see src/db-stores.js), or, with --pairs, which tables are used
  together.

    node scripts/ops/sql-table-groups.cjs           # cross-store statements
    node scripts/ops/sql-table-groups.cjs --pairs   # table co-usage
*/
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const src = path.join(root, 'src')
const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(c?js|mjs)$/.test(e.name)) files.push(p)
  }
}
walk(src)

const tables = new Set()
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS\s+"?([a-z_]+)/gi)) tables.add(m[1])

/** Every string literal (', ", `) that looks like SQL. */
function sqlStrings(text) {
  const out = []
  const re = /`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g
  for (const m of text.matchAll(re)) {
    const s = m[0].slice(1, -1)
    if (/\b(SELECT|INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/i.test(s) && /\b(FROM|INTO|UPDATE|TABLE|JOIN)\b/i.test(s)) out.push({ s, at: m.index })
  }
  return out
}
const touched = (s) => {
  const t = new Set()
  for (const m of s.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?: IF (?:NOT )?EXISTS)?|EXISTS\s*\(\s*SELECT[^)]*?FROM)\s+"?([a-z_][a-z0-9_]*)/gi)) if (tables.has(m[1])) t.add(m[1])
  // Comma joins: FROM a, b
  for (const m of s.matchAll(/\bFROM\s+([a-z_][a-z0-9_]*(?:\s+[a-z]\w*)?(?:\s*,\s*[a-z_][a-z0-9_]*(?:\s+[a-z]\w*)?)+)/gi))
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+/)[0]
      if (tables.has(name)) t.add(name)
    }
  return [...t]
}

const stmts = []
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  for (const { s, at } of sqlStrings(text)) {
    const ts = touched(s)
    if (ts.length) stmts.push({ file: path.relative(root, f), line: text.slice(0, at).split('\n').length, tables: ts, sql: s.replace(/\s+/g, ' ').slice(0, 160) })
  }
}

if (process.argv.includes('--pairs')) {
  const pairs = new Map()
  for (const st of stmts)
    for (let i = 0; i < st.tables.length; i++)
      for (let j = i + 1; j < st.tables.length; j++) {
        const k = [st.tables[i], st.tables[j]].sort().join(' + ')
        pairs.set(k, (pairs.get(k) ?? 0) + 1)
      }
  for (const [k, n] of [...pairs].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), k)
  console.log(`${stmts.length} statements, ${tables.size} tables`)
} else {
  const { storeOfTable } = require(path.join(root, 'src', 'db-stores.js'))
  let n = 0
  for (const st of stmts) {
    const stores = new Set(st.tables.map(storeOfTable))
    if (stores.size > 1) {
      n++
      console.log(`${st.file}:${st.line}  [${st.tables.map((t) => `${t}:${storeOfTable(t)}`).join(', ')}]\n    ${st.sql}`)
    }
  }
  console.log(`${n} statement(s) cross stores, of ${stmts.length}`)
  process.exitCode = n ? 1 : 0
}
module.exports = { stmts }
