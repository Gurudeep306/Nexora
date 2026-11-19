// ─────────────────────────────────────────────────────────────────────────────
// Where each table lives: the site's data split into stores, so heavy work in
// one part never slows another.
//
//   core   users, sessions, progress, submissions, problems, social, GATE …
//          (everything a student's pages read and write; joined together a lot)
//   hive   the staff AI workspace (hive_*): only ever used with each other
//   files  uploaded files and statement images, stored in chunks
//   cache  data the server can always rebuild (translations, catalog snapshot)
//   logs   append-only records (audit trail, code replays)
//
// Each store can point at its own database (TURSO_<STORE>_URL and
// TURSO_<STORE>_AUTH_TOKEN). A store with no URL of its own uses the core
// database, so with none set the site is exactly one database, as before.
// scripts/ops/sql-table-groups.cjs checks that no statement in src/ touches
// two stores at once (a single query cannot join two databases); the tests run
// it.
// ─────────────────────────────────────────────────────────────────────────────

const STORES = ['core', 'hive', 'files', 'cache', 'logs'];

const FILES = new Set(['uploads', 'upload_chunks', 'statement_media', 'statement_media_chunks']);
const CACHE = new Set(['translation_cache', 'catalog_snapshot', 'catalog_meta']);
const LOGS = new Set(['audit_log', 'code_replays']);

/** The store a table belongs to. */
function storeOfTable(name) {
  const t = String(name).toLowerCase();
  if (t.startsWith('hive_')) return 'hive';
  if (FILES.has(t)) return 'files';
  if (CACHE.has(t)) return 'cache';
  if (LOGS.has(t)) return 'logs';
  return 'core';
}

const TABLE_RE = /\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?:\s+IF\s+(?:NOT\s+)?EXISTS)?|INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z_][a-z0-9_]*\s+ON)\s+"?([a-z_][a-z0-9_]*)/gi;
const cache = new Map();

/**
 * The store a statement runs in: the store of the tables it names. Statements
 * that name no known table (PRAGMA, SELECT 1 …) run in core.
 */
function storeOfSql(sql) {
  const s = String(sql);
  const hit = cache.get(s);
  if (hit) return hit;
  let store = 'core';
  for (const m of s.matchAll(TABLE_RE)) {
    const st = storeOfTable(m[1]);
    if (st !== 'core') {
      store = st;
      break;
    }
  }
  if (cache.size > 5000) cache.clear();
  cache.set(s, store);
  return store;
}

/** Which stores have a database of their own in this environment. */
function storeUrls(env = process.env) {
  const out = {};
  for (const st of STORES) {
    if (st === 'core') continue;
    const url = String(env[`TURSO_${st.toUpperCase()}_URL`] || '').trim();
    if (url) out[st] = { url, authToken: String(env[`TURSO_${st.toUpperCase()}_AUTH_TOKEN`] || '').trim() || undefined };
  }
  return out;
}

module.exports = { STORES, storeOfTable, storeOfSql, storeUrls };
