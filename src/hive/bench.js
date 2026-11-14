// Golden tasks: a small, fixed set of coding problems with known answers.
// A model writes each function; Hive runs it against hidden tests in a locked
// child process (no files, no programs, no secrets in its environment). The
// score is objective, and every result feeds the router's measured quality.
const { spawn } = require("child_process");
const { run, all, now } = require("./db");

const GOLDEN = [
  {
    id: "rle",
    fn: "encode",
    ask: "Write a JavaScript function encode(s) that run-length encodes a string: consecutive repeats become the count followed by the character, single characters stay as they are. encode('aaabcc') === '3ab2c'. Empty string gives ''.",
    tests: [[["aaabcc"], "3ab2c"], [[""], ""], [["abc"], "abc"], [["zzzzzzzzzzzz"], "12z"], [["aabbaa"], "2a2b2a"]],
  },
  {
    id: "intervals",
    fn: "merge",
    ask: "Write a JavaScript function merge(intervals) that merges overlapping closed intervals given as [start, end] pairs (in any order) and returns them sorted by start. Touching intervals like [1,2] and [2,3] merge.",
    tests: [[[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]], [[[[1, 4], [4, 5]]], [[1, 5]]], [[[]], []], [[[[5, 7], [1, 2]]], [[1, 2], [5, 7]]], [[[[1, 10], [2, 3], [4, 5]]], [[1, 10]]]],
  },
  {
    id: "lis",
    fn: "lis",
    ask: "Write a JavaScript function lis(nums) that returns the length of the longest strictly increasing subsequence of an array of integers. It must run in O(n log n) for 100000 numbers.",
    tests: [[[[10, 9, 2, 5, 3, 7, 101, 18]], 4], [[[]], 0], [[[7, 7, 7]], 1], [[[0, 1, 0, 3, 2, 3]], 4], [["BIG"], 100000]],
  },
  {
    id: "brackets",
    fn: "balanced",
    ask: "Write a JavaScript function balanced(s) that returns true when every bracket ()[]{} in s is closed in the right order; other characters are ignored.",
    tests: [[["([]{})"], true], [["(]"], false], [["a(b[c]d)e"], true], [["(("], false], [[""], true], [["}{"], false]],
  },
  {
    id: "dijkstra",
    fn: "shortest",
    ask: "Write a JavaScript function shortest(n, edges, src) for a directed graph with nodes 0..n-1 and edges given as [from, to, weight] (weights >= 0). Return an array of the shortest distance from src to every node, using Infinity for unreachable nodes.",
    tests: [[[4, [[0, 1, 1], [1, 2, 2], [0, 2, 5], [2, 3, 1]], 0], [0, 1, 3, 4]], [[3, [[0, 1, 4]], 2], [null, null, 0]], [[2, [], 0], [0, null]]],
  },
  {
    id: "dates",
    fn: "daysBetween",
    ask: "Write a JavaScript function daysBetween(a, b) that takes two dates as 'YYYY-MM-DD' strings and returns the whole number of days from a to b (negative if b is earlier). It must be correct across leap years and daylight-saving changes.",
    tests: [[["2024-02-28", "2024-03-01"], 2], [["2023-03-25", "2023-03-27"], 2], [["2025-01-01", "2024-01-01"], -366], [["2000-01-01", "2000-01-01"], 0]],
  },
];

/** The function's code from a model reply (a fenced block if there is one). */
function codeOf(text) {
  const blocks = [...String(text || "").matchAll(/```(?:[a-z]*)\n([\s\S]*?)```/gi)].map((m) => m[1]);
  return (blocks.find((b) => /function|=>/.test(b)) || blocks[0] || String(text || "")).trim();
}

// Runs inside the locked child: defines the function, runs the tests, prints JSON.
const HARNESS = `
const [code, fn, tests] = JSON.parse(process.argv[1]);
const big = () => Array.from({ length: 100000 }, (_, i) => i);
const norm = (v) => JSON.stringify(v, (_, x) => (x === Infinity ? null : x));
let f;
try { f = new Function(code + "\\n;return typeof " + fn + " === 'function' ? " + fn + " : undefined;")(); } catch (e) { console.log(JSON.stringify({ error: "does not compile: " + e.message })); process.exit(0); }
if (typeof f !== "function") { console.log(JSON.stringify({ error: "no function named " + fn })); process.exit(0); }
const out = [];
for (const [args, want] of tests) {
  try {
    const real = args.length === 1 && args[0] === "BIG" ? [big()] : args;
    out.push(norm(f(...JSON.parse(JSON.stringify(real)))) === norm(want));
  } catch { out.push(false); }
}
console.log(JSON.stringify({ results: out }));
`;

/** Runs code against a task's tests in a locked child process (4 s, 64 MB). */
function check(task, code, { timeoutMs = 4000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--permission", "--max-old-space-size=64", "-e", HARNESS, JSON.stringify([code, task.fn, task.tests])], { env: {}, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d).length > 20_000 && child.kill("SIGKILL"));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out.trim().split("\n").pop());
        if (j.error) return resolve({ passed: 0, total: task.tests.length, error: j.error });
        resolve({ passed: j.results.filter(Boolean).length, total: task.tests.length });
      } catch {
        resolve({ passed: 0, total: task.tests.length, error: "timed out or crashed" });
      }
    });
  });
}

/**
 * Benchmarks one model: every golden task, one try each. Stores the score and
 * reports each task to the router's measurements (kind "coding").
 */
async function benchModel({ provider, keyId, model, username = "bench" }) {
  const llm = require("./llm");
  const perf = require("./perf");
  const details = [];
  for (const task of GOLDEN) {
    let r;
    try {
      const res = await llm.ask({ kind: "coding", spec: { provider, keyId, model }, maxTries: 1, username, system: "You are taking a coding test. Reply with one JavaScript code block that defines the function. No explanations, no tests, no imports.", prompt: task.ask });
      r = await check(task, codeOf(res.text));
    } catch (e) {
      r = { passed: 0, total: task.tests.length, error: `no answer: ${String(e.message).slice(0, 160)}`, noAnswer: true };
    }
    details.push({ task: task.id, ...r });
    if (!r.noAnswer) await perf.recordRun({ vendor: provider, model, kind: "coding", ok: r.passed === r.total }).catch(() => {});
  }
  const answered = details.filter((d) => !d.noAnswer);
  const score = answered.length ? Math.round((answered.reduce((n, d) => n + d.passed / d.total, 0) / GOLDEN.length) * 100) : null;
  await run("INSERT INTO hive_bench(key_id, provider, model, score, details_json, ran_at) VALUES(?,?,?,?,?,?)", [keyId, provider, model, score, JSON.stringify(details), now()]);
  return { provider, model, score, details };
}

/** Latest score per model, best first. */
async function results() {
  const rows = await all("SELECT b.* FROM hive_bench b JOIN (SELECT provider, model, MAX(ran_at) AS ran_at FROM hive_bench GROUP BY provider, model) l ON l.provider=b.provider AND l.model=b.model AND l.ran_at=b.ran_at ORDER BY (b.score IS NULL), b.score DESC");
  return rows.map((r) => ({ provider: r.provider, model: r.model, keyId: r.key_id, score: r.score, ranAt: r.ran_at, details: JSON.parse(r.details_json || "[]") }));
}

/**
 * Weekly, free models only: benchmark up to `limit` working models on free
 * keys that haven't been measured in 7 days. Costs nothing on paid keys.
 */
async function benchFreeTick({ limit = 3 } = {}) {
  const keys = require("./keys");
  const { vendorOf } = require("./providers");
  const recent = new Set((await all("SELECT provider, model FROM hive_bench WHERE ran_at > ?", [now() - 7 * 86400_000])).map((r) => `${r.provider}|${r.model}`));
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0 AND status='ok'");
  const todo = [];
  for (const row of rows) {
    let v;
    try {
      v = vendorOf(keys.keyVendor(row));
    } catch {
      continue;
    }
    if (v.subscription || !(row.free_tier || v.freeTier)) continue;
    for (const m of keys.workingModels(row)) {
      const id = `${v.id}|${m}`;
      if (!recent.has(id) && !todo.some((t) => `${t.provider}|${t.model}` === id)) todo.push({ provider: v.id, keyId: row.id, model: m });
    }
  }
  const out = [];
  for (const t of todo.slice(0, limit)) out.push(await benchModel(t).catch((e) => ({ ...t, error: e.message })));
  return out;
}

module.exports = { GOLDEN, codeOf, check, benchModel, results, benchFreeTick };
