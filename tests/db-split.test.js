// The data split (src/db-stores.js): the live server running on several
// databases at once, and the move of a store out of the main database
// (scripts/ops/split-db.cjs) with nothing lost on the way.
//
// 1. The server starts on one database (as production does today); a user
//    signs up and uploads an avatar.
// 2. The server stops; the files and logs stores are moved to databases of
//    their own with the split script.
// 3. The server starts on three databases: the login still works, the avatar
//    is served from the files database, new uploads land there, and the main
//    database no longer holds those tables.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn, execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ROOT = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-split-"));
const PORTS = { core: 18101, files: 18102, logs: 18103 };
const APP_PORT = 14120;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const file = (st) => path.join(tmp, `${st}.db`);
const H = { "Content-Type": "application/json", "X-Forwarded-Proto": "https" };
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const baseEnv = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(APP_PORT),
  APP_URL: BASE,
  SESSION_SECRET: "ci-secret-ci-secret-ci-secret-ci-secret-1234",
  STUDIO_PASSWORD: "ci-studio-password",
  TURSO_DATABASE_URL: `http://127.0.0.1:${PORTS.core}`,
  TURSO_AUTH_TOKEN: "",
  TURSO_HIVE_URL: "",
  TURSO_FILES_URL: "",
  TURSO_CACHE_URL: "",
  TURSO_LOGS_URL: "",
  TURSO_REPLICA_DIR: "",
  JUDGE_MODE: "remote",
  DISABLE_PUPPETEER: "1",
  DISABLE_SCRAPER: "1",
  DB_PATH: path.join(tmp, "unused.db"),
};

const mocks = {};
let app;
let appLog = "";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(url, tries = 160) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (app && app.exitCode !== null) throw new Error(`app exited early (${app.exitCode}): ${appLog}`);
    await wait(250);
  }
  throw new Error(`timeout waiting for ${url}: ${appLog}`);
}
async function startMock(st) {
  mocks[st] = spawn(process.execPath, [path.join(__dirname, "helpers", "hrana-mock.js"), file(st), String(PORTS[st])], { stdio: "ignore" });
  await waitFor(`http://127.0.0.1:${PORTS[st]}/health`);
}
async function stopMock(st) {
  const m = mocks[st];
  if (!m) return;
  if (m.exitCode !== null || m.signalCode !== null) return void delete mocks[st];
  const done = new Promise((r) => m.once("exit", r));
  m.kill("SIGKILL");
  await done;
  delete mocks[st];
}
function startApp(extra = {}) {
  appLog = "";
  app = spawn(process.execPath, ["src/server.js"], { cwd: ROOT, env: { ...baseEnv, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
  app.stdout.on("data", (d) => (appLog += d));
  app.stderr.on("data", (d) => (appLog += d));
  return waitFor(`${BASE}/api/health`);
}
async function stopApp() {
  if (!app) return;
  if (app.exitCode !== null || app.signalCode !== null) return void (app = null);
  const done = new Promise((r) => app.once("exit", r));
  app.kill("SIGKILL");
  await done;
  app = null;
}
function tablesIn(st) {
  const { DatabaseSync } = require("node:sqlite");
  const d = new DatabaseSync(file(st), { readOnly: true });
  try {
    return d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  } finally {
    d.close();
  }
}
async function avatar(cookie, username) {
  const r = await (
    await fetch(`${BASE}/api/user/avatar`, {
      method: "POST",
      headers: { ...H, Cookie: cookie },
      body: JSON.stringify({ username, image: `data:image/png;base64,${PNG.toString("base64")}` }),
    })
  ).json();
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.avatar_url;
}

before(async () => {
  await startMock("core");
  await startApp();
});
after(async () => {
  await stopApp();
  for (const st of Object.keys(mocks)) await stopMock(st);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("moving the files and logs stores keeps every login and file", async () => {
  // 1. One database.
  const user = `sp${Date.now().toString(36)}`;
  const reg = await fetch(`${BASE}/api/user/register`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ username: user, email: `${user}@ci.test`, password: "secret123" }),
  });
  assert.equal(reg.status, 200);
  const cookie = reg.headers.get("set-cookie").split(";")[0];
  const first = await avatar(cookie, user);
  assert.ok(tablesIn("core").includes("upload_chunks"));

  // 2. Stop everything and move two stores out with the split script.
  await stopApp();
  await stopMock("core");
  for (const st of ["files", "logs"]) {
    const env = { ...baseEnv, TURSO_DATABASE_URL: `file:${file("core")}`, [`TURSO_${st.toUpperCase()}_URL`]: `file:${file(st)}` };
    const out = execFileSync(process.execPath, ["scripts/ops/split-db.cjs", "--store", st, "--apply"], { cwd: ROOT, env }).toString();
    assert.match(out, /every count matches/);
    execFileSync(process.execPath, ["scripts/ops/split-db.cjs", "--store", st, "--drop-old"], { cwd: ROOT, env });
  }
  const core = tablesIn("core");
  for (const t of ["uploads", "upload_chunks", "audit_log", "code_replays"]) assert.ok(!core.includes(t), `${t} still in core`);
  assert.ok(tablesIn("files").includes("upload_chunks"));
  assert.ok(tablesIn("logs").includes("audit_log"));

  // 3. Three databases, as the server is configured after the move.
  for (const st of Object.keys(PORTS)) await startMock(st);
  fs.rmSync(path.join(ROOT, "public", first), { force: true }); // the disk is wiped too
  await startApp({ TURSO_FILES_URL: `http://127.0.0.1:${PORTS.files}`, TURSO_LOGS_URL: `http://127.0.0.1:${PORTS.logs}` });

  const health = await (await fetch(`${BASE}/api/health`)).json();
  assert.equal(health.ok, true);

  const status = await (await fetch(`${BASE}/api/auth/status`, { headers: { ...H, Cookie: cookie } })).json();
  assert.equal(status.authenticated, true, "the login was lost in the move");
  assert.equal(status.user.username, user);

  const img = await fetch(`${BASE}${first}`);
  assert.equal(img.status, 200, "the avatar uploaded before the move is gone");
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);

  // A new upload goes to the files database, and the server did not recreate
  // the moved tables in core.
  const second = await avatar(cookie, user);
  await stopApp();
  for (const p of [first, second]) fs.rmSync(path.join(ROOT, "public", p), { force: true });
  for (const st of Object.keys(PORTS)) await stopMock(st);
  const coreAfter = tablesIn("core");
  for (const t of ["uploads", "upload_chunks", "audit_log", "code_replays"]) assert.ok(!coreAfter.includes(t), `the server recreated ${t} in core`);
  const { DatabaseSync } = require("node:sqlite");
  const fdb = new DatabaseSync(file("files"), { readOnly: true });
  const n = fdb.prepare("SELECT COUNT(DISTINCT path) AS n FROM upload_chunks").get().n;
  fdb.close();
  assert.ok(n >= 2, `expected both uploads in the files database, found ${n}`);
});

test("foreign keys to tables left behind are dropped when a table moves", () => {
  const { stripForeignKeys } = require("../scripts/ops/split-db.cjs");
  const ddl = `CREATE TABLE code_replays (
    id INTEGER PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
  )`;
  const out = stripForeignKeys(ddl, "logs");
  assert.ok(!/REFERENCES/i.test(out), out);
  assert.match(out, /created_at TEXT NOT NULL\s*\)$/);
  // A key between two tables of the same store stays.
  const keep = "CREATE TABLE upload_chunks (id INTEGER, upload_id INTEGER REFERENCES uploads(id))";
  assert.equal(stripForeignKeys(keep, "files"), keep);
});

test("a batch that changes data never spans two stores", () => {
  // runBatch is one transaction per database. A batch whose statements belong
  // to different stores is split per database, which is fine for creating
  // tables at boot, but would break all-or-nothing writes.
  const { storeOfSql } = require("../src/db-stores");
  const src = path.join(ROOT, "src");
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.c?js$/.test(e.name)) files.push(p);
    }
  };
  walk(src);
  const bad = [];
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    for (let i = t.indexOf("runBatch("); i >= 0; i = t.indexOf("runBatch(", i + 1)) {
      let depth = 0;
      let j = i + 8;
      for (; j < t.length; j++) {
        if (t[j] === "(") depth++;
        else if (t[j] === ")" && --depth === 0) break;
      }
      const sqls = [...t.slice(i, j).matchAll(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g)]
        .map((m) => m[0].slice(1, -1))
        .filter((s) => /\b(INSERT|UPDATE|DELETE|CREATE|REPLACE)\b/i.test(s));
      const stores = new Set(sqls.map(storeOfSql));
      if (stores.size < 2) continue;
      // Mixed: every statement outside the main store must only create schema.
      const writes = sqls.filter((s) => storeOfSql(s) !== "core" && !/^\s*CREATE\b/i.test(s));
      if (writes.length) bad.push(`${path.relative(ROOT, f)}:${t.slice(0, i).split("\n").length}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("no SQL statement in src/ touches two stores", () => {
  const out = execFileSync(process.execPath, ["scripts/ops/sql-table-groups.cjs"], { cwd: ROOT }).toString();
  assert.match(out, /^0 statement\(s\) cross stores/m, out);
});

test("each statement is sent to the store of the tables it names", () => {
  const { storeOfSql } = require("../src/db-stores");
  const cases = [
    ["SELECT * FROM users WHERE username=?", "core"],
    ["INSERT INTO hive_jobs(id) VALUES(?)", "hive"],
    ["PRAGMA table_info(upload_chunks)", "files"],
    ["CREATE INDEX IF NOT EXISTS i ON audit_log(created_at)", "logs"],
    ["DELETE FROM translation_cache", "cache"],
    ["UPDATE catalog_meta SET v = v + 1 WHERE k = 'problems'", "core"],
    ["CREATE TRIGGER IF NOT EXISTS t AFTER INSERT ON problems BEGIN UPDATE catalog_meta SET v = v + 1; END", "core"],
    ["ALTER TABLE hive_runs__peruser RENAME TO hive_runs", "hive"],
    ["PRAGMA foreign_keys=ON", "core"],
  ];
  for (const [sql, want] of cases) assert.equal(storeOfSql(sql), want, sql);
});
