// ─────────────────────────────────────────────────────────────────────────────
// Database driver selection
//
//  • Cloud (production): when TURSO_DATABASE_URL is set and NODE_ENV is
//    "production" (or USE_CLOUD_DB=1), every query goes to a
//    hosted libSQL/Turso database via @libsql/client. Free hosts wipe the local
//    disk on every restart, so the data has to live off the server.
//  • Local (your Mac): otherwise we use the on-disk SQLite file tracker.db via
//    the native `sqlite3` addon, falling back to Node's built-in node:sqlite.
//
// All callers use the same promise API — run / get / all — and receive the same
// shapes (`{ lastID, changes }`, a plain row object, an array of plain rows).
// ─────────────────────────────────────────────────────────────────────────────
const path = require("path");
const tutorialData = require("./tutorial-data");
const forgePaths = require("./dev-roadmap-data");

const IS_TEST = process.env.NODE_ENV === "test";
// The cloud DB is only used in production (Render sets NODE_ENV=production) or
// when USE_CLOUD_DB=1 — so having TURSO_* in your local .env for the backup /
// migration scripts never makes `npm start` on your Mac write to live data.
const USE_CLOUD =
  !IS_TEST &&
  (process.env.NODE_ENV === "production" || process.env.USE_CLOUD_DB === "1");
const REMOTE_URL = USE_CLOUD ? (process.env.TURSO_DATABASE_URL || "").trim() : "";
const DRIVER = REMOTE_URL ? "libsql" : null;

let sqlite3;
let _usingBuiltinSqlite = false;
let BuiltinDatabaseSync;
let libsql = null; // @libsql/client instance (cloud mode)
let db = null; // sqlite3 / node:sqlite handle (local mode)

// Allow tests/CI to run fast and without touching the real on-disk DB.
// - DB_PATH can be overridden explicitly via env var.
// - In test mode we default to an in-memory DB.
const DB_PATH =
  process.env.DB_PATH ||
  (IS_TEST ? ":memory:" : path.join(__dirname, "..", "tracker.db"));

if (DRIVER === "libsql") {
  // eslint-disable-next-line global-require
  const { createClient } = require("@libsql/client");
  libsql = createClient({
    url: REMOTE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    intMode: "number",
  });
} else {
  // NOTE: `sqlite3` is a native addon and may fail to load in some environments
  // (e.g. mismatched architecture / prebuilt binaries). We fall back to Node's
  // built-in SQLite binding when that happens, so the app (and tests) still run.
  try {
    // eslint-disable-next-line global-require
    sqlite3 = require("sqlite3").verbose();
  } catch (e) {
    _usingBuiltinSqlite = true;
    // eslint-disable-next-line global-require
    ({ DatabaseSync: BuiltinDatabaseSync } = require("node:sqlite"));
  }
  db = _usingBuiltinSqlite
    ? new BuiltinDatabaseSync(DB_PATH)
    : new sqlite3.Database(DB_PATH);
}

/* ── Query accounting (dev/perf tooling) ──
 * Every run/get/all is one network round trip on Turso, so the number of
 * queries per request is what dominates latency in production. Each call is
 * counted against the current request (logged when DB_QUERY_STATS=1; each
 * statement is printed with DB_QUERY_LOG=1), and
 * DB_SIM_LATENCY_MS adds an artificial per-query delay so a local SQLite DB
 * behaves like a remote one when profiling. Both are no-ops by default. */
const { countQuery } = require("./context");
const SIM_LATENCY_MS = Number(process.env.DB_SIM_LATENCY_MS) || 0;
const LOG_QUERIES = process.env.DB_QUERY_LOG === "1";
async function beforeQuery(sql) {
  countQuery();
  if (LOG_QUERIES) console.log("[sql]", String(sql).replace(/\s+/g, " ").slice(0, 160));
  if (SIM_LATENCY_MS > 0) await new Promise((r) => setTimeout(r, SIM_LATENCY_MS));
}

/* ── Write hooks ──
 * In-memory caches (problem catalog, session/role lookups) register a pattern
 * here and are invalidated whenever this process writes to the table they
 * mirror, so they never serve data older than the last write made through
 * run()/runMany(). */
const writeHooks = [];
function onWrite(pattern, fn) {
  writeHooks.push([pattern, fn]);
}
function notifyWrite(sql) {
  for (const [pattern, fn] of writeHooks) {
    if (pattern.test(sql)) {
      try {
        fn(sql);
      } catch {}
    }
  }
}

/* ── libSQL helpers ── */
// sqlite3 silently binds undefined → NULL and booleans → 0/1; libSQL is strict.
function toLibsqlValue(v) {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}
function toLibsqlArgs(params) {
  if (params == null) return [];
  if (Array.isArray(params)) return params.map(toLibsqlValue);
  if (typeof params === "object") {
    // sqlite3 named params are written as { $name: v } / { :name: v } / { @name: v }
    const out = {};
    for (const [k, v] of Object.entries(params)) out[k.replace(/^[$:@]/, "")] = toLibsqlValue(v);
    return out;
  }
  return [toLibsqlValue(params)];
}
function plainRow(row, columns) {
  if (!row) return undefined;
  const o = {};
  for (const c of columns) o[c] = row[c];
  return o;
}
async function libsqlExec(sql, params) {
  try {
    return await libsql.execute({ sql, args: toLibsqlArgs(params) });
  } catch (err) {
    // Surface the SQL in the message for easier debugging of cloud-only issues.
    if (err && typeof err.message === "string" && !err.message.includes("[sql]")) {
      err.message += ` [sql] ${String(sql).slice(0, 160)}`;
    }
    throw err;
  }
}

const dbStats = require("./db-stats");

const run = async (sql, params = []) => {
  await beforeQuery(sql);
  let r;
  try {
    r = await runRaw(sql, params);
    return r;
  } finally {
    // After the write lands (or fails), so a cache reload that raced it is
    // seen as stale rather than tagged as current.
    if (writeHooks.length) notifyWrite(sql);
    if (r) await dbStats.record(sql, params, 0, r.changes || 0);
  }
};

const runRaw = async (sql, params) => {
  if (libsql) {
    const rs = await libsqlExec(sql, params);
    return {
      // Keep compatibility with node-sqlite3's `{ lastID, changes }`
      lastID: rs.lastInsertRowid == null ? 0 : Number(rs.lastInsertRowid),
      changes: Number(rs.rowsAffected || 0),
    };
  }
  return new Promise((resolve, reject) => {
    if (_usingBuiltinSqlite) {
      try {
        const stmt = db.prepare(sql);
        const r = Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
        resolve({
          lastID: Number(r?.lastInsertRowid || 0),
          changes: Number(r?.changes || 0),
        });
      } catch (err) {
        reject(err);
      }
      return;
    }
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });
};

/** Every row of a query, without accounting (also used by db-stats itself). */
const allRaw = async (sql, params = []) => {
  if (libsql) {
    const rs = await libsqlExec(sql, params);
    return rs.rows.map((r) => plainRow(r, rs.columns));
  }
  return new Promise((resolve, reject) => {
    if (_usingBuiltinSqlite) {
      try {
        const stmt = db.prepare(sql);
        const rows = Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
      return;
    }
    db.all(sql, params, (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });
};

const get = async (sql, params = []) => {
  await beforeQuery(sql);
  if (libsql) {
    const rs = await libsqlExec(sql, params);
    const row = plainRow(rs.rows[0], rs.columns);
    await dbStats.record(sql, params, rs.rows.length ? 1 : 0, Number(rs.rowsAffected || 0));
    return row;
  }
  const row = await new Promise((resolve, reject) => {
    if (_usingBuiltinSqlite) {
      try {
        const stmt = db.prepare(sql);
        const r = Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
        resolve(r);
      } catch (err) {
        reject(err);
      }
      return;
    }
    db.get(sql, params, (err, r) => {
      err ? reject(err) : resolve(r);
    });
  });
  await dbStats.record(sql, params, row ? 1 : 0, 0);
  return row;
};

const all = async (sql, params = []) => {
  await beforeQuery(sql);
  const rows = await allRaw(sql, params);
  await dbStats.record(sql, params, rows.length, 0);
  return rows;
};

// DB_STATS=1: EXPLAIN QUERY PLAN + table sizes for the read estimates. Both
// bypass the accounting above (and EXPLAIN reads no table rows).
dbStats.configure({
  explain: (sql, params) => allRaw(`EXPLAIN QUERY PLAN ${sql}`, params),
  tableSize: async (table) => {
    if (!/^\w+$/.test(table)) return 0;
    const r = await allRaw(`SELECT MAX(rowid) AS n FROM "${table}"`);
    return r[0]?.n || 0;
  },
});

/**
 * Run the same statement for many parameter rows. In cloud mode this is sent
 * as one batched round-trip (in chunks) instead of one HTTP request per row,
 * which keeps startup seeding fast.
 */
async function runMany(sql, rows, chunkSize = 200) {
  if (!rows.length) return;
  if (libsql) {
    try {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        countQuery();
        const rs = await libsql.batch(
          slice.map((p) => ({ sql, args: toLibsqlArgs(p) })),
          "write",
        );
        for (let j = 0; j < rs.length; j++) await dbStats.record(sql, slice[j], 0, Number(rs[j].rowsAffected || 0));
      }
    } finally {
      if (writeHooks.length) notifyWrite(sql);
    }
    return;
  }
  for (const p of rows) await run(sql, p);
}

/**
 * Run several different statements ([sql, params] pairs) in order. In cloud
 * mode they go to libSQL as ONE batched round trip (atomic); locally they run
 * one after another on the same connection.
 */
async function runBatch(stmts) {
  const list = stmts.filter(Boolean);
  if (!list.length) return [];
  if (libsql) {
    countQuery();
    try {
      const rs = await libsql.batch(
        list.map(([sql, params]) => ({ sql, args: toLibsqlArgs(params) })),
        "write",
      );
      for (let j = 0; j < rs.length; j++) {
        await dbStats.record(list[j][0], list[j][1] || [], rs[j].rows?.length || 0, Number(rs[j].rowsAffected || 0));
      }
      return rs.map((r) => ({ changes: Number(r.rowsAffected || 0) }));
    } finally {
      if (writeHooks.length) for (const [sql] of list) notifyWrite(sql);
    }
  }
  const out = [];
  for (const [sql, params] of list) out.push(await run(sql, params || []));
  return out;
}

function dbInfo() {
  return {
    driver: libsql ? "libsql" : _usingBuiltinSqlite ? "node:sqlite" : "sqlite3",
    target: libsql ? REMOTE_URL.replace(/\?.*$/, "") : DB_PATH,
  };
}

async function initDb() {
  // Pragmas tuned for production/dev on-disk DB.
  // In tests (often in-memory), keep pragmas lightweight to avoid slow startups.
  if (!libsql) {
    try {
      await run(
        `PRAGMA journal_mode=${DB_PATH === ":memory:" ? "MEMORY" : "WAL"}`,
      );
    } catch {}
    try {
      await run("PRAGMA synchronous=NORMAL");
      await run("PRAGMA cache_size=-8000");
      await run("PRAGMA mmap_size=268435456");
      await run("PRAGMA temp_store=MEMORY");
    } catch {}
    await run("PRAGMA foreign_keys=ON");
  }

  await run(`CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    category TEXT DEFAULT '',
    UNIQUE(platform, problem_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_rowid INTEGER NOT NULL UNIQUE,
    status TEXT DEFAULT 'unsolved',
    attempts INTEGER DEFAULT 0,
    solved_at TEXT,
    time_spent INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    xp_earned INTEGER DEFAULT 0,
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    problem_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(username, problem_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS testcases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_rowid INTEGER NOT NULL,
    label TEXT DEFAULT 'Sample',
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_rowid INTEGER NOT NULL,
    code TEXT NOT NULL,
    language TEXT DEFAULT 'cpp',
    verdict TEXT NOT NULL,
    exec_time_ms INTEGER DEFAULT 0,
    memory_kb INTEGER DEFAULT 0,
    submitted_at TEXT NOT NULL,
    test_results TEXT DEFAULT '[]',
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS daily_activity (
    date TEXT PRIMARY KEY,
    problems_solved INTEGER DEFAULT 0,
    problems_attempted INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    target INTEGER DEFAULT 1,
    progress INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    unlocked_at TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  // Daily challenges table
  await run(`CREATE TABLE IF NOT EXISTS daily_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    problem_rowid INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    bonus_xp INTEGER DEFAULT 50,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    UNIQUE(date, problem_rowid),
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  // Titles/ranks table
  await run(`CREATE TABLE IF NOT EXISTS player_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    min_xp INTEGER DEFAULT 0,
    color TEXT DEFAULT '#94a3b8',
    glow TEXT DEFAULT 'none'
  )`);

  // Seed unified Rift Levels as titles
  const titles = [
    ["Bit", 0, "#6b7280", "none"],
    ["Byte", 100, "#84cc16", "none"],
    ["Kilobyte", 400, "#22c55e", "0 0 6px rgba(34,197,94,0.3)"],
    ["Megabyte", 1200, "#06b6d4", "0 0 8px rgba(6,182,212,0.3)"],
    ["Gigabyte", 3500, "#3b82f6", "0 0 10px rgba(59,130,246,0.4)"],
    ["Terabyte", 8000, "#8b5cf6", "0 0 12px rgba(139,92,246,0.5)"],
    ["Petabyte", 18000, "#d946ef", "0 0 14px rgba(217,70,239,0.5)"],
    ["Exabyte", 40000, "#f43f5e", "0 0 16px rgba(244,63,94,0.6)"],
    ["Zettabyte", 85000, "#ef4444", "0 0 18px rgba(239,68,68,0.6)"],
    ["Yottabyte", 180000, "#f59e0b", "0 0 22px rgba(245,158,11,0.7)"],
    ["∞ Overflow", 400000, "#fbbf24", "0 0 28px rgba(251,191,36,0.8)"],
  ];
  await runMany(
    `INSERT OR IGNORE INTO player_titles(title,min_xp,color,glow) VALUES(?,?,?,?)`,
    titles,
  );

  // Seed achievements
  const achvs = [
    [
      "first_blood",
      "First Blood",
      "Solve your first problem",
      "sword",
      "milestone",
      1,
      20,
    ],
    ["streak_3", "On Fire", "3-day solve streak", "fire", "streak", 3, 30],
    [
      "streak_7",
      "Week Warrior",
      "7-day solve streak",
      "shield",
      "streak",
      7,
      75,
    ],
    [
      "streak_30",
      "Monthly Beast",
      "30-day solve streak",
      "dragon",
      "streak",
      30,
      200,
    ],
    ["solve_10", "Warm Up", "Solve 10 problems", "muscle", "solve", 10, 50],
    [
      "solve_50",
      "Getting Serious",
      "Solve 50 problems",
      "target",
      "solve",
      50,
      150,
    ],
    [
      "solve_100",
      "Centurion",
      "Solve 100 problems",
      "trophy",
      "solve",
      100,
      300,
    ],
    ["solve_500", "Legend", "Solve 500 problems", "crown", "solve", 500, 1000],
    [
      "rating_1000",
      "Pupil",
      "Solve a 1000+ rated problem",
      "medal_green",
      "rating",
      1,
      25,
    ],
    [
      "rating_1400",
      "Expert",
      "Solve a 1400+ rated problem",
      "medal_blue",
      "rating",
      1,
      50,
    ],
    [
      "rating_1800",
      "Master",
      "Solve a 1800+ rated problem",
      "medal_purple",
      "rating",
      1,
      100,
    ],
    [
      "rating_2100",
      "Grandmaster",
      "Solve a 2100+ rated problem",
      "medal_red",
      "rating",
      1,
      200,
    ],
    [
      "both_platforms",
      "Cross-Platform",
      "Solve on both CF & CC",
      "globe",
      "special",
      2,
      75,
    ],
    [
      "speed_demon",
      "Speed Demon",
      "AC in under 5 minutes",
      "lightning",
      "special",
      1,
      100,
    ],
    [
      "perfect_score",
      "Perfect Score",
      "AC on first attempt",
      "diamond",
      "milestone",
      1,
      150,
    ],
    ["night_owl", "Night Owl", "Solve at midnight", "moon", "special", 1, 50],
    [
      "early_bird",
      "Early Bird",
      "Solve before 7 AM",
      "sunrise",
      "special",
      1,
      50,
    ],
    [
      "marathon",
      "Marathon",
      "Solve 5 problems in one day",
      "flag",
      "daily",
      5,
      100,
    ],
    [
      "tag_master",
      "Tag Master",
      "Solve 10 different tag types",
      "tags",
      "special",
      10,
      150,
    ],
    [
      "daily_warrior",
      "Daily Warrior",
      "Complete 7 daily challenges",
      "calendar",
      "daily",
      7,
      200,
    ],
  ];
  await runMany(
    `INSERT OR IGNORE INTO achievements(id,title,description,icon,category,target,xp_reward) VALUES(?,?,?,?,?,?,?)`,
    achvs.map(([id, title, desc, icon, cat, target, xpReward]) => [
      id, title, desc, icon, cat, target, xpReward || 0,
    ]),
  );
  // Badges for linked judge accounts (Codeforces / AtCoder / LeetCode solves and ratings).
  await runMany(
    `INSERT OR IGNORE INTO achievements(id,title,description,icon,category,target,xp_reward) VALUES(?,?,?,?,?,?,?)`,
    require("./accounts").badgeDefs(),
  );

  // Problem statements table — own local database
  await run(`CREATE TABLE IF NOT EXISTS problem_statements (
    problem_rowid INTEGER PRIMARY KEY,
    statement TEXT DEFAULT '',
    input_spec TEXT DEFAULT '',
    output_spec TEXT DEFAULT '',
    note TEXT DEFAULT '',
    time_limit TEXT DEFAULT '',
    memory_limit TEXT DEFAULT '',
    samples TEXT DEFAULT '[]',
    scraped_at TEXT NOT NULL,
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  // Per-statement details beyond the HTML: starter code and examples
  // (LeetCode), interactive / file I/O flags, tags, points.
  await run("ALTER TABLE problem_statements ADD COLUMN extra TEXT DEFAULT '{}'").catch(() => {});

  // Problem statements are static, so translations of them never expire.
  // Caching keeps repeat requests off the (rate-limited) translation APIs.
  await run(`CREATE TABLE IF NOT EXISTS translation_cache (
    cache_key TEXT PRIMARY KEY,
    lang TEXT NOT NULL,
    translated TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  // AI Battle tracking
  await run(`CREATE TABLE IF NOT EXISTS ai_battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_rowid INTEGER NOT NULL,
    ai_time_ms INTEGER NOT NULL,
    player_time_ms INTEGER,
    player_won INTEGER DEFAULT 0,
    played_at TEXT NOT NULL,
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  // Multi-user isolated AI chat & kinetic animation history
  await run(`CREATE TABLE IF NOT EXISTS ai_user_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    visualization TEXT,
    created_at TEXT NOT NULL
  )`);
  await run(`CREATE INDEX IF NOT EXISTS idx_ai_user_chats_user ON ai_user_chats(username)`);
  // The AI agent groups turns into conversations (src/ai/agent.js).
  await run(`ALTER TABLE ai_user_chats ADD COLUMN conversation_id TEXT`).catch(() => {});
  await run(
    `CREATE INDEX IF NOT EXISTS idx_ai_user_chats_conv ON ai_user_chats(username, conversation_id)`,
  );
  // Per-user daily AI token budget (AI_DAILY_TOKENS).
  await run(`CREATE TABLE IF NOT EXISTS ai_usage (
    username TEXT NOT NULL,
    day TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (username, day)
  )`);

  // Decomposition / thinking notes
  await run(`CREATE TABLE IF NOT EXISTS decomposition_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_rowid INTEGER NOT NULL UNIQUE,
    approach TEXT DEFAULT '',
    brute_force TEXT DEFAULT '',
    optimization TEXT DEFAULT '',
    data_structures TEXT DEFAULT '',
    edge_cases TEXT DEFAULT '',
    updated_at TEXT,
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`);

  // Code replay events
  await run(`CREATE TABLE IF NOT EXISTS code_replays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    events TEXT NOT NULL DEFAULT '[]',
    duration_ms INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
  )`);

  // Custom user-created problems
  await run(`CREATE TABLE IF NOT EXISTS custom_problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator TEXT DEFAULT '',
    title TEXT NOT NULL,
    statement TEXT NOT NULL DEFAULT '',
    input_spec TEXT DEFAULT '',
    output_spec TEXT DEFAULT '',
    difficulty INTEGER DEFAULT 1000,
    tags TEXT DEFAULT '[]',
    samples TEXT DEFAULT '[]',
    testcases TEXT DEFAULT '[]',
    time_limit TEXT DEFAULT '2 seconds',
    memory_limit TEXT DEFAULT '256 MB',
    created_at TEXT NOT NULL,
    updated_at TEXT
  )`);
  // Migration: add creator column for existing databases
  try {
    await run("ALTER TABLE custom_problems ADD COLUMN creator TEXT DEFAULT ''");
  } catch (e) {}
  // Hosted contests (src/contests.js): an editorial, and problems written only for contests.
  try {
    await run("ALTER TABLE custom_problems ADD COLUMN editorial TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await run("ALTER TABLE custom_problems ADD COLUMN contest_only INTEGER DEFAULT 0");
  } catch (e) {}

  // Skill tree progress
  await run(`CREATE TABLE IF NOT EXISTS skill_progress (
    skill_id TEXT PRIMARY KEY,
    problems_solved INTEGER DEFAULT 0,
    unlocked INTEGER DEFAULT 0,
    unlocked_at TEXT
  )`);

  // ===== SOCIAL TABLES =====

  // User profiles
  await run(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    display_name TEXT DEFAULT '',
    avatar TEXT DEFAULT '🧑‍💻',
    bio TEXT DEFAULT '',
    status TEXT DEFAULT 'offline',
    role TEXT DEFAULT 'member',
    xp_override INTEGER DEFAULT 0,
    solved_override INTEGER DEFAULT 0,
    auth_provider TEXT DEFAULT 'manual',
    provider_id TEXT,
    email TEXT,
    avatar_url TEXT,
    last_seen TEXT,
    created_at TEXT NOT NULL
  )`);

  // Add role/override columns if they don't exist (migration for existing DBs)
  await run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member'`).catch(
    () => {},
  );
  await run(`ALTER TABLE users ADD COLUMN xp_override INTEGER DEFAULT 0`).catch(
    () => {},
  );
  await run(
    `ALTER TABLE users ADD COLUMN solved_override INTEGER DEFAULT 0`,
  ).catch(() => {});
  await run(
    `ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'manual'`,
  ).catch(() => {});
  await run(`ALTER TABLE users ADD COLUMN provider_id TEXT`).catch(() => {});
  await run(`ALTER TABLE users ADD COLUMN email TEXT`).catch(() => {});
  await run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`).catch(() => {});
  await run(`ALTER TABLE users ADD COLUMN password_hash TEXT`).catch(() => {});

  // Friendships
  await run(`CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    UNIQUE(from_user, to_user),
    FOREIGN KEY (from_user) REFERENCES users(username),
    FOREIGN KEY (to_user) REFERENCES users(username)
  )`);

  // Direct messages
  await run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (from_user) REFERENCES users(username),
    FOREIGN KEY (to_user) REFERENCES users(username)
  )`);

  // Solve-together rooms
  await run(`CREATE TABLE IF NOT EXISTS solve_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creator TEXT NOT NULL,
    problem_id INTEGER,
    max_members INTEGER DEFAULT 5,
    is_voice INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at TEXT NOT NULL,
    FOREIGN KEY (creator) REFERENCES users(username)
  )`);

  // Room chat messages
  await run(`CREATE TABLE IF NOT EXISTS room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES solve_rooms(id),
    FOREIGN KEY (username) REFERENCES users(username)
  )`);

  // Activity feed
  await run(`CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT DEFAULT '',
    problem_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username)
  )`);

  // Create indexes
  await run(
    "CREATE INDEX IF NOT EXISTS idx_problems_platform ON problems(platform)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_problems_rating ON problems(rating)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_rowid)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_stmts_problem ON problem_statements(problem_rowid)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(from_user, to_user)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(from_user, to_user)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_room_messages ON room_messages(room_id)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(username)",
  );

  // Performance indexes — high-frequency query paths
  await run(
    "CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_progress_status_solved ON progress(status, solved_at) WHERE status='solved'",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_submissions_verdict ON submissions(verdict)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(date DESC)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_submissions_language ON submissions(language)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_progress_problem_rowid ON progress(problem_rowid)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_problems_rating_platform ON problems(rating, platform)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_daily_activity_solved ON daily_activity(date DESC, problems_solved)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_submissions_problem_verdict ON submissions(problem_rowid, verdict)",
  );

  // ===== TUTORIAL SYSTEM TABLES =====
  await run(`CREATE TABLE IF NOT EXISTS tutorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    difficulty TEXT DEFAULT 'beginner',
    order_index INTEGER DEFAULT 0,
    estimated_time TEXT DEFAULT '15 min',
    prerequisites TEXT DEFAULT '[]',
    code_examples TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS tutorial_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tutorial_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (tutorial_id) REFERENCES tutorials(id)
  )`);

  await run(
    "CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category)",
  );

  // ===== FORGE (Dev Roadmap) TABLES =====
  await run(`CREATE TABLE IF NOT EXISTS forge_progress (
    topic_id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    status TEXT DEFAULT 'not-started',
    completed_at TEXT
  )`);
  await run(
    "CREATE INDEX IF NOT EXISTS idx_forge_path ON forge_progress(path_id)",
  );

  // ===== CONTESTS & QUIZZES =====
  await run(`CREATE TABLE IF NOT EXISTS custom_contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'speed',
    contest_code TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    org_tag TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    duration_mins INTEGER DEFAULT 60,
    problems TEXT DEFAULT '[]',
    max_participants INTEGER DEFAULT 50,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await run(
    "CREATE INDEX IF NOT EXISTS idx_contests_creator ON custom_contests(creator)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_contests_code ON custom_contests(contest_code)",
  );
  await run(`CREATE TABLE IF NOT EXISTS contest_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    score INTEGER DEFAULT 0,
    UNIQUE(contest_id, username)
  )`);
  await run(
    "CREATE INDEX IF NOT EXISTS idx_contest_parts ON contest_participants(contest_id)",
  );

  // System Design was removed from the site (2026-11): drop its tutorials and
  // their progress from databases seeded before that. Cheap and repeat-safe.
  await run(
    "DELETE FROM tutorial_progress WHERE tutorial_id IN (SELECT id FROM tutorials WHERE category='sysdesign')",
  );
  await run("DELETE FROM tutorials WHERE category='sysdesign'");
  await run("DELETE FROM forge_progress WHERE path_id='system-design'");

  // ===== SEED TUTORIALS =====
  // Seeding is helpful for local dev, but can make automated tests time out.
  if (!IS_TEST) {
    // Any row at all (COUNT(*) would read every tutorial on every boot).
    const anyTutorial = await get("SELECT 1 AS x FROM tutorials LIMIT 1");
    if (!anyTutorial) {
      await runMany(
        `INSERT INTO tutorials(category,topic,title,description,content,difficulty,order_index,estimated_time,code_examples) VALUES(?,?,?,?,?,?,?,?,?)`,
        tutorialData.map(([cat, topic, title, desc, diff, order, time, content, examples]) => [
          cat, topic, title, desc, content, diff, order, time, examples,
        ]),
        25,
      );
    }
  }

  console.log("Database initialized");

  // ===== CMS TABLES (Creator Studio) =====
  await run(`CREATE TABLE IF NOT EXISTS cms_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT '#6c63ff',
    section TEXT DEFAULT 'learn',
    order_idx INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cms_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES cms_courses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    order_idx INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0,
    UNIQUE(course_id, slug)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cms_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL REFERENCES cms_chapters(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    content_type TEXT DEFAULT 'html',
    duration_min INTEGER DEFAULT 10,
    order_idx INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, slug)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cms_lesson_problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES cms_lessons(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES problems(id),
    custom_problem_id INTEGER REFERENCES custom_problems(id),
    order_idx INTEGER DEFAULT 0
  )`);

  // ===== FORGE CONTENT OVERRIDES =====
  await run(`CREATE TABLE IF NOT EXISTS forge_content (
    topic_id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    content_html TEXT DEFAULT '',
    difficulty TEXT,
    time_estimate TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // ===== STUDIO NOTES (creator notes) =====
  await run(`CREATE TABLE IF NOT EXISTS studio_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    color TEXT DEFAULT '#8400ff',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // ===== STUDIO DOUBTS (student Q&A inbox for creators) =====
  await run(`CREATE TABLE IF NOT EXISTS studio_doubts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    student_name TEXT DEFAULT 'Student',
    source TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    answer TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    answered_at TEXT
  )`);

  await initGateTables();
  await initAdminTables();
  await initSocialTables();
  // Catalog version (triggers) + snapshot — src/problem-catalog.js.
  // eslint-disable-next-line global-require
  await require("./problem-catalog").initCatalogTables();
  // Topics of every problem (src/topics.js).
  await require("./topics").init();
}

/* ===== Per-user totals for the leaderboard =====
 * The XP / solved leaderboard used to aggregate ALL of `progress` and
 * `daily_activity` (tens of thousands of billed reads per refresh). These
 * triggers keep one row per user in step with every write, whoever makes it,
 * so the leaderboard reads ~2 rows per user instead. The first boot with the
 * triggers fills the table once from the existing rows. */
async function initUserStats() {
  const done = await get("SELECT v FROM catalog_meta WHERE k = 'user_stats'").catch(() => null);
  const bump = (user, xp, solved, days) => [
    // Not "INSERT OR IGNORE": inside a trigger the outer statement's
    // conflict policy (e.g. an upsert's ABORT) would override it.
    `INSERT INTO user_stats(username) SELECT ${user} WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE username = ${user});`,
    `UPDATE user_stats SET xp = xp + (${xp}), solved = solved + (${solved}), active_days = active_days + (${days}) WHERE username = ${user};`,
  ].join("\n      ");
  const prAdd = (r) => bump(`${r}.username`, `COALESCE(${r}.xp_earned, 0)`, `${r}.status = 'solved'`, "0");
  const prSub = (r) => bump(`${r}.username`, `-COALESCE(${r}.xp_earned, 0)`, `-(${r}.status = 'solved')`, "0");
  const daAdd = (r) => bump(`${r}.username`, "0", "0", `COALESCE(${r}.problems_solved, 0) > 0`);
  const daSub = (r) => bump(`${r}.username`, "0", "0", `-(COALESCE(${r}.problems_solved, 0) > 0)`);
  await runBatch([
    [`CREATE TABLE IF NOT EXISTS user_stats (
      username TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      solved INTEGER NOT NULL DEFAULT 0,
      active_days INTEGER NOT NULL DEFAULT 0
    )`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_pr_ins AFTER INSERT ON progress BEGIN
      ${prAdd("NEW")}
    END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_pr_del AFTER DELETE ON progress BEGIN
      ${prSub("OLD")}
    END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_pr_upd AFTER UPDATE OF username, status, xp_earned ON progress BEGIN
      ${prSub("OLD")}
      ${prAdd("NEW")}
    END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_da_ins AFTER INSERT ON daily_activity BEGIN
      ${daAdd("NEW")}
    END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_da_del AFTER DELETE ON daily_activity BEGIN
      ${daSub("OLD")}
    END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_user_stats_da_upd AFTER UPDATE OF username, problems_solved ON daily_activity BEGIN
      ${daSub("OLD")}
      ${daAdd("NEW")}
    END`],
    // One-time fill (same batch as the triggers, before any request).
    ...(done
      ? []
      : [
          ["DELETE FROM user_stats"],
          [`INSERT INTO user_stats(username, xp, solved, active_days)
            SELECT username, SUM(xp), SUM(solved), SUM(days) FROM (
              SELECT username, COALESCE(SUM(xp_earned), 0) AS xp, SUM(status = 'solved') AS solved, 0 AS days FROM progress GROUP BY username
              UNION ALL
              SELECT username, 0, 0, COUNT(*) FROM daily_activity WHERE problems_solved > 0 GROUP BY username
            ) GROUP BY username`],
          ["INSERT OR REPLACE INTO catalog_meta(k, v) VALUES('user_stats', 1)"],
        ]),
  ]);
}

/* ===== Indexes for the hot read paths (Turso bills every scanned row) =====
 * Each one turns a per-request SCAN into a SEARCH; verified with EXPLAIN
 * QUERY PLAN in tests/db-usage.test.js. One batch on Turso. */
async function initUsageIndexes() {
  await runBatch([
    // Recent submissions of one user (stats, performance, AI tutor).
    ["CREATE INDEX IF NOT EXISTS idx_submissions_user_time ON submissions(username, submitted_at)"],
    // Staff/verified badge directory, owner fix-up at boot.
    ["CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)"],
    ["CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified) WHERE verified = 1"],
    // Case-insensitive username checks (sign-up, availability, owner).
    ["CREATE INDEX IF NOT EXISTS idx_users_nocase ON users(username COLLATE NOCASE)"],
  ]);
}

/* ===== Social network + profiles (src/routes/social.js) =====
 * Posts, comments, likes, follows, blocks/mutes, notifications and the
 * profile extras (cover, links, privacy, pins). Timestamps are epoch ms.
 * Counters on posts/comments are kept in step by the routes so a feed page
 * never has to COUNT(*) per row. One batch on Turso. */
async function initSocialTables() {
  await runBatch([
    [`CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'post',
      body TEXT NOT NULL DEFAULT '',
      code TEXT,
      code_lang TEXT,
      images TEXT,
      poll TEXT,
      share TEXT,
      quote_of INTEGER,
      repost_of INTEGER,
      like_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      repost_count INTEGER NOT NULL DEFAULT 0,
      featured_at INTEGER,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(username, created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_social_posts_time ON social_posts(created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_social_posts_featured ON social_posts(featured_at) WHERE featured_at IS NOT NULL"],
    ["CREATE UNIQUE INDEX IF NOT EXISTS idx_social_reposts ON social_posts(username, repost_of) WHERE kind = 'repost' AND deleted = 0"],
    [`CREATE TABLE IF NOT EXISTS social_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      parent_id INTEGER,
      username TEXT NOT NULL,
      body TEXT NOT NULL,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id, created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_social_comments_user ON social_comments(username, created_at)"],
    [`CREATE TABLE IF NOT EXISTS social_likes (
      post_id INTEGER NOT NULL, username TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (post_id, username)
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_likes_user ON social_likes(username, created_at)"],
    [`CREATE TABLE IF NOT EXISTS social_comment_likes (
      comment_id INTEGER NOT NULL, username TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (comment_id, username)
    )`],
    [`CREATE TABLE IF NOT EXISTS social_bookmarks (
      username TEXT NOT NULL, post_id INTEGER NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (username, post_id)
    )`],
    [`CREATE TABLE IF NOT EXISTS social_poll_votes (
      post_id INTEGER NOT NULL, username TEXT NOT NULL, option INTEGER NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (post_id, username)
    )`],
    [`CREATE TABLE IF NOT EXISTS social_hashtags (
      tag TEXT NOT NULL, post_id INTEGER NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (tag, post_id)
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_hashtags_time ON social_hashtags(created_at)"],
    [`CREATE TABLE IF NOT EXISTS social_follows (
      follower TEXT NOT NULL, followee TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'accepted', created_at INTEGER NOT NULL,
      PRIMARY KEY (follower, followee)
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_follows_followee ON social_follows(followee, created_at)"],
    [`CREATE TABLE IF NOT EXISTS social_blocks (
      blocker TEXT NOT NULL, blocked TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (blocker, blocked)
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_blocks_blocked ON social_blocks(blocked)"],
    [`CREATE TABLE IF NOT EXISTS social_mutes (
      muter TEXT NOT NULL, muted TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (muter, muted)
    )`],
    [`CREATE TABLE IF NOT EXISTS social_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      actor TEXT NOT NULL,
      type TEXT NOT NULL,
      post_id INTEGER,
      comment_id INTEGER,
      created_at INTEGER NOT NULL,
      read_at INTEGER
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_social_notifications_user ON social_notifications(username, created_at)"],
    [`CREATE TABLE IF NOT EXISTS social_profiles (
      username TEXT PRIMARY KEY,
      cover TEXT,
      accent TEXT,
      location TEXT,
      pronouns TEXT,
      website TEXT,
      links TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      pinned TEXT,
      updated_at INTEGER
    )`],
  ]);
}

/* ===== Owner / admin system (src/authz/*, src/routes/admin.js) =====
 * Roles live on users.role; everything else an admin can change lives here.
 * Idempotent: CREATE … IF NOT EXISTS + guarded ALTERs, one batch on Turso. */
async function initAdminTables() {
  await run("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0").catch(() => {});
  // A team member's job title ("Head of GATE content"), set in Admin → Staff access.
  await run("ALTER TABLE users ADD COLUMN team_title TEXT").catch(() => {});
  await runBatch([
    // Staff access per Admin section (src/authz/sections.js): level is
    // 'none' | 'view' | 'edit'; no row = follow role and permissions.
    [`CREATE TABLE IF NOT EXISTS staff_section_access (
      username TEXT NOT NULL,
      section TEXT NOT NULL,
      level TEXT NOT NULL,
      updated_by TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (username, section)
    )`],
    // Per-user permission overrides: granted=1 adds a permission on top of
    // the role's defaults, granted=0 takes one away.
    [`CREATE TABLE IF NOT EXISTS user_permissions (
      username TEXT NOT NULL,
      perm TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 1,
      granted_by TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (username, perm)
    )`],
    // Bans (no expiry) and suspensions (expires_at, ms). Lifted rows are kept
    // as history.
    [`CREATE TABLE IF NOT EXISTS user_bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'ban',
      reason TEXT NOT NULL DEFAULT '',
      expires_at INTEGER,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      lifted_at INTEGER,
      lifted_by TEXT
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(username, lifted_at)"],
    [`CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at INTEGER NOT NULL
    )`],
    // kind 'banner' = the global announcement bar; 'broadcast' = an in-app
    // notification sent to everyone.
    [`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'banner',
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      color TEXT NOT NULL DEFAULT 'brand',
      pinned INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active, kind, created_at)"],
    [`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      actor_role TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target TEXT,
      before TEXT,
      after TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_audit_log_time ON audit_log(created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor, created_at)"],
    // Generic reports: any content type (post, comment, message, profile, …).
    [`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      target_user TEXT,
      reason TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      snapshot TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      resolved_by TEXT,
      resolved_at INTEGER,
      created_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at)"],
    ["CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_once ON reports(reporter, content_type, content_id)"],
    // Removed content (and the original text, so it can be restored).
    [`CREATE TABLE IF NOT EXISTS moderated_content (
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      original TEXT,
      reason TEXT NOT NULL DEFAULT '',
      removed_by TEXT,
      removed_at INTEGER NOT NULL,
      PRIMARY KEY (content_type, content_id)
    )`],
    [`CREATE TABLE IF NOT EXISTS user_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      acknowledged_at INTEGER
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(username, acknowledged_at)"],
    // Invites that let someone register (and enter) while the site is private.
    [`CREATE TABLE IF NOT EXISTS access_allowlist (
      entry TEXT PRIMARY KEY COLLATE NOCASE,
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`],
    // One row per user per active day (DAU / WAU in the admin overview).
    [`CREATE TABLE IF NOT EXISTS user_daily_active (
      username TEXT NOT NULL,
      day TEXT NOT NULL,
      PRIMARY KEY (day, username)
    )`],
  ]);
  // Finer permissions (2026-11): AI models and Code runners were part of
  // "site.settings", writing problems part of "problems.manage", verifying
  // part of "users.manage". Anyone given (or denied) the broad one keeps the
  // same access through the new one. Runs once (marker in site_settings), so
  // a later "reset to role default" is never undone at the next boot.
  const done = await get("SELECT 1 AS d FROM site_settings WHERE key = 'perm_split_2026_11'").catch(() => null);
  if (!done) {
    for (const [from, to] of [["site.settings", "ai.manage"], ["site.settings", "runners.manage"], ["problems.manage", "problems.author"], ["users.manage", "users.verify"]]) {
      await run(
        `INSERT OR IGNORE INTO user_permissions(username, perm, granted, granted_by, created_at)
         SELECT username, ?, granted, 'system:split', created_at FROM user_permissions WHERE perm = ?`,
        [to, from],
      );
    }
    await run("INSERT OR IGNORE INTO site_settings(key, value, updated_by, updated_at) VALUES('perm_split_2026_11', 'true', 'system', ?)", [Date.now()]);
  }
}

/* ===== GATE learning platform (src/routes/gate-me.js) =====
 * All per-user rows are keyed by the session username. One batched round
 * trip on Turso. */
async function initGateTables() {
  await runBatch([
    [`CREATE TABLE IF NOT EXISTS gate_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      question_id TEXT NOT NULL,
      paper TEXT,
      exam TEXT,
      year INTEGER,
      subject TEXT,
      topic TEXT,
      type TEXT,
      response TEXT,
      outcome TEXT NOT NULL,
      marks REAL DEFAULT 0,
      time_ms INTEGER DEFAULT 0,
      mode TEXT NOT NULL,
      test_id TEXT,
      created_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_gate_attempts_user ON gate_attempts(username, created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_gate_attempts_q ON gate_attempts(question_id)"],
    ["CREATE INDEX IF NOT EXISTS idx_gate_attempts_time ON gate_attempts(created_at)"],
    [`CREATE TABLE IF NOT EXISTS gate_qstate (
      username TEXT NOT NULL,
      question_id TEXT NOT NULL,
      outcome TEXT,
      attempts INTEGER DEFAULT 0,
      correct INTEGER DEFAULT 0,
      last_at INTEGER,
      bookmarked INTEGER DEFAULT 0,
      collections TEXT DEFAULT '[]',
      ease REAL DEFAULT 2.5,
      interval_days REAL DEFAULT 0,
      due TEXT,
      srs_streak INTEGER DEFAULT 0,
      PRIMARY KEY (username, question_id)
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_gate_qstate_due ON gate_qstate(username, due)"],
    [`CREATE TABLE IF NOT EXISTS gate_notes (
      username TEXT NOT NULL,
      question_id TEXT NOT NULL,
      text TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (username, question_id)
    )`],
    [`CREATE TABLE IF NOT EXISTS gate_collections (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      created_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_gate_collections_user ON gate_collections(username)"],
    [`CREATE TABLE IF NOT EXISTS gate_tests (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      title TEXT NOT NULL,
      config TEXT NOT NULL,
      question_ids TEXT NOT NULL,
      qset TEXT NOT NULL,
      score REAL,
      created_at INTEGER NOT NULL,
      submitted_at INTEGER,
      result TEXT
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_gate_tests_user ON gate_tests(username, created_at)"],
    ["CREATE INDEX IF NOT EXISTS idx_gate_tests_qset ON gate_tests(qset, submitted_at)"],
    [`CREATE TABLE IF NOT EXISTS gate_plans (
      username TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`],
    // The Nexus web rank (src/nexus/ranks.js): one row per user, written only
    // when their score changes, so the leaderboards read one small table.
    [`CREATE TABLE IF NOT EXISTS nexus_scores (
      username TEXT PRIMARY KEY,
      web_xp INTEGER NOT NULL DEFAULT 0,
      web_solved INTEGER NOT NULL DEFAULT 0,
      web_level INTEGER NOT NULL DEFAULT 1,
      subjects TEXT NOT NULL DEFAULT '{}',
      week TEXT,
      week_base_xp INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`],
    ["CREATE INDEX IF NOT EXISTS idx_nexus_scores_xp ON nexus_scores(web_xp)"],
    // Nexus: a node passed by a quick check ("Test out"), the reader's own
    // notes and bookmarks per node, and one progress snapshot per day.
    // All written only on an action (a save, a pass) or when numbers change.
    [`CREATE TABLE IF NOT EXISTS nexus_testouts (
      username TEXT NOT NULL,
      subject TEXT NOT NULL,
      node TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (username, subject, node)
    )`],
    [`CREATE TABLE IF NOT EXISTS nexus_node_notes (
      username TEXT NOT NULL,
      subject TEXT NOT NULL,
      node TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      bookmarked INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (username, subject, node)
    )`],
    [`CREATE TABLE IF NOT EXISTS nexus_history (
      username TEXT NOT NULL,
      day TEXT NOT NULL,
      web_xp INTEGER NOT NULL DEFAULT 0,
      subjects TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (username, day)
    )`],
    // GATE Notes reader: per-lesson study state (src/routes/gate-notes.js).
    [`CREATE TABLE IF NOT EXISTS gate_notes_progress (
      username TEXT NOT NULL,
      subject TEXT NOT NULL,
      lesson TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      scroll_pct INTEGER NOT NULL DEFAULT 0,
      bookmarked INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (username, subject, lesson)
    )`],
  ]);
}


// ─────────────────────────────────────────────────────────────────────────────
// Per-user data migration (idempotent).
//
// NexoraGuru started as a single-user app, so progress, submissions, XP, streaks,
// notes and settings had no owner column — every account saw the same data.
// This adds a `username` to each of those tables (rebuilding tables whose
// UNIQUE keys must now include the user) and assigns all existing rows to
// LEGACY_OWNER (default "gurudeep"). Runs once; later boots detect the column.
// ─────────────────────────────────────────────────────────────────────────────
const LEGACY_OWNER = process.env.LEGACY_OWNER || "gurudeep";

async function columnsOf(table) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

/** Rebuild `table` using `ddl` (which must include a username column),
 *  copying every old column and stamping rows with `ownerExpr`. */
async function rebuildWithUsername(table, ddl, ownerExpr = "?") {
  const cols = await columnsOf(table);
  if (!cols.length || cols.includes("username")) return false;
  const tmp = `${table}__peruser`;
  await run(`DROP TABLE IF EXISTS ${tmp}`);
  await run(ddl.replace(`CREATE TABLE ${table}`, `CREATE TABLE ${tmp}`));
  const list = cols.join(", ");
  await run(
    `INSERT INTO ${tmp} (${list}, username) SELECT ${list}, ${ownerExpr} FROM ${table}`,
    ownerExpr === "?" ? [LEGACY_OWNER] : [],
  );
  await run(`DROP TABLE ${table}`);
  await run(`ALTER TABLE ${tmp} RENAME TO ${table}`);
  return true;
}

/** Add a username column to tables whose keys don't change. */
async function addUsernameColumn(table) {
  const cols = await columnsOf(table);
  if (!cols.length || cols.includes("username")) return false;
  await run(`ALTER TABLE ${table} ADD COLUMN username TEXT NOT NULL DEFAULT ''`);
  await run(`UPDATE ${table} SET username=?`, [LEGACY_OWNER]);
  return true;
}

async function migratePerUser() {
  const changed = [];
  const note = (ok, t) => ok && changed.push(t);

  note(await rebuildWithUsername("progress", `CREATE TABLE progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL DEFAULT '',
    problem_rowid INTEGER NOT NULL,
    status TEXT DEFAULT 'unsolved',
    attempts INTEGER DEFAULT 0,
    solved_at TEXT,
    time_spent INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    xp_earned INTEGER DEFAULT 0,
    UNIQUE(username, problem_rowid),
    FOREIGN KEY (problem_rowid) REFERENCES problems(id)
  )`), "progress");

  note(await rebuildWithUsername("daily_activity", `CREATE TABLE daily_activity (
    username TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    problems_solved INTEGER DEFAULT 0,
    problems_attempted INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    PRIMARY KEY (username, date)
  )`), "daily_activity");

  note(await rebuildWithUsername("decomposition_notes", `CREATE TABLE decomposition_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL DEFAULT '',
    problem_rowid INTEGER NOT NULL,
    approach TEXT DEFAULT '',
    brute_force TEXT DEFAULT '',
    optimization TEXT DEFAULT '',
    data_structures TEXT DEFAULT '',
    edge_cases TEXT DEFAULT '',
    updated_at TEXT,
    UNIQUE(username, problem_rowid)
  )`), "decomposition_notes");

  note(await rebuildWithUsername("skill_progress", `CREATE TABLE skill_progress (
    username TEXT NOT NULL DEFAULT '',
    skill_id TEXT NOT NULL,
    problems_solved INTEGER DEFAULT 0,
    unlocked INTEGER DEFAULT 0,
    unlocked_at TEXT,
    PRIMARY KEY (username, skill_id)
  )`), "skill_progress");

  note(await rebuildWithUsername("forge_progress", `CREATE TABLE forge_progress (
    username TEXT NOT NULL DEFAULT '',
    topic_id TEXT NOT NULL,
    path_id TEXT NOT NULL,
    status TEXT DEFAULT 'not-started',
    completed_at TEXT,
    PRIMARY KEY (username, topic_id)
  )`), "forge_progress");

  // Settings: `last_sync` and cached problem statements (`stmt_*`) stay
  // site-wide (username ''); the rest (handles, dashboard layout) are personal.
  note(await rebuildWithUsername("settings", `CREATE TABLE settings (
    username TEXT NOT NULL DEFAULT '',
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (username, key)
  )`, `CASE WHEN key = 'last_sync' OR key LIKE 'stmt\\_%' ESCAPE '\\' THEN '' ELSE '${LEGACY_OWNER.replace(/'/g, "''")}' END`), "settings");

  // `testcases` was shared by everyone: one user's custom case showed up in
  // every other user's deck, and PUT/DELETE by id let anyone edit or delete
  // someone else's. Each row now belongs to the account that created it.
  for (const t of ["submissions", "tutorial_progress", "ai_battles", "code_replays", "testcases"]) {
    note(await addUsernameColumn(t), t);
  }

  // Achievements: the table holds definitions; per-user progress lives here.
  await run(`CREATE TABLE IF NOT EXISTS user_achievements (
    username TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    unlocked_at TEXT,
    PRIMARY KEY (username, achievement_id)
  )`);
  // Daily challenges: the pick is shared, completion is per user.
  await run(`CREATE TABLE IF NOT EXISTS user_daily_challenges (
    username TEXT NOT NULL,
    challenge_id INTEGER NOT NULL,
    completed_at TEXT,
    PRIMARY KEY (username, challenge_id)
  )`);
  const migrated = await get("SELECT value FROM settings WHERE username='' AND key='peruser_migrated'");
  if (!migrated) {
    await run(
      `INSERT OR IGNORE INTO user_achievements(username, achievement_id, progress, unlocked_at)
       SELECT ?, id, progress, unlocked_at FROM achievements WHERE progress > 0 OR unlocked_at IS NOT NULL`,
      [LEGACY_OWNER],
    );
    await run(
      `INSERT OR IGNORE INTO user_daily_challenges(username, challenge_id, completed_at)
       SELECT ?, id, completed_at FROM daily_challenges WHERE completed = 1`,
      [LEGACY_OWNER],
    );
    await run("INSERT OR REPLACE INTO settings(username, key, value) VALUES('', 'peruser_migrated', ?)", [new Date().toISOString()]);
  }

  for (const [t, c] of [
    ["progress", "username, status"], ["submissions", "username, problem_rowid"],
    ["daily_activity", "username, date"], ["tutorial_progress", "username, tutorial_id"],
    ["ai_battles", "username"],
    ["testcases", "username, problem_rowid"],
  ]) {
    await run(`CREATE INDEX IF NOT EXISTS idx_${t}_user ON ${t}(${c})`).catch(() => {});
  }
  // GATE practice counts toward the daily streak without touching
  // problems_solved / XP (see src/gate/attempts.js and calcStreak).
  if (!(await columnsOf("daily_activity")).includes("gate_attempts")) {
    await run("ALTER TABLE daily_activity ADD COLUMN gate_attempts INTEGER DEFAULT 0").catch(() => {});
  }
  // After the per-user columns exist.
  await initUsageIndexes();
  await initUserStats();
  if (changed.length) {
    console.log(`✓ Per-user data: added owners to ${changed.join(", ")} (existing rows → ${LEGACY_OWNER})`);
  }
}

module.exports = { run, get, all, runMany, runBatch, initDb, initAdminTables, initSocialTables, dbInfo, migratePerUser, LEGACY_OWNER, onWrite };
