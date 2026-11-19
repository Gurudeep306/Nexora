// Statement backfill: fetch and store the statement of every problem that has
// none yet, so opening a problem never waits on the judge's website.
//
// One loop per judge, all judges at once, one request at a time per judge with
// a polite gap (we read public pages the way a person would, slowly). A
// problem the judge would not give us is remembered with a growing wait before
// it is tried again, and a judge that keeps refusing (rate limit, bot check) is
// left alone for a while — never hammered.
//
// It runs in two places that share the database: inside the server while it is
// awake (newest problems first) and from a scheduled GitHub Actions job
// (oldest first), so the two meet in the middle instead of fetching the same
// problem twice — without any extra database writes to coordinate.
const { run, get, all } = require("../db");

const GAP_MS = { codeforces: 2500, leetcode: 2500, codechef: 2000, atcoder: 1500 };
const DEFAULT_GAP_MS = 1800;
const MIN_TEXT = 10;

let ready = null;
function init() {
  if (!ready) {
    ready = run(`CREATE TABLE IF NOT EXISTS statement_fetch_failures (
      problem_rowid INTEGER PRIMARY KEY,
      tries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_try_at INTEGER NOT NULL DEFAULT 0
    )`).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** How long to wait before trying a refused problem again: 1h, 4h, 16h, … up to 30 days. */
function retryDelayMs(tries) {
  return Math.min(30 * 24 * 3600e3, 3600e3 * 4 ** Math.max(0, tries - 1));
}

/** A judge that is refusing us (rate limit, bot check, server down): rest that judge, not just the problem. */
function judgeRefused(message) {
  return /\b(429|403|503|rate.?limit|too many|captcha|cloudflare|forbidden|ECONNRESET|ETIMEDOUT|timed? ?out)\b/i.test(String(message || ""));
}

const hasText = (data) => String(data?.statement || "").replace(/<[^>]+>/g, "").trim().length > MIN_TEXT;

/**
 * Problems of one judge that still have no statement and are due, in the
 * given order. Read once per run (one pass over that judge's problems, the
 * stored ids and the short failure list) — never a table scan per batch, so
 * a whole fill costs about three row reads per problem on Turso.
 */
async function due(platform, order, nowMs = Date.now()) {
  const dir = order === "asc" ? "ASC" : "DESC";
  const [rows, stored, waiting] = await Promise.all([
    // Only the ids are kept in memory (the free server has 512 MB); each row is read just before its fetch.
    all(`SELECT id FROM problems WHERE platform = ? AND COALESCE(category, '') <> '__hidden' ORDER BY id ${dir}`, [platform]),
    all("SELECT s.problem_rowid AS id FROM problem_statements s JOIN problems p ON p.id = s.problem_rowid WHERE p.platform = ?", [platform]),
    all("SELECT problem_rowid AS id FROM statement_fetch_failures WHERE next_try_at > ?", [nowMs]),
  ]);
  const skip = new Set([...stored, ...waiting].map((r) => Number(r.id)));
  return rows.filter((p) => !skip.has(Number(p.id)));
}

async function noteFailure(id, message, nowMs = Date.now()) {
  const row = await get("SELECT tries FROM statement_fetch_failures WHERE problem_rowid = ?", [id]);
  const tries = (Number(row?.tries) || 0) + 1;
  await run(
    `INSERT INTO statement_fetch_failures(problem_rowid, tries, last_error, next_try_at) VALUES(?,?,?,?)
     ON CONFLICT(problem_rowid) DO UPDATE SET tries = excluded.tries, last_error = excluded.last_error, next_try_at = excluded.next_try_at`,
    [id, tries, String(message || "").slice(0, 300), nowMs + retryDelayMs(tries)],
  );
}

/**
 * Start filling statements. Returns a handle with stop() and status().
 *
 *   save(problemId, data)   stores one statement (the server's own saver)
 *   fetch(problem)          gets one statement from its judge
 *   platforms               judges to fill (default: every enabled source)
 *   order                   "desc" (newest first) or "asc"
 *   until                   a time (ms) to stop at, for a job with a time limit
 *   gapMs(platform)         the pause between two requests to one judge
 *   restMs                  how long a refusing judge is left alone
 */
function start({ save, fetch, platforms, order = "desc", until = Infinity, gapMs = (p) => GAP_MS[p] ?? DEFAULT_GAP_MS, restMs = 20 * 60e3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} } = {}) {
  if (typeof save !== "function" || typeof fetch !== "function") throw new Error("backfill needs save and fetch");
  const state = { running: true, startedAt: Date.now(), order, judges: {} };
  let stopped = false;
  const alive = () => !stopped && Date.now() < until;
  // Sleep in short steps so stop() and the deadline take effect quickly.
  const rest = async (ms) => {
    const end = Date.now() + ms;
    while (alive() && Date.now() < end) await sleep(Math.min(1000, end - Date.now()));
  };

  const loop = async (platform) => {
    const j = (state.judges[platform] = { left: null, saved: 0, failed: 0, refusedInARow: 0, resting: false, done: false, lastError: null });
    while (alive()) {
      let list;
      try {
        list = await due(platform, order);
      } catch (e) {
        j.lastError = e.message;
        await rest(60e3);
        continue;
      }
      j.left = list.length;
      if (!list.length) {
        j.done = true;
        break;
      }
      let rested = false;
      for (const { id } of list) {
        if (!alive()) break;
        // The page (or the other filler) may have stored it meanwhile.
        const have = await get("SELECT 1 AS x FROM problem_statements WHERE problem_rowid = ?", [id]).catch(() => null);
        const p = have ? null : await get("SELECT * FROM problems WHERE id = ?", [id]).catch(() => null);
        if (!p) {
          j.left--;
          continue;
        }
        try {
          const data = await fetch(p);
          if (!hasText(data)) throw new Error("The judge gave no statement");
          await save(p.id, data);
          j.saved++;
          j.refusedInARow = 0;
        } catch (e) {
          j.failed++;
          j.lastError = String(e.message || e).slice(0, 200);
          await noteFailure(p.id, j.lastError).catch(() => {});
          if (judgeRefused(j.lastError)) j.refusedInARow++;
          else j.refusedInARow = 0;
        }
        j.left--;
        if (j.refusedInARow >= 3) {
          log(`[backfill] ${platform}: the judge is refusing (${j.lastError}); resting ${Math.round(restMs / 60e3)} min`);
          j.resting = true;
          await rest(restMs);
          j.resting = false;
          j.refusedInARow = 0;
          rested = true;
          break; // read what is due again after the rest
        }
        await rest(gapMs(platform));
      }
      // One full pass done; what failed waits for its retry time.
      if (!rested) {
        j.done = true;
        break;
      }
    }
  };

  const done = (async () => {
    await init();
    const list = platforms && platforms.length ? platforms : await defaultPlatforms();
    log(`[backfill] filling statements for ${list.join(", ")} (${order === "asc" ? "oldest" : "newest"} first)`);
    await Promise.all(list.map((p) => loop(p).catch((e) => log(`[backfill] ${p} stopped: ${e.message}`))));
    state.running = false;
    state.finishedAt = Date.now();
    const saved = Object.values(state.judges).reduce((n, j) => n + j.saved, 0);
    log(`[backfill] finished: ${saved} statements stored`);
  })();

  return {
    done,
    stop() {
      stopped = true;
    },
    status: () => ({ ...state, judges: JSON.parse(JSON.stringify(state.judges)) }),
  };
}

/** Every enabled judge that has a statement importer. */
async function defaultPlatforms() {
  const src = require("./index");
  const off = await src.disabledPlatforms().catch(() => new Set());
  return src.MODULES.filter((id) => !off.has(id) && typeof src.SOURCES[id]?.statement === "function");
}

/** Per judge: problems, statements stored, how many came with sample tests, and how many wait to be retried (admin page; a full scan, so only on request). */
async function coverage() {
  await init();
  const rows = await all(
    `SELECT p.platform AS platform, COUNT(*) AS total, COUNT(s.problem_rowid) AS stored,
            COUNT(CASE WHEN s.samples IS NOT NULL AND s.samples NOT IN ('', '[]') THEN 1 END) AS withSamples,
            COUNT(CASE WHEN s.problem_rowid IS NULL AND f.problem_rowid IS NOT NULL THEN 1 END) AS failing
       FROM problems p
       LEFT JOIN problem_statements s ON s.problem_rowid = p.id
       LEFT JOIN statement_fetch_failures f ON f.problem_rowid = p.id
      WHERE COALESCE(p.category, '') <> '__hidden'
      GROUP BY p.platform ORDER BY p.platform`,
  );
  return rows.map((r) => ({ platform: r.platform, total: Number(r.total) || 0, stored: Number(r.stored) || 0, withSamples: Number(r.withSamples) || 0, failing: Number(r.failing) || 0 }));
}

module.exports = { start, due, coverage, init, retryDelayMs, judgeRefused, defaultPlatforms, GAP_MS };
