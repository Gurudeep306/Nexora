// Problem sources: one module per judge (list + statement), and the admin
// controls around them — which sources are switched on, what they are
// called, when they last synced and what a live test found.
//
// A sync writes only rows that are new or really changed (title, link,
// rating, tags, category), in batches — on Turso every write is billed, and
// re-importing 10,000 unchanged Codeforces rows used to cost 10,000 writes.
const { run, get, all, runBatch } = require("../db");

const MODULES = ["codeforces", "codechef", "atcoder", "leetcode", "cses", "spoj", "euler", "dmoj", "timus", "kattis", "uva"];
const SOURCES = Object.fromEntries(MODULES.map((id) => [id, require(`./${id}`)]));

// Live before this registry existed: on by default. The rest start off until
// an admin syncs them (a successful first sync switches a source on).
const DEFAULT_ON = new Set(["codeforces", "codechef", "atcoder", "leetcode", "spoj", "euler"]);

const CHUNK = 400;
let disabledCache = null; // Set of platform ids switched off, null = reload
let ready = null;
const running = new Map(); // id → { startedAt, phase }

async function init() {
  if (!ready) {
    ready = (async () => {
      await run(`CREATE TABLE IF NOT EXISTS problem_sources (
        id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        label TEXT DEFAULT '',
        note TEXT DEFAULT '',
        auto_sync INTEGER NOT NULL DEFAULT 0,
        last_sync TEXT,
        last_count INTEGER,
        last_added INTEGER,
        last_updated INTEGER,
        last_error TEXT,
        last_test TEXT,
        updated_by TEXT,
        updated_at TEXT
      )`);
      for (const id of MODULES) {
        await run("INSERT OR IGNORE INTO problem_sources(id, enabled) VALUES(?, ?)", [id, DEFAULT_ON.has(id) ? 1 : 0]);
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Platforms an admin switched off (hidden from lists and random picks). */
async function disabledPlatforms() {
  if (disabledCache) return disabledCache;
  await init();
  const rows = await all("SELECT id FROM problem_sources WHERE enabled=0");
  disabledCache = new Set(rows.map((r) => r.id));
  return disabledCache;
}

const pubSource = (row, counts) => {
  const m = SOURCES[row.id];
  let test = null;
  try {
    test = row.last_test ? JSON.parse(row.last_test) : null;
  } catch {
    test = null;
  }
  return {
    id: row.id,
    name: m?.name || row.id,
    label: row.label || m?.name || row.id,
    description: m?.description || "",
    origin: m?.origin || "",
    kind: m?.kind || "stdin",
    enabled: !!row.enabled,
    note: row.note || "",
    autoSync: !!row.auto_sync,
    problems: counts.get(row.id)?.n || 0,
    statements: counts.get(row.id)?.s || 0,
    lastSync: row.last_sync || null,
    lastCount: row.last_count ?? null,
    lastAdded: row.last_added ?? null,
    lastUpdated: row.last_updated ?? null,
    lastError: row.last_error || null,
    lastTest: test,
    running: running.get(row.id) || null,
    updatedBy: row.updated_by || null,
    updatedAt: row.updated_at || null,
  };
};

let stmtCounts = null; // { at, map } — statement counts per platform, refreshed every 10 min

async function countsByPlatform({ statements = true } = {}) {
  const counts = new Map();
  // Problem counts from the in-memory catalog: no table scan (Turso bills every row read).
  const { getCatalog } = require("../problem-catalog");
  const cat = await getCatalog().catch(() => null);
  for (const r of cat?.rows || []) {
    const c = counts.get(r.platform) || { n: 0, s: 0 };
    c.n++;
    counts.set(r.platform, c);
  }
  if (statements) {
    if (!stmtCounts || Date.now() - stmtCounts.at > 10 * 60_000) {
      const rows = await all("SELECT p.platform, COUNT(*) AS s FROM problem_statements s JOIN problems p ON p.id = s.problem_rowid GROUP BY p.platform").catch(() => []);
      stmtCounts = { at: Date.now(), map: new Map(rows.map((r) => [r.platform, Number(r.s)])) };
    }
    for (const [platform, n] of stmtCounts.map) {
      const c = counts.get(platform) || { n: 0, s: 0 };
      c.s = n;
      counts.set(platform, c);
    }
  }
  return counts;
}

async function listSources({ statements = true } = {}) {
  await init();
  const rows = await all("SELECT * FROM problem_sources");
  const counts = await countsByPlatform({ statements });
  // Known modules in their curated order, then anything else in the table.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = [...MODULES.map((id) => byId.get(id)).filter(Boolean), ...rows.filter((r) => !SOURCES[r.id])];
  return ordered.map((r) => pubSource(r, counts));
}

async function updateSource(id, { enabled, label, note, autoSync }, by) {
  await init();
  const row = await get("SELECT * FROM problem_sources WHERE id=?", [id]);
  if (!row) throw Object.assign(new Error("Unknown source"), { status: 404 });
  const sets = [];
  const vals = [];
  if (enabled !== undefined) sets.push("enabled=?"), vals.push(enabled ? 1 : 0);
  if (label !== undefined) sets.push("label=?"), vals.push(String(label || "").slice(0, 60));
  if (note !== undefined) sets.push("note=?"), vals.push(String(note || "").slice(0, 500));
  if (autoSync !== undefined) sets.push("auto_sync=?"), vals.push(autoSync ? 1 : 0);
  if (!sets.length) return;
  sets.push("updated_by=?", "updated_at=?");
  vals.push(by || null, new Date().toISOString(), id);
  await run(`UPDATE problem_sources SET ${sets.join(", ")} WHERE id=?`, vals);
  disabledCache = null;
}

/** Fields a sync compares and writes. */
const FIELDS = ["title", "url", "rating", "tags", "category"];
const clean = (r) => ({
  platform: String(r.platform),
  problem_id: String(r.problem_id).slice(0, 80),
  title: String(r.title || r.problem_id).slice(0, 300),
  url: String(r.url || ""),
  rating: Math.max(0, Math.round(Number(r.rating) || 0)),
  tags: typeof r.tags === "string" ? r.tags : JSON.stringify(r.tags || []),
  category: String(r.category || "").slice(0, 80),
});

/**
 * Write a source's rows: insert the new ones, update the changed ones, leave
 * the rest alone. Returns { total, added, updated }.
 */
async function upsert(platform, rawRows) {
  const rows = [];
  const seen = new Set();
  for (const r of rawRows) {
    const c = clean(r);
    if (!c.problem_id || c.platform !== platform || seen.has(c.problem_id)) continue;
    seen.add(c.problem_id);
    rows.push(c);
  }
  const existing = new Map((await all("SELECT problem_id, title, url, rating, tags, category FROM problems WHERE platform=?", [platform])).map((r) => [r.problem_id, r]));
  const inserts = [];
  const updates = [];
  for (const r of rows) {
    const old = existing.get(r.problem_id);
    if (!old) inserts.push(r);
    else if (FIELDS.some((f) => String(old[f] ?? "") !== String(r[f] ?? ""))) updates.push(r);
  }
  for (let i = 0; i < inserts.length; i += CHUNK) {
    await runBatch(
      inserts.slice(i, i + CHUNK).map((r) => [
        "INSERT OR IGNORE INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES(?,?,?,?,?,?,?)",
        [r.platform, r.problem_id, r.title, r.url, r.rating, r.tags, r.category],
      ]),
    );
  }
  for (let i = 0; i < updates.length; i += CHUNK) {
    await runBatch(
      updates.slice(i, i + CHUNK).map((r) => [
        "UPDATE problems SET title=?, url=?, rating=?, tags=?, category=? WHERE platform=? AND problem_id=?",
        [r.title, r.url, r.rating, r.tags, r.category, r.platform, r.problem_id],
      ]),
    );
  }
  // A changed title or tags can mean other topics: classify those again.
  const retopic = updates.filter((r) => {
    const old = existing.get(r.problem_id);
    return old.title !== r.title || String(old.tags ?? "") !== r.tags || String(old.category ?? "") !== r.category;
  });
  if (retopic.length) await require("../topics").forget(platform, retopic.map((r) => r.problem_id)).catch((e) => console.warn("[topics]", e.message));
  return { total: rows.length, added: inserts.length, updated: updates.length };
}

/** Sync one source: fetch its whole list and upsert it. */
async function syncSource(id, { by = null } = {}) {
  await init();
  const m = SOURCES[id];
  if (!m) throw Object.assign(new Error("Unknown source"), { status: 404 });
  if (running.has(id)) throw Object.assign(new Error(`${m.name} is already syncing`), { status: 409 });
  running.set(id, { startedAt: Date.now(), phase: "fetching the problem list" });
  try {
    const rows = await m.list();
    running.set(id, { startedAt: running.get(id).startedAt, phase: `saving ${rows.length} problems` });
    const r = await upsert(id, rows);
    const first = await get("SELECT last_sync, enabled FROM problem_sources WHERE id=?", [id]);
    await run("UPDATE problem_sources SET last_sync=?, last_count=?, last_added=?, last_updated=?, last_error=NULL WHERE id=?", [new Date().toISOString(), r.total, r.added, r.updated, id]);
    // A source's first successful sync switches it on.
    if (first && !first.last_sync && !first.enabled && r.total > 0) {
      await run("UPDATE problem_sources SET enabled=1, updated_by=?, updated_at=? WHERE id=?", [by || "sync", new Date().toISOString(), id]);
      disabledCache = null;
    }
    stmtCounts = null;
    // New and changed problems get their topics (src/topics.js), in the background.
    if (r.added || r.updated) require("../topics").classifyNew({ by: "sync" });
    return r;
  } catch (e) {
    await run("UPDATE problem_sources SET last_error=? WHERE id=?", [String(e.message || e).slice(0, 400), id]).catch(() => {});
    throw e;
  } finally {
    running.delete(id);
  }
}

/**
 * Check a source live without writing anything: fetch the list, then one
 * statement, and report what came back (counts, a sample row, the parsed
 * limits and samples) — the admin's proof that importing really works.
 */
async function testSource(id, { problemId = null } = {}) {
  await init();
  const m = SOURCES[id];
  if (!m) throw Object.assign(new Error("Unknown source"), { status: 404 });
  const t0 = Date.now();
  const report = { at: new Date().toISOString(), ok: false, list: null, statement: null };
  let rows = [];
  try {
    rows = await m.list();
    const rated = rows.filter((r) => Number(r.rating) > 0).length;
    const tagged = rows.filter((r) => r.tags && r.tags !== "[]").length;
    report.list = { ok: rows.length > 0, count: rows.length, rated, tagged, ms: Date.now() - t0, example: rows[Math.floor(rows.length / 2)] ? clean(rows[Math.floor(rows.length / 2)]) : null };
  } catch (e) {
    report.list = { ok: false, error: String(e.message || e).slice(0, 300), ms: Date.now() - t0 };
  }
  // Statement: the requested problem, else a stored one, else one from the list.
  let target = null;
  if (problemId) target = await get("SELECT * FROM problems WHERE platform=? AND problem_id=?", [id, String(problemId)]);
  if (!target) target = rows.length ? clean(rows[Math.min(rows.length - 1, 7)]) : await get("SELECT * FROM problems WHERE platform=? ORDER BY id LIMIT 1", [id]);
  if (target) {
    const t1 = Date.now();
    try {
      const s = await m.statement(target);
      const text = String(s?.statement || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      report.statement = {
        ok: !!s && text.length > 10,
        problem: { problem_id: target.problem_id, title: target.title, url: target.url },
        chars: text.length,
        preview: text.slice(0, 280),
        timeLimit: s?.timeLimit || "",
        memLimit: s?.memLimit || "",
        samples: (s?.samples || []).slice(0, 3),
        sampleCount: (s?.samples || []).length,
        interactive: !!s?.extra?.interactive,
        kind: s?.extra?.kind || m.kind,
        ms: Date.now() - t1,
      };
    } catch (e) {
      report.statement = { ok: false, problem: { problem_id: target.problem_id, title: target.title }, error: String(e.message || e).slice(0, 300), ms: Date.now() - t1 };
    }
  }
  report.ok = !!report.list?.ok && !!report.statement?.ok;
  await run("UPDATE problem_sources SET last_test=? WHERE id=?", [JSON.stringify(report), id]).catch(() => {});
  return report;
}

/** Fetch a statement through its source module (null when the platform has none). */
async function fetchStatement(problem) {
  const m = SOURCES[problem?.platform];
  if (!m) return null;
  return m.statement(problem);
}

/** Sync every source an admin marked for automatic syncing (daily). */
async function autoSyncDue() {
  await init();
  const day = 24 * 3600e3;
  const rows = await all("SELECT id, last_sync FROM problem_sources WHERE auto_sync=1 AND enabled=1");
  for (const r of rows) {
    if (r.last_sync && Date.now() - Date.parse(r.last_sync) < day) continue;
    await syncSource(r.id, { by: "auto" }).catch((e) => console.warn(`[sources] auto sync ${r.id}:`, e.message));
  }
}

module.exports = { SOURCES, MODULES, init, listSources, updateSource, syncSource, testSource, fetchStatement, disabledPlatforms, upsert, autoSyncDue, _reset: () => (disabledCache = null) };
