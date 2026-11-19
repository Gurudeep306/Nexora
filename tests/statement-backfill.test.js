// Statement backfill (src/sources/backfill.js): every problem without a
// statement gets one, refused problems wait to be retried, a refusing judge is
// left alone, and nothing already stored is fetched again.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

const db = require("../src/db");
const backfill = require("../src/sources/backfill");

async function seed() {
  await db.initDb();
  await db.run("DELETE FROM problem_statements");
  await db.run("DELETE FROM problems");
  await backfill.init();
  await db.run("DELETE FROM statement_fetch_failures");
  const add = (id, platform, pid, category = "") => db.run("INSERT INTO problems(id, platform, problem_id, title, url, category) VALUES(?,?,?,?,?,?)", [id, platform, pid, `P${id}`, "https://example.org", category]);
  await add(1, "atcoder", "abc1_a");
  await add(2, "atcoder", "abc1_b");
  await add(3, "atcoder", "abc1_c");
  await add(4, "cses", "1068");
  await add(5, "cses", "1083");
  await add(6, "atcoder", "secret", "__hidden");
  // Problem 3 already has its statement.
  await db.run("INSERT INTO problem_statements(problem_rowid, statement, samples, scraped_at) VALUES(3, 'already here, long enough', '[]', 'x')");
}

const fast = { gapMs: () => 0, restMs: 5, sleep: () => Promise.resolve() };

test("fills every missing statement, newest first, and skips stored and hidden ones", async () => {
  await seed();
  const fetched = [];
  const saved = new Map();
  const job = backfill.start({
    ...fast,
    platforms: ["atcoder", "cses"],
    fetch: async (p) => {
      fetched.push(p.id);
      return { statement: `<p>Statement of ${p.problem_id}</p>`, samples: [{ input: "1\n", output: "2\n" }] };
    },
    save: async (id, data) => {
      saved.set(id, data);
      await db.run("INSERT INTO problem_statements(problem_rowid, statement, samples, scraped_at) VALUES(?,?,?,?)", [id, data.statement, JSON.stringify(data.samples), "x"]);
    },
  });
  await job.done;
  assert.deepEqual([...saved.keys()].sort(), [1, 2, 4, 5]);
  assert.ok(!fetched.includes(3), "a stored statement is not fetched again");
  assert.ok(!fetched.includes(6), "an unpublished problem is not fetched");
  assert.deepEqual(fetched.filter((id) => id <= 3), [2, 1], "newest first within a judge");
  const st = job.status();
  assert.equal(st.running, false);
  assert.equal(st.judges.atcoder.saved, 2);
  assert.equal(st.judges.cses.done, true);

  const cov = await backfill.coverage();
  const at = cov.find((r) => r.platform === "atcoder");
  assert.equal(at.total, 3, "the hidden problem is not counted");
  assert.equal(at.stored, 3);
  assert.equal(at.withSamples, 2, "two stored with samples (the old row had none)");
});

test("a refused problem is remembered and waits; an empty answer is a refusal too", async () => {
  await seed();
  const job = backfill.start({
    ...fast,
    platforms: ["cses"],
    fetch: async (p) => (p.id === 4 ? { statement: "" } : { statement: "<p>fine statement</p>" }),
    save: (id, d) => db.run("INSERT INTO problem_statements(problem_rowid, statement, scraped_at) VALUES(?,?,?)", [id, d.statement, "x"]),
  });
  await job.done;
  const f = await db.get("SELECT * FROM statement_fetch_failures WHERE problem_rowid=4");
  assert.equal(f.tries, 1);
  assert.match(f.last_error, /no statement/);
  assert.ok(f.next_try_at > Date.now() + 50 * 60e3, "about an hour before the next try");
  // A second pass right away does not touch it again.
  const again = [];
  await backfill.start({ ...fast, platforms: ["cses"], fetch: async (p) => (again.push(p.id), { statement: "<p>x long enough</p>" }), save: async () => {} }).done;
  assert.deepEqual(again, []);
  assert.equal(backfill.retryDelayMs(1), 3600e3);
  assert.equal(backfill.retryDelayMs(3), 16 * 3600e3);
  assert.equal(backfill.retryDelayMs(20), 30 * 24 * 3600e3);
});

test("a judge that keeps refusing is left alone, then tried again", async () => {
  await seed();
  await db.run("INSERT INTO problems(id, platform, problem_id, title, url) VALUES(7,'cses','1','x','u'),(8,'cses','2','x','u'),(9,'cses','3','x','u')");
  let rests = 0;
  const logs = [];
  const job = backfill.start({
    gapMs: () => 0,
    restMs: 50,
    sleep: (ms) => {
      if (ms >= 50) rests++;
      return Promise.resolve();
    },
    platforms: ["cses"],
    log: (m) => logs.push(m),
    fetch: async () => {
      throw new Error("HTTP 429 Too Many Requests");
    },
    save: async () => {},
  });
  await job.done;
  assert.ok(logs.some((m) => /refusing/.test(m) && /resting/.test(m)), logs.join("\n"));
  assert.ok(backfill.judgeRefused("HTTP 429"));
  assert.ok(backfill.judgeRefused("Cloudflare challenge"));
  assert.ok(!backfill.judgeRefused("The judge gave no statement"));
  // Every refused problem now waits for its retry time.
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM statement_fetch_failures")).n, 5);
});

test("stop() ends the run quickly", async () => {
  await seed();
  let calls = 0;
  const job = backfill.start({
    gapMs: () => 10_000,
    restMs: 5,
    sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 5))),
    platforms: ["atcoder"],
    fetch: async () => {
      calls++;
      job.stop();
      return { statement: "<p>long enough statement</p>" };
    },
    save: async () => {},
  });
  await job.done;
  assert.equal(calls, 1);
  assert.equal(job.status().running, false);
});
