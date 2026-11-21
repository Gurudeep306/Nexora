/*
  The NexoraGuru benchmark (owner's rule, 2026-11): a problem whose judge
  keeps its own tests private is checked on a fixed set of 10–12 tests — the
  official examples, AI corner cases and other AI tests whose answers two
  independent solutions agreed on (src/testgen.js). Passing every one counts
  as 100% solved; passing some earns that share, as with official tests.

  Only "official" and "verified" tests are used: an answer from one solution
  alone is never a benchmark answer.
*/
const MIN_BENCH = 10;
const MAX_AI = 12;
const ORDER = { edge: 0, tiny: 1, small: 2, medium: 3, large: 4 };

/** Choose the benchmark from a saved AI test set: examples, then corner cases, then a spread of sizes. */
function pickBenchmark(tests) {
  const list = Array.isArray(tests) ? tests : [];
  const official = list.filter((t) => t && t.confidence === "official");
  const verified = list.filter((t) => t && t.confidence === "verified").sort((a, b) => (ORDER[a.size] ?? 9) - (ORDER[b.size] ?? 9));
  // Corner cases first (up to half), then alternate sizes so big inputs are in too.
  const edges = verified.filter((t) => t.size === "edge").slice(0, Math.ceil(MAX_AI / 2));
  const rest = verified.filter((t) => t.size !== "edge");
  const bySize = {};
  for (const t of rest) (bySize[t.size] ||= []).push(t);
  const spread = [];
  const sizes = Object.keys(bySize).sort((a, b) => (ORDER[b] ?? 0) - (ORDER[a] ?? 0));
  while (spread.length < rest.length) {
    for (const s of sizes) if (bySize[s].length) spread.push(bySize[s].shift());
  }
  const ai = [...edges, ...spread].slice(0, MAX_AI);
  const picked = [...official, ...ai];
  return picked.length >= MIN_BENCH && ai.length >= 6 ? picked : null;
}

/** The benchmark for a platform problem, or null when none is ready yet. */
async function benchmarkFor(get, problemRowid) {
  const row = await get("SELECT tests FROM ai_test_sets WHERE problem_key=?", [`p:${Number(problemRowid)}`]).catch(() => null);
  if (!row) return null;
  let tests;
  try {
    tests = JSON.parse(row.tests || "[]");
  } catch {
    return null;
  }
  const picked = pickBenchmark(tests);
  if (!picked) return null;
  const counters = {};
  return picked.map((t) => {
    const kind = t.confidence === "official" ? "Example" : t.size === "edge" ? "Corner case" : "Benchmark";
    counters[kind] = (counters[kind] || 0) + 1;
    return { input: String(t.input), output: String(t.expected), label: `${kind} ${counters[kind]}` };
  });
}

module.exports = { pickBenchmark, benchmarkFor, MIN_BENCH, MAX_AI };
