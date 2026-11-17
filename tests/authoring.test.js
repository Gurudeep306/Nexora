// "Add a coding problem" (src/authoring.js): drafts, the checker modes,
// outputs made by a reference solution, a check of all five solutions that
// publishing depends on (and that goes stale when tests change), publishing
// into the catalog with hidden tests, and unpublishing.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");
const a = require("../src/authoring");

test.before(async () => {
  await db.initDb();
});

const waitJob = async (id) => {
  for (let i = 0; i < 200 && a.jobStatus(id)?.running; i++) await new Promise((r) => setTimeout(r, 10));
  return a.jobStatus(id);
};
// Fake judges: every program "doubles its input"; a solution containing BAD answers wrong.
const runner = async (code, input) => (code.includes("BAD") ? { verdict: "OK", output: "0" } : { verdict: "OK", output: String(Number(input) * 2) });
const judge = async (code, cases) => {
  const results = await Promise.all(cases.map(async (c, i) => {
    const out = (await runner(code, c.input)).output;
    const passed = out.trim() === String(c.expected_output).trim();
    return { label: `Test ${i + 1}`, input: c.input, expected: c.expected_output, actual: out, passed, verdict: passed ? "AC" : "WA", timeMs: 5 };
  }));
  return { verdict: results.every((r) => r.passed) ? "AC" : "WA", compileError: null, results };
};
const md = (s) => `<p>${s}</p>`;

test("checker modes: exact, tokens, float, unordered, case, and a checker program", async () => {
  assert.equal(await a.check({ mode: "exact" }, "", "1 2\n", "1 2  \n\n"), true, "trailing spaces never matter");
  assert.equal(await a.check({ mode: "exact" }, "", "1 2", "1  2"), false);
  assert.equal(await a.check({ mode: "tokens" }, "", "1 2", "1\n  2"), true);
  assert.equal(await a.check({ mode: "float", eps: 1e-6 }, "", "0.3333333", "0.33333334"), true);
  assert.equal(await a.check({ mode: "float", eps: 1e-6 }, "", "0.5", "0.6"), false);
  assert.equal(await a.check({ mode: "unordered" }, "", "a\nb", "b\na"), true);
  assert.equal(await a.check({ mode: "nocase" }, "", "YES", "yes"), true);
  const prog = { mode: "program", lang: "python", code: "checker" };
  const fake = async (_c, stdin) => ({ verdict: "OK", output: JSON.parse(stdin).output.trim() === "7" ? "OK" : "WRONG" });
  assert.equal(await a.check(prog, "x", "anything", "7", fake), true);
  assert.equal(await a.check(prog, "x", "anything", "8", fake), false);
});

test("a draft: outputs from the reference solution, the five-solution check, and publishing", async () => {
  const p = await a.create({ title: "Double it", statement: "Read $n$ and print $2n$, please.", tests: [{ input: "3", output: "", sample: true }, { input: "5", output: "" }] }, "staff");
  assert.equal(p.status, "draft");
  await assert.rejects(a.verify(p.id, { judge, runner, by: "staff" }), /has no output yet/);

  for (const l of a.LANGS) p.data.solutions[l] = `solution in ${l}`;
  await a.save(p.id, p.data, "staff");
  await a.generate(p.id, { refLang: "python", runner, by: "staff" });
  await waitJob(p.id);
  let d = (await a.load(p.id)).data;
  assert.deepEqual(d.tests.map((t) => t.output), ["6", "10"], "outputs made by the reference solution");

  await assert.rejects(a.publish(p.id, { by: "staff", markdown: md }), /run the check/);
  d.solutions.java = "BAD java";
  await a.save(p.id, d, "staff");
  await a.verify(p.id, { judge, runner, by: "staff" });
  let v = (await waitJob(p.id)).result;
  assert.equal(v.ok, false);
  assert.equal(v.langs.java.ok, false);
  assert.equal(v.langs.java.failedTest, 1);
  assert.equal(v.langs.cpp.ok, true);

  d.solutions.java = "solution in java";
  await a.save(p.id, d, "staff");
  assert.equal((await a.load(p.id)).verify.current, false, "a change makes the last check stale");
  await a.verify(p.id, { judge, runner, by: "staff" });
  v = (await waitJob(p.id)).result;
  assert.equal(v.ok, true);

  const pub = await a.publish(p.id, { by: "staff", markdown: md });
  assert.equal(pub.status, "published");
  const row = await db.get("SELECT * FROM problems WHERE id=?", [pub.problemRowid]);
  assert.deepEqual({ platform: row.platform, problem_id: row.problem_id, title: row.title, url: row.url }, { platform: "nexora", problem_id: `NX${p.id}`, title: "Double it", url: "" }, "no link away: the problem lives here");
  const st = await db.get("SELECT statement, samples, extra FROM problem_statements WHERE problem_rowid=?", [pub.problemRowid]);
  assert.match(st.statement, /\$n\$/, "maths kept for the reader");
  assert.deepEqual(JSON.parse(st.samples), [{ input: "3", output: "6" }], "only samples are shown");
  const off = await a.officialTests(pub.problemRowid);
  assert.deepEqual(off.cases.map((c) => c.hidden), [false, true]);
  assert.equal(off.checker.mode, "exact");

  await a.unpublish(p.id, "staff");
  assert.equal((await db.get("SELECT category FROM problems WHERE id=?", [pub.problemRowid])).category, "__hidden");
  await a.publish(p.id, { by: "staff", markdown: md });
  assert.notEqual((await db.get("SELECT category FROM problems WHERE id=?", [pub.problemRowid])).category, "__hidden", "publishing again brings it back");
});

test("publishing needs a statement, a sample and two tests", async () => {
  const p = await a.create({ title: "Short" }, "staff");
  assert.deepEqual(a.problemsFor(p.data), ["a statement", "at least one sample test", "at least two tests"]);
  await assert.rejects(a.publish(p.id, { by: "staff", markdown: md }), /Still needed: a statement/);
  await a.remove(p.id);
  assert.equal(await a.load(p.id), null);
});

test("applyChecker turns a wrong-looking answer right when the checker accepts it", async () => {
  const raw = { verdict: "WA", results: [{ input: "", expected: "0.5", actual: "0.50000001", passed: false, verdict: "WA" }] };
  const r = await a.applyChecker(raw, [{ input: "", expected_output: "0.5" }], { mode: "float", eps: 1e-6 });
  assert.equal(r.verdict, "AC");
  const tle = await a.applyChecker({ verdict: "TLE", results: [{ verdict: "TLE", passed: false, actual: "" }] }, [{}], { mode: "tokens" });
  assert.equal(tle.verdict, "TLE", "a time limit stays a time limit");
});
