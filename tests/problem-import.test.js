// The problem pipeline (src/problem-import.js): saving a statement stores its
// images and fills missing tags / rating; the audit counts only real gaps;
// re-import goes through the source module. No network: real judge answers
// are saved under tests/fixtures/sources/ and fetch is faked.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { run, get } = require("../src/db");
const imp = require("../src/problem-import");
const sources = require("../src/sources");
const atcoder = require("../src/sources/atcoder");
const codechef = require("../src/sources/codechef");
const { normalizeStatement } = require("../src/statement-media");

const FIX = path.join(__dirname, "fixtures", "sources");
const atcoderPage = fs.readFileSync(path.join(FIX, "atcoder-abc300_c.html"), "utf8");
const codechefJson = JSON.parse(fs.readFileSync(path.join(FIX, "codechef-START01.json"), "utf8"));
const dmojApi = JSON.parse(fs.readFileSync(path.join(FIX, "dmoj-api-ccc22j1.json"), "utf8"));

/** A fake judge CDN: every image is a tiny PNG. */
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4ff0000000049454e44ae426082", "hex");
const fetched = [];
const fakeFetch = async (url) => {
  fetched.push(String(url));
  return new Response(PNG, { status: 200, headers: { "content-type": "image/png", "content-length": String(PNG.length) } });
};

test.before(async () => {
  await run(`CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, problem_id TEXT NOT NULL,
    title TEXT NOT NULL, url TEXT NOT NULL, rating INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
    category TEXT DEFAULT '', UNIQUE(platform, problem_id))`);
  await run(`CREATE TABLE problem_statements (
    problem_rowid INTEGER PRIMARY KEY, statement TEXT DEFAULT '', input_spec TEXT DEFAULT '', output_spec TEXT DEFAULT '',
    note TEXT DEFAULT '', time_limit TEXT DEFAULT '', memory_limit TEXT DEFAULT '', samples TEXT DEFAULT '[]',
    scraped_at TEXT NOT NULL, extra TEXT DEFAULT '{}')`);
  await run(`CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, actor_role TEXT, action TEXT, target_type TEXT, target TEXT, before TEXT, after TEXT, ip TEXT, created_at INTEGER)`);
});

const add = async (platform, problem_id, extra = {}) => {
  await run("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES(?,?,?,?,?,?)", [
    platform,
    problem_id,
    extra.title || problem_id,
    extra.url || `https://example.test/${problem_id}`,
    extra.rating ?? 0,
    extra.tags ?? "[]",
  ]);
  return (await get("SELECT id FROM problems WHERE platform=? AND problem_id=?", [platform, problem_id])).id;
};

test("AtCoder: a real page parses with limits, samples and its two figures, and saving stores the figures", async () => {
  const data = atcoder.parse(atcoderPage);
  assert.equal(data.timeLimit, "2 s");
  assert.equal(data.memLimit, "1024 MB");
  assert.equal(data.samples.length, 4);
  const id = await add("atcoder", "abc300_c", { rating: 600 });
  const r = await imp.saveStatement(id, data, { waitImages: true, fetchImpl: fakeFetch });
  assert.equal(r.images.found, 2);
  assert.equal(r.images.stored, 2, "both figures are in our database");
  assert.ok(fetched.every((u) => u.startsWith("https://img.atcoder.jp/")), "only the judge's own image host was fetched");
  // The page then shows them from our copy, never from the judge.
  const shown = normalizeStatement(data, { platform: "atcoder" });
  assert.ok(!/src="https:\/\/img\.atcoder\.jp/.test(shown.statement + shown.inputSpec + shown.outputSpec + shown.note));
  assert.match(shown.statement + shown.note, /src="\/api\/imgproxy\?url=https%3A%2F%2Fimg\.atcoder\.jp/);
  // Saving again fetches nothing: the copies are already stored.
  const before = fetched.length;
  await imp.saveStatement(id, data, { waitImages: true, fetchImpl: fakeFetch });
  assert.equal(fetched.length, before);
});

test("CodeChef: tags and rating that come only with the statement fill the problem's empty ones", async () => {
  const data = codechef.parse(codechefJson);
  assert.ok(data.extra.tags.length > 0, "the real answer carries tags");
  const id = await add("codechef", "START01");
  const r = await imp.saveStatement(id, data, { waitImages: true, fetchImpl: fakeFetch });
  assert.ok(r.filled.includes("tags"));
  const row = await get("SELECT tags, rating FROM problems WHERE id=?", [id]);
  assert.deepEqual(JSON.parse(row.tags), data.extra.tags.map((t) => t.toLowerCase()).slice(0, 12));
  // Tags someone already has are never overwritten.
  await run("UPDATE problems SET tags=? WHERE id=?", ['["kept"]', id]);
  await imp.saveStatement(id, data, { waitImages: true, fetchImpl: fakeFetch });
  assert.equal((await get("SELECT tags FROM problems WHERE id=?", [id])).tags, '["kept"]');
});

test("DMOJ's API gives limits and types but no statement text (the page is the only source)", () => {
  const o = dmojApi.data.object;
  assert.ok(o.time_limit && o.memory_limit);
  assert.equal(o.description, undefined, "so a blocked page means no statement — shown as a gap, never worked around");
});

test("the audit counts real gaps per problem, and never what a judge does not publish", async () => {
  // A complete CSES problem, one with no statement, one with no samples / limits / tags / rating.
  const full = await add("cses", "CSES1", { rating: 1000, tags: '["intro"]' });
  await imp.saveStatement(full, { statement: "<p>Read n numbers and print their sum.</p>", timeLimit: "1 s", memLimit: "512 MB", samples: [{ input: "1\n", output: "1\n" }] });
  await add("cses", "CSES2", { rating: 1200, tags: '["dp"]' });
  const bare = await add("cses", "CSES3");
  await imp.saveStatement(bare, { statement: "<p>A statement with nothing else at all here.</p>" });
  // LeetCode publishes no limits and no stdin samples: not gaps.
  const lc = await add("leetcode", "LC1", { rating: 800, tags: '["array"]' });
  await imp.saveStatement(lc, { statement: "<p>Given an array, return two indices that add up to target.</p>" });
  // An image we could not store is a gap.
  const img = await add("cses", "CSES4", { rating: 900, tags: '["geo"]' });
  await imp.saveStatement(img, { statement: '<p>Look at the figure below, please. <img src="https://cses.fi/missing.png"></p>', timeLimit: "1 s", memLimit: "512 MB", samples: [{ input: "1", output: "1" }] }, { waitImages: true, fetchImpl: async () => new Response("no", { status: 404 }) });

  const cses = await imp.auditSource("cses", { refresh: true });
  assert.equal(cses.summary.problems, 4);
  assert.equal(cses.summary.statements, 3);
  assert.equal(cses.summary.complete, 1);
  const by = Object.fromEntries(cses.rows.map((r) => [r.problemId, r.gaps]));
  assert.deepEqual(by.CSES2, ["statement"]);
  assert.deepEqual(by.CSES3, ["samples", "time", "memory", "tags", "rating"]);
  assert.deepEqual(by.CSES4, ["images"]);
  assert.equal(by.CSES1, undefined, "a complete problem is not listed");
  assert.equal(cses.summary.gaps.statement, 1);

  const leet = await imp.auditSource("leetcode", { refresh: true });
  assert.equal(leet.rows.length, 0, "no limits / samples is not a gap on LeetCode");
  assert.deepEqual(leet.summary.notPublished.sort(), ["memory", "samples", "time"]);

  const page = await imp.gapRows("cses", { gap: "images" });
  assert.equal(page.total, 1);
  assert.equal(page.rows[0].imagesMissing, 1);
});

test("re-import goes through the source module, stores the result, and says plainly when a judge blocks us", async () => {
  const id = await add("atcoder", "abc300_x", { url: "https://atcoder.jp/contests/abc300/tasks/abc300_x", rating: 500 });
  const orig = sources.SOURCES.atcoder.statement;
  try {
    sources.SOURCES.atcoder.statement = async () => atcoder.parse(atcoderPage);
    const ok = await imp.reimportProblem(id, { fetchImpl: fakeFetch });
    assert.equal(ok.ok, true);
    assert.equal(ok.samples, 4);
    assert.equal(ok.images.stored, 2);
    assert.ok((await get("SELECT length(statement) AS n FROM problem_statements WHERE problem_rowid=?", [id])).n > 100);

    sources.SOURCES.atcoder.statement = async () => {
      throw Object.assign(new Error("atcoder.jp blocks automated access from this server (bot check)"), { blocked: true });
    };
    const blocked = await imp.reimportProblem(id);
    assert.equal(blocked.ok, false);
    assert.match(blocked.error, /bot check/);
  } finally {
    sources.SOURCES.atcoder.statement = orig;
  }
});

test("a source re-import runs in the background, can be stopped, and reports what failed", async () => {
  const origList = sources.SOURCES.cses.list;
  const origSt = sources.SOURCES.cses.statement;
  try {
    sources.SOURCES.cses.list = async () => [];
    sources.SOURCES.cses.statement = async (p) => (p.problem_id === "CSES2" ? { statement: "<p>Now the statement is here, finally.</p>", timeLimit: "1 s", memLimit: "512 MB", samples: [{ input: "1", output: "1" }], extra: {} } : null);
    await sources.init();
    const job = imp.reimportSource("cses", { limit: 10, by: "test", pauseMs: 0 });
    assert.ok(job.startedAt);
    assert.throws(() => imp.reimportSource("cses"), /already running/);
    for (let i = 0; i < 100 && !imp.jobStatus("cses").finishedAt; i++) await new Promise((r) => setTimeout(r, 20));
    const st = imp.jobStatus("cses");
    assert.ok(st.finishedAt);
    assert.equal(st.ok, 1, "CSES2 got its statement");
    assert.ok(st.failed >= 1);
    const after = await imp.auditSource("cses");
    assert.ok(!after.rows.some((r) => r.problemId === "CSES2"), "CSES2 is complete now");
  } finally {
    sources.SOURCES.cses.list = origList;
    sources.SOURCES.cses.statement = origSt;
  }
});
