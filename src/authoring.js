// Staff-only "Add a coding problem": drafts, tests, a checker, solutions in
// five languages proven against every test, and publishing into the catalog
// as an official NexoraGuru problem (platform "nexora").
//
// A draft is one JSON document (authored_problems.data):
//   title, statement (Markdown with $maths$ and images), inputSpec,
//   outputSpec, note, timeLimit ("2 s"), memoryLimit ("256 MB"), tags[],
//   rating, editorial (Markdown),
//   tests: [{ input, output, sample }]   samples are shown; the rest hidden
//   checker: { mode: exact|tokens|float|unordered|nocase|program, eps?, lang?, code? }
//   solutions: { cpp, java, python, javascript, c }
//   generator: { lang, code, count }
//
// Publishing needs: a statement, at least one sample, and every one of the
// five solutions Accepted on every test, by a check of the current draft
// (a change after the check means checking again). Published problems are
// judged on all their tests for everyone; hidden tests never leave the
// server except to staff.
const crypto = require("crypto");
const { run, get, all } = require("./db");

const LANGS = ["cpp", "java", "python", "javascript", "c"];
const LANG_NAME = { cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript", c: "C" };
const MAX_TESTS = 100;
const MAX_TEST_BYTES = 1024 * 1024;
// All tests together: kept well inside one database row.
const MAX_TOTAL_TEST_BYTES = 8 * 1024 * 1024;
const CHECKER_MODES = ["exact", "tokens", "float", "unordered", "nocase", "program"];

let ready = null;
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS authored_problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      problem_rowid INTEGER,
      verify TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL
    )`);
    await run(`CREATE TABLE IF NOT EXISTS problem_tests (
      problem_rowid INTEGER NOT NULL,
      idx INTEGER NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (problem_rowid, idx)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS problem_checkers (
      problem_rowid INTEGER PRIMARY KEY,
      checker TEXT NOT NULL
    )`);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/* ── the draft ── */

const str = (v, max) => String(v ?? "").slice(0, max);
function clean(d = {}) {
  const tests = (Array.isArray(d.tests) ? d.tests : []).slice(0, MAX_TESTS).map((t) => ({
    input: str(t?.input, MAX_TEST_BYTES),
    output: str(t?.output, MAX_TEST_BYTES),
    sample: !!t?.sample,
  }));
  const c = d.checker || {};
  const mode = CHECKER_MODES.includes(c.mode) ? c.mode : "exact";
  const solutions = {};
  for (const l of LANGS) solutions[l] = str(d.solutions?.[l], 100_000);
  return {
    title: str(d.title, 120).trim(),
    statement: str(d.statement, 60_000),
    inputSpec: str(d.inputSpec, 20_000),
    outputSpec: str(d.outputSpec, 20_000),
    note: str(d.note, 20_000),
    timeLimit: str(d.timeLimit || "2 s", 20),
    memoryLimit: str(d.memoryLimit || "256 MB", 20),
    tags: (Array.isArray(d.tags) ? d.tags : []).map((t) => str(t, 40).trim().toLowerCase()).filter(Boolean).slice(0, 12),
    rating: Math.max(0, Math.min(4000, Math.round(Number(d.rating) || 0))),
    editorial: str(d.editorial, 60_000),
    tests,
    checker: { mode, eps: Math.max(0, Math.min(1, Number(c.eps) || 1e-6)), lang: c.lang === "cpp" ? "cpp" : "python", code: str(c.code, 50_000) },
    solutions,
    generator: { lang: LANGS.includes(d.generator?.lang) ? d.generator.lang : "python", code: str(d.generator?.code, 50_000), count: Math.max(1, Math.min(30, Number(d.generator?.count) || 10)) },
  };
}
/** What the check proves: tests, checker and solutions (not the wording). */
function judgedHash(d) {
  return crypto.createHash("sha1").update(JSON.stringify([d.tests, d.checker, d.solutions, d.timeLimit])).digest("hex");
}

const row = (r) => {
  if (!r) return null;
  let data = {};
  let verify = null;
  try {
    data = clean(JSON.parse(r.data));
  } catch {}
  try {
    verify = r.verify ? JSON.parse(r.verify) : null;
  } catch {}
  return {
    id: r.id,
    status: r.status,
    problemRowid: r.problem_rowid,
    data,
    verify: verify ? { ...verify, current: verify.hash === judgedHash(data) } : null,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
};

async function list() {
  await init();
  const rows = await all("SELECT * FROM authored_problems ORDER BY updated_at DESC LIMIT 200");
  return rows.map(row).map((p) => ({ id: p.id, status: p.status, problemRowid: p.problemRowid, title: p.data.title || "Untitled problem", tests: p.data.tests.length, verified: !!p.verify?.ok && p.verify.current, updatedAt: p.updatedAt, updatedBy: p.updatedBy }));
}
async function load(id) {
  await init();
  return row(await get("SELECT * FROM authored_problems WHERE id=?", [Number(id)]));
}
async function create(data, by) {
  await init();
  const now = new Date().toISOString();
  const r = await run("INSERT INTO authored_problems(data, status, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?)", [JSON.stringify(clean(data)), "draft", by, now, by, now]);
  return load(r.lastID);
}
async function save(id, data, by) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  const d = clean(data);
  const testBytes = d.tests.reduce((n, t) => n + Buffer.byteLength(t.input) + Buffer.byteLength(t.output), 0);
  if (testBytes > MAX_TOTAL_TEST_BYTES) throw Object.assign(new Error(`The tests come to ${(testBytes / 1048576).toFixed(1)} MB; the most is ${MAX_TOTAL_TEST_BYTES / 1048576} MB in all`), { status: 413 });
  await run("UPDATE authored_problems SET data=?, updated_by=?, updated_at=? WHERE id=?", [JSON.stringify(d), by, new Date().toISOString(), p.id]);
  return load(p.id);
}
async function remove(id) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  if (p.status === "published") throw Object.assign(new Error("A published problem stays: unpublish it first"), { status: 409 });
  await run("DELETE FROM authored_problems WHERE id=?", [p.id]);
}

/* ── checking an answer ── */

function lines(s) {
  return String(s ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}
const tokens = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean);

/**
 * Is `actual` right for this test? Built-in modes compare in plain code; a
 * checker program (Python or C++) reads {input, expected, output} as JSON on
 * stdin and prints OK for a right answer.
 */
async function check(checker, input, expected, actual, runner) {
  const c = checker || { mode: "exact" };
  switch (c.mode) {
    case "tokens":
      return tokens(expected).join(" ") === tokens(actual).join(" ");
    case "nocase":
      return tokens(expected).join(" ").toLowerCase() === tokens(actual).join(" ").toLowerCase();
    case "unordered":
      return lines(expected).split("\n").sort().join("\n") === lines(actual).split("\n").sort().join("\n");
    case "float": {
      const e = tokens(expected);
      const a = tokens(actual);
      if (e.length !== a.length) return false;
      const eps = c.eps || 1e-6;
      return e.every((x, i) => {
        const p = Number(x);
        const q = Number(a[i]);
        if (Number.isFinite(p) && Number.isFinite(q)) return Math.abs(p - q) <= eps * Math.max(1, Math.abs(p));
        return x === a[i];
      });
    }
    case "program": {
      if (!c.code?.trim() || !runner) return false;
      const r = await runner(c.code, JSON.stringify({ input, expected, output: actual }), c.lang || "python");
      return !r.verdict || r.verdict === "OK" ? /^\s*OK\b/i.test(String(r.output ?? r.stdout ?? "")) : false;
    }
    default:
      return lines(expected) === lines(actual);
  }
}

/** Apply a problem's checker to a judge result (run before hidden tests are redacted). */
async function applyChecker(result, cases, checker, runner) {
  if (!checker || checker.mode === "exact" || !Array.isArray(result?.results)) return result;
  const results = await Promise.all(
    result.results.map(async (r, i) => {
      if (r.verdict && r.verdict !== "AC" && r.verdict !== "WA") return r; // TLE, RE, CE stand
      const ok = await check(checker, cases[i]?.input ?? r.input, cases[i]?.expected_output ?? r.expected, r.actual, runner);
      return { ...r, passed: ok, verdict: ok ? "AC" : "WA" };
    }),
  );
  const { overallVerdict } = require("./judge");
  return { ...result, results, verdict: overallVerdict(results) };
}

/** A published problem's tests and checker (for /api/judge). */
async function officialTests(problemRowid) {
  await init();
  const [tests, chk] = await Promise.all([
    all("SELECT idx, input, output, hidden FROM problem_tests WHERE problem_rowid=? ORDER BY idx", [problemRowid]),
    get("SELECT checker FROM problem_checkers WHERE problem_rowid=?", [problemRowid]),
  ]);
  let checker = null;
  try {
    checker = chk ? JSON.parse(chk.checker) : null;
  } catch {}
  return {
    cases: tests.map((t) => ({ input: t.input, expected_output: t.output, label: t.hidden ? `Test ${t.idx + 1}` : `Sample ${t.idx + 1}`, hidden: !!t.hidden })),
    checker,
  };
}

/* ── background jobs: checking solutions, generating tests ── */

const jobs = new Map(); // problem id → { kind, running, done, total, ... }
function jobStatus(id) {
  return jobs.get(Number(id)) || null;
}

/**
 * Run each of the five solutions on every test, with the checker. The result
 * is stored with the draft; publishing needs it to be all Accepted and current.
 */
async function verify(id, { judge, runner, by }) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  if (jobs.get(p.id)?.running) throw Object.assign(new Error("A check is already running for this problem"), { status: 409 });
  const d = p.data;
  if (!d.tests.length) throw Object.assign(new Error("Add tests first"), { status: 400 });
  const missingOut = d.tests.findIndex((t) => !t.output.trim());
  if (missingOut >= 0) throw Object.assign(new Error(`Test ${missingOut + 1} has no output yet: generate the outputs first`), { status: 400 });
  const job = { kind: "verify", running: true, done: 0, total: LANGS.length, startedAt: Date.now(), by };
  jobs.set(p.id, job);
  (async () => {
    const cases = d.tests.map((t, i) => ({ input: t.input, expected_output: t.output, label: `Test ${i + 1}` }));
    const langs = {};
    for (const lang of LANGS) {
      const code = d.solutions[lang];
      if (!code.trim()) {
        langs[lang] = { ok: false, verdict: "MISSING", detail: `No ${LANG_NAME[lang]} solution yet` };
      } else {
        try {
          const raw = await judge(code, cases, lang);
          const r = await applyChecker(raw, cases, d.checker, runner);
          const firstBad = (r.results || []).findIndex((x) => !x.passed);
          const maxMs = Math.max(0, ...(r.results || []).map((x) => x.timeMs || 0));
          langs[lang] = {
            ok: r.verdict === "AC",
            verdict: r.verdict,
            maxMs,
            detail: r.verdict === "AC" ? `${cases.length} tests, slowest ${maxMs} ms` : r.compileError ? String(r.compileError).slice(0, 300) : `Test ${firstBad + 1}: ${r.results[firstBad]?.verdict || r.verdict}`,
            failedTest: firstBad >= 0 ? firstBad + 1 : null,
          };
        } catch (e) {
          langs[lang] = { ok: false, verdict: "ERROR", detail: String(e.message || e).slice(0, 200) };
        }
      }
      job.done++;
    }
    const verifyResult = { at: Date.now(), by, hash: judgedHash(d), ok: LANGS.every((l) => langs[l].ok), langs };
    await run("UPDATE authored_problems SET verify=? WHERE id=?", [JSON.stringify(verifyResult), p.id]);
    job.running = false;
    job.result = verifyResult;
  })().catch((e) => {
    job.running = false;
    job.error = String(e.message || e);
  });
  return job;
}

/**
 * Fill test outputs from a reference solution, and (with a generator) make
 * new hidden tests: the generator runs once per test with the test number on
 * stdin and prints one input.
 */
async function generate(id, { refLang, makeTests, runner, by }) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  if (jobs.get(p.id)?.running) throw Object.assign(new Error("A job is already running for this problem"), { status: 409 });
  const d = p.data;
  const lang = LANGS.includes(refLang) ? refLang : "cpp";
  if (!d.solutions[lang].trim()) throw Object.assign(new Error(`Write the ${LANG_NAME[lang]} solution first: it makes the outputs`), { status: 400 });
  if (makeTests && !d.generator.code.trim()) throw Object.assign(new Error("Write the generator first"), { status: 400 });
  const job = { kind: "generate", running: true, done: 0, total: 0, startedAt: Date.now(), by, errors: [] };
  jobs.set(p.id, job);
  (async () => {
    const tests = [...d.tests];
    if (makeTests) {
      const n = Math.min(d.generator.count, MAX_TESTS - tests.length);
      job.total += n;
      for (let i = 1; i <= n; i++) {
        const r = await runner(d.generator.code, `${i}\n`, d.generator.lang);
        if (r.verdict && r.verdict !== "OK") job.errors.push(`Generator, test ${i}: ${r.verdict} ${String(r.stderr || r.error || "").slice(0, 120)}`);
        else tests.push({ input: String(r.output ?? r.stdout ?? ""), output: "", sample: false });
        job.done++;
      }
    }
    const todo = tests.map((t, i) => (t.output.trim() ? -1 : i)).filter((i) => i >= 0);
    job.total += todo.length;
    for (const i of todo) {
      const r = await runner(d.solutions[lang], tests[i].input, lang);
      if (r.verdict && r.verdict !== "OK") job.errors.push(`Output of test ${i + 1}: ${r.verdict} ${String(r.stderr || r.error || "").slice(0, 120)}`);
      else tests[i] = { ...tests[i], output: String(r.output ?? r.stdout ?? "") };
      job.done++;
    }
    const fresh = await load(p.id);
    await save(p.id, { ...fresh.data, tests }, by);
    job.running = false;
  })().catch((e) => {
    job.running = false;
    job.error = String(e.message || e);
  });
  return job;
}

/* ── publishing ── */

function problemsFor(d) {
  const problems = [];
  if (!d.title) problems.push("a title");
  if (String(d.statement).trim().length < 20) problems.push("a statement");
  if (!d.tests.some((t) => t.sample)) problems.push("at least one sample test");
  if (d.tests.length < 2) problems.push("at least two tests");
  return problems;
}

/** What the Solve page gets beyond the statement: the written solution (behind "try first"). */
function studentExtra(d) {
  const solutions = {};
  for (const l of LANGS) if (d.solutions[l].trim()) solutions[l] = d.solutions[l];
  return { official: true, tags: d.tags, solution: d.editorial.trim() || Object.keys(solutions).length ? { editorial: d.editorial.trim() || null, solutions } : null };
}

async function publish(id, { by, markdown }) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  const d = p.data;
  const missing = problemsFor(d);
  if (missing.length) throw Object.assign(new Error(`Still needed: ${missing.join(", ")}`), { status: 400 });
  if (!p.verify?.ok || !p.verify.current) {
    throw Object.assign(new Error(p.verify && !p.verify.current ? "The tests or solutions changed since the last check: check again" : "Every solution must pass every test first: run the check"), { status: 400 });
  }
  const html = (s) => (s && s.trim() ? markdown(s) : "");
  const sec = (title, s) => (s && s.trim() ? `<div class="section-title">${title}</div>${html(s)}` : "");
  const samples = d.tests.filter((t) => t.sample).map((t) => ({ input: t.input, output: t.output }));
  let rowid = p.problemRowid;
  if (!rowid) {
    const pid = `NX${p.id}`;
    await run("INSERT OR IGNORE INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES('nexora',?,?,?,?,?,?)", [pid, d.title, "", d.rating || 0, JSON.stringify(d.tags), d.tags[0] || ""]);
    rowid = Number((await get("SELECT id FROM problems WHERE platform='nexora' AND problem_id=?", [pid])).id);
  }
  // No url: the problem lives here, so there is no "open on another site" link.
  await run("UPDATE problems SET title=?, url=?, rating=?, tags=?, category=? WHERE id=?", [d.title, "", d.rating || 0, JSON.stringify(d.tags), d.tags[0] || "", rowid]);
  await run(
    `INSERT OR REPLACE INTO problem_statements(problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at, extra)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [rowid, html(d.statement), sec("Input", d.inputSpec), sec("Output", d.outputSpec), html(d.note), d.timeLimit, d.memoryLimit, JSON.stringify(samples), new Date().toISOString(), JSON.stringify(studentExtra(d))],
  );
  await run("DELETE FROM problem_tests WHERE problem_rowid=?", [rowid]);
  for (const [i, t] of d.tests.entries()) {
    await run("INSERT INTO problem_tests(problem_rowid, idx, input, output, hidden) VALUES(?,?,?,?,?)", [rowid, i, t.input, t.output, t.sample ? 0 : 1]);
  }
  await run("INSERT OR REPLACE INTO problem_checkers(problem_rowid, checker) VALUES(?,?)", [rowid, JSON.stringify(d.checker)]);
  await run("UPDATE authored_problems SET status='published', problem_rowid=?, updated_by=?, updated_at=? WHERE id=?", [rowid, by, new Date().toISOString(), p.id]);
  return load(p.id);
}

async function unpublish(id, by) {
  const p = await load(id);
  if (!p) throw Object.assign(new Error("No such problem"), { status: 404 });
  if (p.problemRowid) {
    // Kept in the database (submissions point at it), hidden from the catalog.
    await run("UPDATE problems SET category='__hidden' WHERE id=?", [p.problemRowid]);
  }
  await run("UPDATE authored_problems SET status='draft', updated_by=?, updated_at=? WHERE id=?", [by, new Date().toISOString(), p.id]);
  return load(p.id);
}

module.exports = { MAX_TESTS, MAX_TEST_BYTES, MAX_TOTAL_TEST_BYTES, LANGS, LANG_NAME, CHECKER_MODES, init, list, load, create, save, remove, check, applyChecker, officialTests, verify, generate, jobStatus, publish, unpublish, problemsFor, clean, judgedHash, studentExtra };
