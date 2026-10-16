// Database usage accounting — how many rows each query reads and writes.
//
// Turso's free plan is metered in ROWS (500M read / 10M written per month),
// not in queries: a `COUNT(*)` or an unindexed WHERE over the 28k-row
// `problems` table costs ~28k reads every time it runs. This module keeps the
// numbers the owner needs to stay inside that budget.
//
//  • Always on (free): totals since boot — statements, rows returned, rows
//    written (affected rows) — so the admin card always has something to show.
//  • DB_STATS=1 (opt-in): per-statement fingerprints with calls, rows
//    returned, rows written and an estimate of rows READ. Neither libSQL nor
//    node's SQLite bindings report rows read, so each distinct statement is run
//    once through `EXPLAIN QUERY PLAN`: a `SCAN` of a table is costed at that
//    table's size (from `MAX(rowid)`, a 1-row read, cached), a `SEARCH` at the
//    rows it returns. The estimate is deliberately pessimistic for scans and
//    flags every scan, which is what matters for the quota.
//
// Exposed to admins at GET /api/admin/db-stats (analytics.view).

const { currentAcct, trackRequest } = require("./context");

const ENABLED = process.env.DB_STATS === "1";

// Turso free plan (monthly). Overridable for paid plans.
const QUOTA = {
  reads: Number(process.env.DB_QUOTA_READS) || 500_000_000,
  writes: Number(process.env.DB_QUOTA_WRITES) || 10_000_000,
};
// Warn in the admin card when the projection passes this share of the quota.
const WARN_SHARE = Number(process.env.DB_QUOTA_WARN) || 0.5;

const bootAt = Date.now();
const totals = { statements: 0, returned: 0, written: 0, readsEst: 0, scans: 0 };
const byFp = new Map(); // fingerprint -> entry
const MAX_FINGERPRINTS = 2000;

let explainFn = null; // async (sql, params) => [{ detail }]
let sizeFn = null; // async (table) => number
const plans = new Map(); // fingerprint -> Promise<plan>
const sizes = new Map(); // table -> { n, at }
const SIZE_TTL_MS = 10 * 60 * 1000;

/** db.js hands over raw (uncounted) helpers for EXPLAIN and table sizes. */
function configure({ explain, tableSize }) {
  explainFn = explain;
  sizeFn = tableSize;
}

/** Normalise a statement so the same query with different values shares a row. */
function fingerprint(sql) {
  return String(sql)
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "?")
    .replace(/\b\d+(?:\.\d+)?\b/g, "?")
    .replace(/\(\s*\?(?:\s*,\s*\?)+\s*\)/g, "(?…)")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

const isWrite = (sql) => /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|PRAGMA\s+\w+\s*=)/i.test(sql);

/** alias -> table, from FROM/JOIN/UPDATE/INTO clauses. */
function aliasMap(sql) {
  const out = new Map();
  const re = /\b(?:FROM|JOIN|UPDATE|INTO)\s+["`]?(\w+)["`]?(?:\s+(?:AS\s+)?(\w+))?/gi;
  const kw = new Set(["WHERE", "ON", "LEFT", "INNER", "JOIN", "GROUP", "ORDER", "LIMIT", "SET", "VALUES", "USING", "CROSS", "NATURAL", "SELECT", "AS", "UNION", "HAVING", "WINDOW", "OUTER"]);
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1];
    if (kw.has(table.toUpperCase())) continue;
    out.set(table.toLowerCase(), table);
    if (m[2] && !kw.has(m[2].toUpperCase())) out.set(m[2].toLowerCase(), table);
  }
  return out;
}

async function tableSize(table) {
  if (!sizeFn) return 0;
  const hit = sizes.get(table);
  if (hit && Date.now() - hit.at < SIZE_TTL_MS) return hit.n;
  let n = 0;
  try {
    n = Number(await sizeFn(table)) || 0;
  } catch {
    n = 0;
  }
  sizes.set(table, { n, at: Date.now() });
  return n;
}

/** Parse EXPLAIN QUERY PLAN rows into the scanned / searched tables. */
async function planFor(fp, sql, params) {
  if (!plans.has(fp)) {
    plans.set(
      fp,
      (async () => {
        if (!explainFn || !/^\s*(SELECT|WITH|UPDATE|DELETE|INSERT)/i.test(sql)) return { scans: [], searches: 0, lines: [] };
        let rows = [];
        try {
          rows = await explainFn(sql, params);
        } catch {
          return { scans: [], searches: 0, lines: [] };
        }
        const aliases = aliasMap(sql);
        const scans = [];
        let searches = 0;
        const lines = [];
        for (const r of rows) {
          const d = String(r.detail || "");
          lines.push(d);
          const sm = /^SCAN (?:TABLE )?["`]?(\w+)["`]?/.exec(d);
          if (sm && !/^SCAN (CONSTANT ROW|\(subquery|\(join|\w+ VIRTUAL)/.test(d)) {
            const t = aliases.get(sm[1].toLowerCase()) || sm[1];
            if (!/^(json_each|json_tree|pragma_\w+|sqlite_\w+)$/i.test(t)) scans.push(t);
          } else if (/^SEARCH /.test(d)) {
            searches++;
          }
        }
        return { scans, searches, lines };
      })(),
    );
    if (plans.size > MAX_FINGERPRINTS) plans.delete(plans.keys().next().value);
  }
  return plans.get(fp);
}

async function estimateReads(plan, returned) {
  let scanRows = 0;
  for (const t of plan.scans) scanRows += await tableSize(t);
  // A join probed once per scanned row reads ~one row per probe.
  const probes = plan.scans.length && plan.searches ? scanRows * Math.min(plan.searches, 2) : 0;
  return Math.max(returned, scanRows + probes, 1);
}

/**
 * Record one statement. `returned` = rows handed back, `written` = rows
 * changed. Resolves once the (opt-in) read estimate is booked.
 */
async function record(sql, params, returned = 0, written = 0) {
  totals.statements++;
  totals.returned += returned;
  totals.written += written;
  if (!ENABLED) return;
  const acct = currentAcct() || background;
  acct.statements++;
  acct.written += written;
  const fp = fingerprint(sql);
  let e = byFp.get(fp);
  if (!e) {
    if (byFp.size >= MAX_FINGERPRINTS) return;
    e = { sql: fp, calls: 0, returned: 0, written: 0, reads: 0, scans: [], write: isWrite(sql) };
    byFp.set(fp, e);
  }
  e.calls++;
  e.returned += returned;
  e.written += written;
  const plan = await planFor(fp, sql, params);
  e.scans = plan.scans;
  e.plan = plan.lines;
  const reads = await estimateReads(plan, returned);
  e.reads += reads;
  acct.reads += reads;
  totals.readsEst += reads;
  if (plan.scans.length) totals.scans++;
}

/* ── per-endpoint attribution (DB_STATS) ── */
const blank = () => ({ requests: 0, statements: 0, reads: 0, written: 0 });
let background = blank(); // boot, timers, background jobs
const byRoute = new Map();
function routeKey(req) {
  const r = req.route?.path;
  const p = typeof r === "string" ? (req.baseUrl || "") + r : req.path.replace(/\/\d+(?=\/|$)/g, "/:n");
  if (!p.startsWith("/api/") && !p.startsWith("/auth")) return `${req.method} (page/static)`;
  return `${req.method} ${p}`;
}
/** Express middleware (first in the stack): attribute each request's rows. */
function requestMiddleware() {
  return trackRequest((req, res) => {
    const acct = blank();
    acct.requests = 1;
    res.on("finish", () => {
      const key = routeKey(req);
      const agg = byRoute.get(key) || blank();
      for (const k of Object.keys(agg)) agg[k] += acct[k];
      byRoute.set(key, agg);
    });
    return acct;
  });
}

/** Forget everything (tests / "reset" in the admin card). */
function reset() {
  byFp.clear();
  byRoute.clear();
  background = blank();
  for (const k of Object.keys(totals)) totals[k] = 0;
  resetAt = Date.now();
}
let resetAt = bootAt;

function projection(count, sinceMs) {
  const days = Math.max((Date.now() - sinceMs) / 86400000, 1 / 24); // at least an hour of extrapolation
  return Math.round((count / days) * 30);
}

/** Snapshot for the admin endpoint. */
function snapshot({ top = 25 } = {}) {
  const reads = ENABLED ? totals.readsEst : totals.returned; // lower bound when estimates are off
  const monthlyReads = projection(reads, resetAt);
  const monthlyWrites = projection(totals.written, resetAt);
  const share = { reads: monthlyReads / QUOTA.reads, writes: monthlyWrites / QUOTA.writes };
  const entries = [...byFp.values()];
  const pick = (key) =>
    entries
      .filter((e) => e[key] > 0)
      .sort((a, b) => b[key] - a[key])
      .slice(0, top)
      .map((e) => ({
        sql: e.sql,
        calls: e.calls,
        returned: e.returned,
        reads: e.reads,
        written: e.written,
        scans: e.scans,
      }));
  return {
    detailed: ENABLED,
    since: new Date(resetAt).toISOString(),
    uptimeSec: Math.round((Date.now() - bootAt) / 1000),
    totals: { ...totals, reads },
    projection: {
      monthlyReads,
      monthlyWrites,
      quota: QUOTA,
      share,
      warnAt: WARN_SHARE,
      warning: share.reads >= WARN_SHARE || share.writes >= WARN_SHARE,
    },
    topReads: pick("reads"),
    topWrites: pick("written"),
    endpoints: [...byRoute.entries()]
      .map(([route, a]) => ({ route, ...a }))
      .sort((a, b) => b.reads - a.reads)
      .slice(0, 60),
    background: { ...background },
    scanning: entries.filter((e) => e.scans.length).map((e) => ({ sql: e.sql, calls: e.calls, scans: e.scans })),
  };
}

module.exports = { ENABLED, QUOTA, configure, fingerprint, record, reset, snapshot, aliasMap, requestMiddleware };
