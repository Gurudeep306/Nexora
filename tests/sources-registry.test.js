// The source registry: syncs write only new or changed rows, a first
// successful sync switches a new source on, switched-off sources disappear
// from the problem list, and a failing sync is recorded for the admin.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const { run, all, get } = require("../src/db");
const sources = require("../src/sources");
const { getCatalog, filterIndices } = require("../src/problem-catalog");

test.before(async () => {
  await run(`CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, problem_id TEXT NOT NULL,
    title TEXT NOT NULL, url TEXT NOT NULL, rating INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
    category TEXT DEFAULT '', UNIQUE(platform, problem_id))`);
  await run(`CREATE TABLE problem_statements (problem_rowid INTEGER PRIMARY KEY, statement TEXT, scraped_at TEXT)`);
});

const row = (id, extra = {}) => ({ platform: "cses", problem_id: `CSES${id}`, title: `Task ${id}`, url: `https://cses.fi/problemset/task/${id}`, rating: 1000, tags: '["intro"]', category: "Intro", ...extra });

test("upsert inserts new rows, updates only changed ones and skips the rest", async () => {
  const a = await sources.upsert("cses", [row(1), row(2), row(3), row(3)]);
  assert.deepEqual(a, { total: 3, added: 3, updated: 0 });
  const b = await sources.upsert("cses", [row(1), row(2, { title: "Renamed" }), row(3), row(4)]);
  assert.deepEqual(b, { total: 4, added: 1, updated: 1 });
  assert.equal((await get("SELECT title FROM problems WHERE problem_id='CSES2'")).title, "Renamed");
  const c = await sources.upsert("cses", [row(1), { ...row(5), platform: "codeforces" }]);
  assert.deepEqual(c, { total: 1, added: 0, updated: 0 }, "rows for another platform are ignored");
});

test("new sources start switched off; defaults stay on; a first successful sync switches a source on", async () => {
  await sources.init();
  const list = await sources.listSources();
  const by = Object.fromEntries(list.map((s) => [s.id, s]));
  assert.equal(by.codeforces.enabled, true);
  assert.equal(by.cses.enabled, false);
  assert.equal(by.cses.problems, 4);

  const orig = sources.SOURCES.cses.list;
  sources.SOURCES.cses.list = async () => [row(1), row(6)];
  try {
    const r = await sources.syncSource("cses", { by: "owner" });
    assert.deepEqual(r, { total: 2, added: 1, updated: 0 });
  } finally {
    sources.SOURCES.cses.list = orig;
  }
  const after = (await sources.listSources()).find((s) => s.id === "cses");
  assert.equal(after.enabled, true);
  assert.equal(after.lastAdded, 1);
  assert.ok(after.lastSync);
});

test("a failing sync is recorded and nothing is written", async () => {
  const orig = sources.SOURCES.kattis.list;
  sources.SOURCES.kattis.list = async () => {
    throw new Error("Kattis is down");
  };
  try {
    await assert.rejects(sources.syncSource("kattis"), /Kattis is down/);
  } finally {
    sources.SOURCES.kattis.list = orig;
  }
  const k = (await sources.listSources()).find((s) => s.id === "kattis");
  assert.equal(k.lastError, "Kattis is down");
  assert.equal(k.enabled, false);
});

test("switching a source off hides it from the problem list", async () => {
  await run("INSERT INTO problems(platform, problem_id, title, url) VALUES('codeforces','1A','Theatre Square','https://codeforces.com/problemset/problem/1/A')");
  await sources.updateSource("cses", { enabled: false, label: "CSES Problem Set", note: "Classic curriculum" }, "owner");
  const off = await sources.disabledPlatforms();
  assert.ok(off.has("cses"));
  const cat = await getCatalog();
  const shown = filterIndices(cat, { exclude: off }).map((i) => cat.rows[i].platform);
  assert.ok(shown.includes("codeforces"));
  assert.ok(!shown.includes("cses"));
  const s = (await sources.listSources()).find((x) => x.id === "cses");
  assert.equal(s.label, "CSES Problem Set");
  assert.equal(s.note, "Classic curriculum");
  assert.equal(s.updatedBy, "owner");
  await assert.rejects(sources.updateSource("nope", { enabled: true }), /Unknown source/);
});

test("a live test reports the list and one parsed statement without writing", async () => {
  const before = (await all("SELECT COUNT(*) AS n FROM problems"))[0].n;
  const m = sources.SOURCES.timus;
  const [l, s] = [m.list, m.statement];
  m.list = async () => [{ platform: "timus", problem_id: "T1000", title: "A+B Problem", url: "https://acm.timus.ru/problem.aspx?space=1&num=1000", rating: 800, tags: "[]", category: "archive" }];
  m.statement = async () => ({ statement: "<p>Calculate a + b for two integers.</p>", timeLimit: "1 s", memLimit: "64 MB", samples: [{ input: "1 5\n", output: "6\n" }], extra: {} });
  try {
    const r = await sources.testSource("timus");
    assert.equal(r.ok, true);
    assert.equal(r.list.count, 1);
    assert.equal(r.statement.sampleCount, 1);
    assert.equal(r.statement.timeLimit, "1 s");
  } finally {
    Object.assign(m, { list: l, statement: s });
  }
  assert.equal((await all("SELECT COUNT(*) AS n FROM problems"))[0].n, before, "a test writes no problems");
  const t = (await sources.listSources()).find((x) => x.id === "timus");
  assert.equal(t.lastTest.ok, true);
});
