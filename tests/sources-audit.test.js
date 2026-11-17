// What the imported problems are missing (src/sources/audit.js): per-source
// counts, "n/a" for what a judge does not publish, the problems with each
// gap, images counted as missing until our copy is stored, and a polite
// re-import that reports a bot check instead of working around it.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");
const sources = require("../src/sources");
const audit = require("../src/sources/audit");
const store = require("../src/media-store");

const ids = {};
async function addProblem(platform, pid, { rating = 0, tags = "[]" } = {}) {
  await db.run("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES(?,?,?,?,?,?)", [platform, pid, `T ${pid}`, `https://x.test/${pid}`, rating, tags]);
  ids[pid] = Number((await db.get("SELECT id FROM problems WHERE platform=? AND problem_id=?", [platform, pid])).id);
  return ids[pid];
}
async function addStatement(pid, { statement = "<p>Read n and print it back, please.</p>", samples = '[{"input":"1","output":"1"}]', time = "1 s", memory = "256 MB" } = {}) {
  await db.run(
    "INSERT OR REPLACE INTO problem_statements(problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at) VALUES(?,?,?,?,?,?,?,?,datetime('now'))",
    [ids[pid], statement, "", "", "", time, memory, samples],
  );
}

test.before(async () => {
  await db.initDb();
  await addProblem("codeforces", "1A", { rating: 800, tags: '["math"]' });
  await addProblem("codeforces", "1B", { rating: 0, tags: "[]" }); // no rating, no tags
  await addProblem("codeforces", "1C", { rating: 900, tags: '["dp"]' }); // statement not fetched
  await addStatement("1A", { statement: '<p>See the figure.</p><img src="/predownloaded/f/1a.png">' });
  await addStatement("1B", { samples: "[]", memory: "" });
  await addProblem("codechef", "CC1"); // CodeChef: no memory limit published
  await addStatement("CC1", { memory: "" });
  await addProblem("uva", "100");
  await addStatement("100", { samples: "[]", time: "", memory: "" }); // a PDF statement
  await addProblem("euler", "E1");
  await addStatement("E1", { samples: "[]", time: "", memory: "" }); // answer-only
});

const bySource = async () => Object.fromEntries((await audit.audit()).map((s) => [s.id, s]));

test("counts what is missing, and only what the judge publishes", async () => {
  const s = await bySource();
  const cf = s.codeforces;
  assert.deepEqual({ problems: cf.problems, statements: cf.statements }, { problems: 3, statements: 2 });
  assert.deepEqual(
    { statement: cf.missing.statement, samples: cf.missing.samples, limits: cf.missing.limits, tags: cf.missing.tags, rating: cf.missing.rating },
    { statement: 1, samples: 1, limits: 1, tags: 1, rating: 1 },
  );
  assert.equal(s.codechef.missing.limits, 0, "CodeChef publishes no memory limit: not a gap");
  assert.equal(s.codechef.published.rating, false, "no CodeChef problem here has a rating: n/a, not missing");
  assert.equal(s.uva.published.samples, false, "UVa statements are PDFs");
  assert.equal(s.uva.missing.samples, 0);
  assert.equal(s.euler.published.samples, false, "answer-only: no samples");
});

test("an image counts as missing until our own copy is stored", async () => {
  let cf = (await bySource()).codeforces;
  assert.deepEqual({ missing: cf.missing.images, total: cf.images.total }, { missing: 1, total: 1 }, "relative src made absolute against Codeforces");
  const g = await audit.gaps("codeforces", "images");
  assert.deepEqual(g.problems.map((p) => p.problem_id), ["1A"]);
  await store.save("https://codeforces.com/predownloaded/f/1a.png", { buf: Buffer.from("png"), ctype: "image/png", etag: '"e"', at: Date.now() });
  cf = (await bySource()).codeforces;
  assert.equal(cf.missing.images, 0);
  assert.equal((await audit.gaps("codeforces", "images")).total, 0);
});

test("lists the problems with each gap", async () => {
  const pick = async (f) => (await audit.gaps("codeforces", f)).problems.map((p) => p.problem_id);
  assert.deepEqual(await pick("statement"), ["1C"]);
  assert.deepEqual(await pick("samples"), ["1B"]);
  assert.deepEqual(await pick("limits"), ["1B"]);
  assert.deepEqual(await pick("tags"), ["1B"]);
  assert.deepEqual(await pick("rating"), ["1B"]);
  assert.deepEqual((await audit.gaps("codechef", "limits")).problems, [], "time limit present: CodeChef is complete");
  await assert.rejects(audit.gaps("nope", "samples"), /Unknown source/);
  await assert.rejects(audit.gaps("codeforces", "secrets"), /Unknown field/);
});

test("re-import saves what the judge gives, and reports a bot check as it is", async () => {
  const saved = [];
  audit.useSaver(async (id, data) => saved.push([id, data.statement]), () => {});
  const orig = sources.SOURCES.codeforces.statement;
  sources.SOURCES.codeforces.statement = async (p) => {
    if (p.problem_id === "1B") throw new Error("codeforces.com blocks automated access from this server (bot check)");
    return { statement: "<p>A full statement for this problem.</p>", samples: [{ input: "1", output: "1" }], timeLimit: "1 s", memLimit: "256 MB", extra: {} };
  };
  try {
    audit.reimport([ids["1C"], ids["1B"]], { by: "owner", delayMs: 0 });
    assert.throws(() => audit.reimport([ids["1C"]], { delayMs: 0 }), /already running/);
    for (let i = 0; i < 50 && audit.reimportStatus().running; i++) await new Promise((r) => setTimeout(r, 20));
    const job = audit.reimportStatus();
    assert.deepEqual({ done: job.done, ok: job.ok, failed: job.failed }, { done: 2, ok: 1, failed: 1 });
    assert.match(job.errors[0].error, /bot check/);
    assert.deepEqual(saved.map((s) => s[0]), [ids["1C"]]);
  } finally {
    sources.SOURCES.codeforces.statement = orig;
  }
  assert.throws(() => audit.reimport([], {}), /No problems chosen/);
  assert.equal(audit.MAX_BATCH, 25);
});
