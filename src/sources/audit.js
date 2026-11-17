// What the imported problems are missing, per source and per problem, and a
// polite re-import for the ones with gaps (Admin → Problem sources, "What is
// missing"; also `node scripts/problems-audit.js`).
//
// A field counts as a gap only when the judge publishes it: if no problem of
// a source has a rating (CSES, Timus…), its ratings are "not published by this
// judge", not missing. Statements are fetched when someone opens a problem
// (or by a re-import), so "not fetched yet" is listed apart from real gaps in
// fetched statements. Images count as missing until our own copy is stored
// (src/media-store.js): statements serve only our copy, never the judge's.
//
// Re-import goes through each source module (official APIs, open datasets,
// the problem page with our honest User-Agent). A judge that blocks servers
// with a bot check stays blocked: that is reported, never worked around.
const { all, get } = require("../db");
const { SOURCES } = require("./index");

const FIELDS = ["statement", "samples", "limits", "tags", "rating", "images"];
const EMPTY_TAGS = "('', '[]')";

let saver = null; // (problemRowid, data) → saves a statement (src/server.js)
let keepMedia = null; // (html) → fetches and stores a statement's media
function useSaver(save, media) {
  saver = save;
  keepMedia = media;
}

/** Judge media in a statement, as absolute URLs we may fetch and store. */
function statementMedia(row, platform) {
  const { normalizeStatementHtml, isProxyableUrl } = require("../statement-media");
  const { mediaUrls } = require("../media-store");
  const html = [row.statement, row.input_spec, row.output_spec, row.note].filter(Boolean).join("\n");
  if (!/<(?:img|video|audio|source)\b/i.test(html)) return [];
  return mediaUrls(normalizeStatementHtml(html, { platform })).filter((u) => isProxyableUrl(u));
}

async function storedKeys(urls) {
  if (!urls.length) return new Set();
  const { keyOf, init } = require("../media-store");
  await init();
  const keys = urls.map(keyOf);
  const found = new Set();
  for (let i = 0; i < keys.length; i += 400) {
    const part = keys.slice(i, i + 400);
    const rows = await all(`SELECT key FROM statement_media WHERE key IN (${part.map(() => "?").join(",")})`, part);
    for (const r of rows) found.add(r.key);
  }
  return found;
}

const samplesOf = (s) => {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
};

/** Per source: problems, statements fetched, and what is missing. */
async function audit() {
  const [byPlatform, stmts] = await Promise.all([
    all(`SELECT platform, COUNT(*) AS n,
           SUM(CASE WHEN rating > 0 THEN 1 ELSE 0 END) AS rated,
           SUM(CASE WHEN tags IS NULL OR tags IN ${EMPTY_TAGS} THEN 0 ELSE 1 END) AS tagged
         FROM problems GROUP BY platform`),
    all(`SELECT p.platform, s.problem_rowid, s.statement, s.input_spec, s.output_spec, s.note, s.samples, s.time_limit, s.memory_limit
         FROM problem_statements s JOIN problems p ON p.id = s.problem_rowid`),
  ]);
  const media = new Map(); // platform → urls
  const per = new Map();
  for (const r of stmts) {
    const a = per.get(r.platform) || { statements: 0, noSamples: 0, noLimits: 0, images: 0, withImages: 0 };
    a.statements++;
    if (!samplesOf(r.samples)) a.noSamples++;
    const memory = SOURCES[r.platform]?.publishes?.memoryLimit !== false;
    if (!String(r.time_limit || "").trim() || (memory && !String(r.memory_limit || "").trim())) a.noLimits++;
    const urls = statementMedia(r, r.platform);
    if (urls.length) {
      a.withImages++;
      const list = media.get(r.platform) || [];
      list.push(...urls);
      media.set(r.platform, list);
    }
    per.set(r.platform, a);
  }
  for (const [platform, urls] of media) {
    const unique = [...new Set(urls)];
    const stored = await storedKeys(unique);
    const { keyOf } = require("../media-store");
    per.get(platform).images = unique.filter((u) => !stored.has(keyOf(u))).length;
    per.get(platform).imageTotal = unique.length;
  }
  return Object.keys(SOURCES).map((id) => {
    const m = SOURCES[id];
    const p = byPlatform.find((x) => x.platform === id) || { n: 0, rated: 0, tagged: 0 };
    const s = per.get(id) || { statements: 0, noSamples: 0, noLimits: 0, images: 0, imageTotal: 0, withImages: 0 };
    const n = Number(p.n) || 0;
    const rated = Number(p.rated) || 0;
    const tagged = Number(p.tagged) || 0;
    // A judge that publishes none of a field is not "missing" it.
    // (stdin judges publish samples and limits unless the module says not:
    // UVa's statements are PDFs, CodeChef has no memory limit.)
    const says = m.publishes || {};
    const published = {
      rating: rated > 0,
      tags: tagged > 0,
      samples: m.kind === "stdin" && says.samples !== false,
      limits: m.kind === "stdin" && says.limits !== false,
    };
    return {
      id,
      name: m.name,
      kind: m.kind,
      problems: n,
      statements: s.statements,
      published,
      missing: {
        statement: n - s.statements,
        samples: published.samples ? s.noSamples : 0,
        limits: published.limits ? s.noLimits : 0,
        tags: published.tags ? n - tagged : 0,
        rating: published.rating ? n - rated : 0,
        images: s.images || 0,
      },
      images: { total: s.imageTotal || 0, inStatements: s.withImages },
    };
  });
}

/** Problems of one source with a given gap (newest first). */
async function gaps(platform, field, { offset = 0, limit = 50 } = {}) {
  if (!SOURCES[platform]) throw Object.assign(new Error("Unknown source"), { status: 404 });
  if (!FIELDS.includes(field)) throw Object.assign(new Error("Unknown field"), { status: 400 });
  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  const off = Math.max(0, Number(offset) || 0);
  const cols = "p.id, p.problem_id, p.title, p.url, p.rating";
  const where = {
    statement: "s.problem_rowid IS NULL",
    samples: "s.problem_rowid IS NOT NULL AND (s.samples IS NULL OR s.samples IN ('', '[]'))",
    limits:
      SOURCES[platform].publishes?.memoryLimit === false
        ? "s.problem_rowid IS NOT NULL AND TRIM(COALESCE(s.time_limit,'')) = ''"
        : "s.problem_rowid IS NOT NULL AND (TRIM(COALESCE(s.time_limit,'')) = '' OR TRIM(COALESCE(s.memory_limit,'')) = '')",
    tags: `(p.tags IS NULL OR p.tags IN ${EMPTY_TAGS})`,
    rating: "(p.rating IS NULL OR p.rating <= 0)",
  }[field];
  if (field === "images") {
    // Statements that show judge media, filtered to those not stored yet.
    const rows = await all(
      `SELECT ${cols}, s.statement, s.input_spec, s.output_spec, s.note FROM problem_statements s JOIN problems p ON p.id = s.problem_rowid
       WHERE p.platform = ? AND (s.statement LIKE '%<img%' OR s.statement LIKE '%<video%' OR s.note LIKE '%<img%' OR s.input_spec LIKE '%<img%' OR s.output_spec LIKE '%<img%')
       ORDER BY p.id DESC`,
      [platform],
    );
    const { keyOf } = require("../media-store");
    const out = [];
    for (const r of rows) {
      const urls = statementMedia(r, platform);
      if (!urls.length) continue;
      const stored = await storedKeys(urls);
      const missing = urls.filter((u) => !stored.has(keyOf(u))).length;
      if (missing) out.push({ id: r.id, problem_id: r.problem_id, title: r.title, url: r.url, rating: r.rating, missingImages: missing });
    }
    return { total: out.length, problems: out.slice(off, off + lim) };
  }
  const join = "FROM problems p LEFT JOIN problem_statements s ON s.problem_rowid = p.id";
  const [total, problems] = await Promise.all([
    get(`SELECT COUNT(*) AS n ${join} WHERE p.platform = ? AND ${where}`, [platform]),
    all(`SELECT ${cols} ${join} WHERE p.platform = ? AND ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [platform, lim, off]),
  ]);
  return { total: Number(total?.n || 0), problems };
}

/* ── re-import ── */

const MAX_BATCH = 25;
let job = null; // { total, done, ok, failed, errors[], startedAt, finishedAt, by, running }

function reimportStatus() {
  return job ? { ...job, errors: job.errors.slice(-10) } : null;
}

/**
 * Fetch the statements of these problems again (and store their media), a
 * few seconds apart, in the background. At most 25 per run.
 */
function reimport(ids, { by = null, delayMs = 1500 } = {}) {
  if (job?.running) throw Object.assign(new Error("A re-import is already running"), { status: 409 });
  if (!saver) throw Object.assign(new Error("Re-import is not available here"), { status: 503 });
  const list = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_BATCH);
  if (!list.length) throw Object.assign(new Error("No problems chosen"), { status: 400 });
  job = { total: list.length, done: 0, ok: 0, failed: 0, errors: [], startedAt: Date.now(), finishedAt: null, by, running: true };
  const run = async () => {
    for (const id of list) {
      const p = await get("SELECT * FROM problems WHERE id = ?", [id]);
      try {
        if (!p) throw new Error("No such problem");
        const m = SOURCES[p.platform];
        if (!m) throw new Error(`No importer for ${p.platform}`);
        const data = await m.statement(p);
        if (!data || String(data.statement || "").replace(/<[^>]+>/g, "").trim().length <= 10) throw new Error("The judge gave no statement");
        await saver(p.id, data);
        job.ok++;
      } catch (e) {
        job.failed++;
        job.errors.push({ id, problem: p ? `${p.platform} ${p.problem_id}` : String(id), error: String(e.message || e).slice(0, 200) });
      }
      job.done++;
      if (job.done < list.length) await new Promise((r) => setTimeout(r, delayMs));
    }
    job.running = false;
    job.finishedAt = Date.now();
  };
  run().catch(() => {
    job.running = false;
    job.finishedAt = Date.now();
  });
  return reimportStatus();
}

/** Store the media of statements we already have (no new statement fetch). */
async function keepImages(ids) {
  if (!keepMedia) throw Object.assign(new Error("Not available here"), { status: 503 });
  const list = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  let started = 0;
  for (const id of list) {
    const r = await get("SELECT p.platform, s.* FROM problem_statements s JOIN problems p ON p.id = s.problem_rowid WHERE s.problem_rowid = ?", [id]);
    if (!r) continue;
    const { normalizeStatementHtml } = require("../statement-media");
    keepMedia(normalizeStatementHtml([r.statement, r.input_spec, r.output_spec, r.note].filter(Boolean).join("\n"), { platform: r.platform }));
    started++;
  }
  return { started };
}

module.exports = { FIELDS, audit, gaps, reimport, reimportStatus, keepImages, useSaver, statementMedia, MAX_BATCH };
