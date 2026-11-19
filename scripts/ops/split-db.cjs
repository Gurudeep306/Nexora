#!/usr/bin/env node
/*
  Move one store's tables (src/db-stores.js) out of the main database into a
  database of its own. Copies every table, index, trigger and row, then checks
  that each table has the same number of rows in both places.

    node scripts/ops/split-db.cjs --store hive              # dry run: what would move
    node scripts/ops/split-db.cjs --store hive --apply      # copy and check
    node scripts/ops/split-db.cjs --store hive --drop-old   # later: remove the old copies from core

  Reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (the main database) and
  TURSO_<STORE>_URL / TURSO_<STORE>_AUTH_TOKEN (the new one; the token falls
  back to TURSO_AUTH_TOKEN, which works when both are in one Turso group).

  Safe order (docs/ops/DATA_SPLIT.md): stop the server, take a backup
  (npm run db:backup), --apply, set TURSO_<STORE>_URL on the server, start it.
  Writes made while the server runs during the copy would be lost, so do not
  copy while it is running. --apply refuses a target that already has rows.
*/
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true })
const { createClient } = require('@libsql/client')
const { STORES, storeOfTable, storeUrls } = require('../../src/db-stores')

const q = (n) => `"${String(n).replace(/"/g, '""')}"`
const PAGE = 500
let store, src, dst

/** Foreign keys to tables that stay behind cannot hold in another database. */
function stripForeignKeys(sql, to = store) {
  const away = (t) => storeOfTable(t) !== to
  return sql
    .replace(/,\s*FOREIGN\s+KEY\s*\([^)]*\)\s*REFERENCES\s+"?(\w+)"?\s*(?:\([^)]*\))?(?:\s+ON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))*/gi, (m, t) => (away(t) ? '' : m))
    .replace(/\s+REFERENCES\s+"?(\w+)"?\s*(?:\([^)]*\))?(?:\s+ON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))*/gi, (m, t) => (away(t) ? '' : m))
}

async function count(client, t) {
  const rs = await client.execute(`SELECT COUNT(*) AS n FROM ${q(t)}`)
  return Number(rs.rows[0].n)
}
async function exists(client, t) {
  const rs = await client.execute({ sql: "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", args: [t] })
  return rs.rows.length > 0
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (f) => args.includes(f)
  store = args[args.indexOf('--store') + 1]
  if (!args.includes('--store') || !STORES.includes(store) || store === 'core') {
    console.error(`✗ --store must be one of: ${STORES.filter((s) => s !== 'core').join(', ')}`)
    return fail()
  }
  const coreUrl = (process.env.TURSO_DATABASE_URL || '').trim()
  const target = storeUrls()[store]
  if (!coreUrl || !target) {
    console.error(`✗ Needs TURSO_DATABASE_URL and TURSO_${store.toUpperCase()}_URL`)
    return fail()
  }
  const token = process.env.TURSO_AUTH_TOKEN || undefined
  src = createClient({ url: coreUrl, authToken: token, intMode: 'bigint' })
  dst = createClient({ url: target.url, authToken: target.authToken || token, intMode: 'bigint' })
  const objs = (
    await src.execute(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type='table' DESC, name",
    )
  ).rows.filter((o) => storeOfTable(o.tbl_name) === store)
  const tables = objs.filter((o) => o.type === 'table')
  if (!tables.length) {
    console.log(`Nothing in the main database belongs to "${store}".`)
    return
  }
  console.log(`${tables.length} table(s) belong to "${store}":`)
  for (const t of tables) console.log(`  ${t.name.padEnd(32)} ${await count(src, t.name)} rows`)

  if (flag('--drop-old')) {
    // Only when the new database has every row.
    for (const t of tables) {
      const [a, b] = [await count(src, t.name), (await exists(dst, t.name)) ? await count(dst, t.name) : -1]
      if (a !== b) throw new Error(`${t.name}: ${a} rows in core, ${b < 0 ? 'missing' : b} in ${store}; not dropping anything`)
    }
    for (const t of tables) await src.execute(`DROP TABLE ${q(t.name)}`)
    console.log(`✓ Dropped ${tables.length} old table(s) from the main database.`)
    return
  }
  if (!flag('--apply')) {
    console.log('\nDry run. Add --apply to copy them.')
    return
  }

  for (const t of tables) {
    if ((await exists(dst, t.name)) && (await count(dst, t.name)) > 0) throw new Error(`${t.name} already has rows in the ${store} database; stopping`)
  }
  await dst.execute('PRAGMA foreign_keys=OFF')
  let rows = 0
  for (const t of tables) {
    await dst.execute(`DROP TABLE IF EXISTS ${q(t.name)}`)
    await dst.execute(stripForeignKeys(t.sql))
    const cols = (await src.execute(`PRAGMA table_info(${q(t.name)})`)).rows.map((r) => r.name)
    const ins = `INSERT INTO ${q(t.name)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    // Page by rowid so the copy is stable and fast (tables WITHOUT ROWID fall back to OFFSET).
    let withRowid = true
    try {
      await src.execute(`SELECT rowid FROM ${q(t.name)} LIMIT 1`)
    } catch {
      withRowid = false
    }
    let last = null
    for (let off = 0; ; off += PAGE) {
      const rs = withRowid
        ? await src.execute({ sql: `SELECT rowid AS __r, * FROM ${q(t.name)} WHERE rowid > ? ORDER BY rowid LIMIT ${PAGE}`, args: [last ?? -9223372036854775808n] })
        : await src.execute(`SELECT * FROM ${q(t.name)} LIMIT ${PAGE} OFFSET ${off}`)
      if (!rs.rows.length) break
      await dst.batch(rs.rows.map((r) => ({ sql: ins, args: cols.map((c) => r[c]) })), 'write')
      rows += rs.rows.length
      if (withRowid) last = rs.rows[rs.rows.length - 1].__r
      if (rs.rows.length < PAGE) break
    }
    process.stdout.write(`  copied ${t.name}\n`)
  }
  for (const o of objs.filter((x) => x.type !== 'table')) await dst.execute(o.sql)
  try {
    const seq = (await src.execute('SELECT name, seq FROM sqlite_sequence')).rows.filter((s) => storeOfTable(s.name) === store)
    for (const s of seq) {
      await dst.execute({ sql: 'DELETE FROM sqlite_sequence WHERE name=?', args: [s.name] })
      await dst.execute({ sql: 'INSERT INTO sqlite_sequence(name, seq) VALUES(?,?)', args: [s.name, s.seq] })
    }
  } catch {}

  let bad = 0
  for (const t of tables) {
    const [a, b] = [await count(src, t.name), await count(dst, t.name)]
    if (a !== b) {
      bad++
      console.error(`✗ ${t.name}: ${a} rows in core, ${b} in ${store}`)
    }
  }
  if (bad) throw new Error(`${bad} table(s) differ; do not switch the server over`)
  console.log(`✓ Copied ${tables.length} table(s), ${rows} rows; every count matches.`)
  console.log(`Next: set TURSO_${store.toUpperCase()}_URL on the server and restart it. The old copies stay in core until --drop-old.`)
}
function fail() {
  process.exitCode = 2
}

if (require.main === module)
  main().catch((e) => {
    console.error('✗', e.message)
    process.exit(1)
  })

module.exports = { stripForeignKeys }
