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
const aiProblemsData = require("./ai-problems-data");
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

const run = async (sql, params = []) => {
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

const get = async (sql, params = []) => {
  if (libsql) {
    const rs = await libsqlExec(sql, params);
    return plainRow(rs.rows[0], rs.columns);
  }
  return new Promise((resolve, reject) => {
    if (_usingBuiltinSqlite) {
      try {
        const stmt = db.prepare(sql);
        const row = Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
        resolve(row);
      } catch (err) {
        reject(err);
      }
      return;
    }
    db.get(sql, params, (err, row) => {
      err ? reject(err) : resolve(row);
    });
  });
};

const all = async (sql, params = []) => {
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

/**
 * Run the same statement for many parameter rows. In cloud mode this is sent
 * as one batched round-trip (in chunks) instead of one HTTP request per row,
 * which keeps startup seeding fast.
 */
async function runMany(sql, rows, chunkSize = 200) {
  if (!rows.length) return;
  if (libsql) {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const slice = rows.slice(i, i + chunkSize);
      await libsql.batch(
        slice.map((p) => ({ sql, args: toLibsqlArgs(p) })),
        "write",
      );
    }
    return;
  }
  for (const p of rows) await run(sql, p);
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

  // ===== AI LAB TABLES =====
  await run(`CREATE TABLE IF NOT EXISTS ai_problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    difficulty TEXT DEFAULT 'beginner',
    tags TEXT DEFAULT '[]',
    starter_code TEXT DEFAULT '',
    solution_approach TEXT DEFAULT '',
    hints TEXT DEFAULT '[]',
    resources TEXT DEFAULT '[]',
    input_format TEXT DEFAULT '',
    output_format TEXT DEFAULT '',
    constraints TEXT DEFAULT '',
    samples TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Migration: add new columns if table exists but lacks them
  try {
    await run(
      'ALTER TABLE ai_problems ADD COLUMN input_format TEXT DEFAULT ""',
    );
  } catch (e) {}
  try {
    await run(
      'ALTER TABLE ai_problems ADD COLUMN output_format TEXT DEFAULT ""',
    );
  } catch (e) {}
  try {
    await run('ALTER TABLE ai_problems ADD COLUMN constraints TEXT DEFAULT ""');
  } catch (e) {}
  try {
    await run('ALTER TABLE ai_problems ADD COLUMN samples TEXT DEFAULT "[]"');
  } catch (e) {}

  await run(`CREATE TABLE IF NOT EXISTS ai_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER NOT NULL,
    status TEXT DEFAULT 'unsolved',
    notes TEXT DEFAULT '',
    completed_at TEXT,
    FOREIGN KEY (problem_id) REFERENCES ai_problems(id)
  )`);

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
    "CREATE INDEX IF NOT EXISTS idx_ai_problems_category ON ai_problems(category)",
  );
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

  // ===== SEED AI PROBLEMS / TUTORIALS =====
  // Seeding is helpful for local dev, but can make automated tests time out.
  if (!IS_TEST) {
    const aiCount = await get("SELECT COUNT(*) as c FROM ai_problems");
    if (!aiCount || aiCount.c === 0) {
      await runMany(
        `INSERT INTO ai_problems(category,title,description,difficulty,tags,starter_code,solution_approach,hints,resources,input_format,output_format,constraints,samples) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        aiProblemsData.map(
          ([cat, title, desc, diff, tags, code, approach, hints, resources, inputFmt, outputFmt, constraints, samples]) => [
            cat, title, desc, diff, tags, code, approach, hints, resources,
            inputFmt || "", outputFmt || "", constraints || "", samples || "[]",
          ],
        ),
        50,
      );
    }

    const tutCount = await get("SELECT COUNT(*) as c FROM tutorials");
    if (!tutCount || tutCount.c === 0) {
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
}


// ─────────────────────────────────────────────────────────────────────────────
// Per-user data migration (idempotent).
//
// Nexora started as a single-user app, so progress, submissions, XP, streaks,
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

  for (const t of ["submissions", "tutorial_progress", "ai_progress", "ai_battles", "code_replays"]) {
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
    ["ai_progress", "username, problem_id"], ["ai_battles", "username"],
  ]) {
    await run(`CREATE INDEX IF NOT EXISTS idx_${t}_user ON ${t}(${c})`).catch(() => {});
  }
  if (changed.length) {
    console.log(`✓ Per-user data: added owners to ${changed.join(", ")} (existing rows → ${LEGACY_OWNER})`);
  }
}

module.exports = { run, get, all, runMany, initDb, dbInfo, migratePerUser, LEGACY_OWNER };
