// Importing a problem completely, and finding what is still missing.
//
// saveStatement() is the one way a statement is stored (the problem page,
// the background pre-fetcher and the admin's re-import all use it). It also
//   - stores every image / video of the statement in our database
//     (src/media-store.js), so pages never load them from the judge;
//   - fills the problem's tags and rating from the statement when the list
//     had none (CodeChef sends its tags only with each problem).
//
// auditSource() counts, per source and per problem, what is missing:
// statement, samples, time limit, memory limit, tags, rating, and images not
// stored. Only what the judge itself publishes counts as a gap — LeetCode
// has no time limits, Project Euler no samples (NOT_PUBLISHED).
//
// reimportProblem() / reimportSource() fetch again through the source module
// (official APIs and open datasets first; a judge's bot check is never
// worked around — such a problem stays missing and is shown as missing).
const { run, get, all } = require("./db");
const store = require("./media-store");
const { isProxyableUrl } = require("./statement-media");
const { fetchMedia } = require("./media-fetch");

const GAPS = ["statement", "samples", "time", "memory", "tags", "rating", "images"];

/** What each judge does not publish at all (so it is never counted missing). */
const NOT_PUBLISHED = {
  codechef: ["memory"],
  atcoder: ["tags"],
  leetcode: ["samples", "time", "memory"],
  euler: ["samples", "time", "memory"],
  kattis: ["tags"],
  uva: ["samples", "time", "memory", "tags"],
  timus: ["tags"],
};

/** Plain words for the admin page and the script. */
const GAP_LABEL = {
  statement: "No statement",
  samples: "No samples",
  time: "No time limit",
  memory: "No memory limit",
  tags: "No tags",
  rating: "No rating",
  images: "Images not stored",
};

const emptyTags = (t) => !t || t === "[]" || t === "null" || t === '""';

/**
 * Save every media file of `html` we may store. Resolves to
 * { found, stored, failed: [url], foreign: [url] } — foreign media sits on a
 * host we never fetch from (not one of the judges), so it cannot be stored.
 */
async function storeImages(html, { fetchImpl, limit = 32 } = {}) {
  const urls = [...new Set(store.mediaUrls(html).map((u) => {
    try {
      return new URL(u).toString();
    } catch {
      return null;
    }
  }).filter(Boolean))];
  const out = { found: urls.length, stored: 0, failed: [], foreign: [] };
  const ours = urls.filter((u) => isProxyableUrl(u));
  out.foreign = urls.filter((u) => !isProxyableUrl(u));
  const have = await store.storedSet(ours).catch(() => new Set());
  for (const u of ours.slice(0, limit)) {
    if (have.has(u)) {
      out.stored++;
      continue;
    }
    try {
      const entry = await fetchMedia(u, fetchImpl ? { fetchImpl } : {});
      if (await store.save(u, entry)) out.stored++;
      else out.failed.push(u);
    } catch {
      out.failed.push(u);
    }
  }
  for (const u of ours.slice(limit)) out.failed.push(u);
  return out;
}

const htmlOf = (d) => [d.statement, d.inputSpec, d.outputSpec, d.note].filter(Boolean).join("\n");

/**
 * Store a statement (and its images), and fill the problem's empty tags and
 * rating from it. `waitImages` waits for the images (re-import); otherwise
 * they are stored in the background (the page shows the statement at once).
 */
async function saveStatement(problemId, data, { waitImages = false, fetchImpl } = {}) {
  await run(
    `INSERT OR REPLACE INTO problem_statements
    (problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      problemId,
      data.statement || "",
      data.inputSpec || "",
      data.outputSpec || "",
      data.note || "",
      data.timeLimit || "",
      data.memLimit || "",
      JSON.stringify(data.samples || []),
      new Date().toISOString(),
      JSON.stringify(data.extra || {}),
    ],
  );
  const filled = await fillFromStatement(problemId, data).catch(() => []);
  forget(null);
  const work = storeImages(htmlOf(data), { fetchImpl }).catch(() => ({ found: 0, stored: 0, failed: [], foreign: [] }));
  const images = waitImages ? await work : null;
  return { filled, images };
}

/** Tags and rating the statement knows and the problem row lacks. */
async function fillFromStatement(problemId, data) {
  const ex = data.extra || {};
  const tags = Array.isArray(ex.tags) ? ex.tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().toLowerCase()).slice(0, 12) : [];
  const rating = Math.round(Number(ex.rating) || 0);
  if (!tags.length && !(rating > 0)) return [];
  const row = await get("SELECT tags, rating FROM problems WHERE id=?", [problemId]);
  if (!row) return [];
  const sets = [];
  const vals = [];
  const filled = [];
  if (tags.length && emptyTags(row.tags)) sets.push("tags=?"), vals.push(JSON.stringify(tags)), filled.push("tags");
  if (rating > 0 && !(Number(row.rating) > 0)) sets.push("rating=?"), vals.push(rating), filled.push("rating");
  if (!sets.length) return [];
  await run(`UPDATE problems SET ${sets.join(", ")} WHERE id=?`, [...vals, problemId]);
  try {
    require("./problem-catalog").invalidateCatalog();
  } catch {
    /* no catalog in this process */
  }
  return filled;
}

/* ── the audit ── */

const cache = new Map(); // platform → { at, rows, summary }
const CACHE_MS = 10 * 60_000;
function forget(platform) {
  if (platform) cache.delete(platform);
  else cache.clear();
}

/**
 * Every problem of a source with what it is missing. Reads lengths and flags
 * in SQL (never whole statements), then the HTML only of statements that
 * have media, to check those were stored.
 */
async function auditSource(platform, { refresh = false } = {}) {
  const hit = cache.get(platform);
  if (hit && !refresh && Date.now() - hit.at < CACHE_MS) return hit;
  const notPublished = new Set(NOT_PUBLISHED[platform] || []);
  const body = "COALESCE(s.statement,'') || COALESCE(s.input_spec,'') || COALESCE(s.output_spec,'') || COALESCE(s.note,'')";
  const rows = await all(
    `SELECT p.id, p.problem_id, p.title, p.url, p.rating, p.tags,
       CASE WHEN s.problem_rowid IS NULL THEN -1 ELSE length(COALESCE(s.statement,'')) END AS slen,
       CASE WHEN json_valid(s.samples) THEN json_array_length(s.samples) ELSE 0 END AS ns,
       COALESCE(s.time_limit,'') AS tl, COALESCE(s.memory_limit,'') AS ml,
       CASE WHEN json_valid(s.extra) THEN json_extract(s.extra,'$.pdf') END AS pdf,
       CASE WHEN json_valid(s.extra) THEN json_extract(s.extra,'$.interactive') END AS interactive,
       (instr(${body}, '<img') > 0 OR instr(${body}, '<video') > 0 OR instr(${body}, '<audio') > 0) AS media
     FROM problems p LEFT JOIN problem_statements s ON s.problem_rowid = p.id
     WHERE p.platform = ? ORDER BY p.id`,
    [platform],
  );

  // Media: which statements have some not stored yet.
  const unstored = new Map(); // problem id → count of media not stored
  const withMedia = rows.filter((r) => r.media && r.slen > 10).map((r) => r.id);
  for (let i = 0; i < withMedia.length; i += 100) {
    const ids = withMedia.slice(i, i + 100);
    const docs = await all(`SELECT problem_rowid AS id, ${body.replace(/s\./g, "")} AS html FROM problem_statements WHERE problem_rowid IN (${ids.map(() => "?").join(",")})`, ids);
    const urlsById = docs.map((d) => [d.id, store.mediaUrls(d.html).map((u) => { try { return new URL(u).toString(); } catch { return null; } }).filter(Boolean)]);
    const have = await store.storedSet(urlsById.flatMap(([, u]) => u)).catch(() => new Set());
    for (const [id, urls] of urlsById) {
      const missing = urls.filter((u) => !have.has(u)).length;
      if (missing) unstored.set(id, missing);
    }
  }

  const out = [];
  const gaps = Object.fromEntries(GAPS.map((g) => [g, 0]));
  let statements = 0;
  for (const r of rows) {
    const g = [];
    const hasStatement = r.slen > 10 || !!r.pdf;
    if (hasStatement) statements++;
    if (!hasStatement) g.push("statement");
    else {
      if (!notPublished.has("samples") && !r.pdf && !Number(r.interactive) && !(Number(r.ns) > 0)) g.push("samples");
      if (!notPublished.has("time") && !r.pdf && !r.tl) g.push("time");
      if (!notPublished.has("memory") && !r.pdf && !r.ml) g.push("memory");
      if (unstored.has(r.id)) g.push("images");
    }
    if (!notPublished.has("tags") && emptyTags(r.tags)) g.push("tags");
    if (!notPublished.has("rating") && !(Number(r.rating) > 0)) g.push("rating");
    for (const x of g) gaps[x]++;
    if (g.length) out.push({ id: r.id, problemId: r.problem_id, title: r.title, url: r.url, gaps: g, imagesMissing: unstored.get(r.id) || 0 });
  }
  const summary = { platform, problems: rows.length, statements, complete: rows.length - out.length, gaps, notPublished: [...notPublished] };
  const result = { at: Date.now(), summary, rows: out };
  cache.set(platform, result);
  return result;
}

/** A page of a source's problems with gaps (optionally one kind of gap, or a title / id search). */
async function gapRows(platform, { gap = "", q = "", page = 1, size = 50 } = {}) {
  const { rows, at } = await auditSource(platform);
  const needle = String(q || "").trim().toLowerCase();
  const list = rows.filter((r) => (!gap || r.gaps.includes(gap)) && (!needle || r.title.toLowerCase().includes(needle) || String(r.problemId).toLowerCase().includes(needle)));
  const p = Math.max(1, Math.floor(Number(page) || 1));
  return { at, total: list.length, page: p, size, rows: list.slice((p - 1) * size, p * size) };
}

/* ── re-import ── */

const jobs = new Map(); // platform → { startedAt, total, done, ok, failed, current, cancel, by, finishedAt, error }

/** Fetch a problem's statement again and store it with its images. */
async function reimportProblem(rowid, { fetchImpl } = {}) {
  const problem = await get("SELECT * FROM problems WHERE id=?", [rowid]);
  if (!problem) throw Object.assign(new Error("No such problem"), { status: 404 });
  let data = null;
  let error = null;
  try {
    data = await require("./sources").fetchStatement(problem);
  } catch (e) {
    error = e.blocked ? `${new URL(problem.url || "https://x").host || problem.platform} blocks automated access from our server (bot check) — open it on the judge` : String(e.message || e).slice(0, 300);
  }
  const ok = !!data && (String(data.statement || "").replace(/<[^>]+>/g, "").trim().length > 10 || !!data.extra?.pdf);
  if (!ok) {
    forget(problem.platform);
    return { ok: false, error: error || "The judge gave no statement for this problem" };
  }
  const saved = await saveStatement(problem.id, data, { waitImages: true, fetchImpl });
  forget(problem.platform);
  return { ok: true, samples: (data.samples || []).length, timeLimit: data.timeLimit || "", memLimit: data.memLimit || "", filled: saved.filled, images: saved.images };
}

/**
 * Re-import a source: its list first (tags and ratings), then the statements
 * of up to `limit` problems with gaps, one at a time with a polite pause.
 * Runs in the background; jobStatus() shows its progress.
 */
function reimportSource(platform, { limit = 100, by = null, pauseMs } = {}) {
  const sources = require("./sources");
  if (!sources.SOURCES[platform]) throw Object.assign(new Error("Unknown source"), { status: 404 });
  const cur = jobs.get(platform);
  if (cur && !cur.finishedAt) throw Object.assign(new Error("A re-import of this source is already running"), { status: 409 });
  const job = { startedAt: Date.now(), total: 0, done: 0, ok: 0, failed: 0, current: "the problem list", cancel: false, by, finishedAt: null, error: null, failures: [] };
  jobs.set(platform, job);
  const pause = pauseMs ?? (platform === "codeforces" ? 2500 : 800);
  (async () => {
    try {
      await sources.syncSource(platform, { by }).catch((e) => {
        job.failures.push({ problemId: "(list)", error: String(e.message || e).slice(0, 200) });
      });
      forget(platform);
      const { rows } = await auditSource(platform, { refresh: true });
      const todo = rows.filter((r) => r.gaps.some((g) => g !== "tags" && g !== "rating")).slice(0, Math.max(1, Math.min(500, limit)));
      job.total = todo.length;
      for (const r of todo) {
        if (job.cancel) break;
        job.current = r.problemId;
        const res = await reimportProblem(r.id).catch((e) => ({ ok: false, error: String(e.message || e) }));
        job.done++;
        if (res.ok) job.ok++;
        else {
          job.failed++;
          if (job.failures.length < 20) job.failures.push({ problemId: r.problemId, error: res.error });
        }
        await new Promise((ok) => setTimeout(ok, pause));
      }
    } catch (e) {
      job.error = String(e.message || e).slice(0, 300);
    } finally {
      job.current = null;
      job.finishedAt = Date.now();
      forget(platform);
    }
  })();
  return job;
}

function cancelReimport(platform) {
  const j = jobs.get(platform);
  if (j && !j.finishedAt) j.cancel = true;
  return j || null;
}

function jobStatus(platform) {
  const j = jobs.get(platform);
  if (!j) return null;
  const { cancel, ...rest } = j;
  return { ...rest, cancelled: cancel };
}

module.exports = { GAPS, GAP_LABEL, NOT_PUBLISHED, saveStatement, fillFromStatement, storeImages, auditSource, gapRows, reimportProblem, reimportSource, cancelReimport, jobStatus, forget };
