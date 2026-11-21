// AI test generation with verified expected outputs.
//
// 1. The model writes, for one problem: an input generator, a validator,
//    hand-picked edge cases, a brute-force reference and an efficient
//    reference (ai/modes.js → testgen_plan).
// 2. The generator runs in a sandbox and produces inputs of every size; the
//    validator throws out anything that breaks the format or constraints.
// 3. Both references run on the official samples first: one that gets a
//    sample wrong is discarded. Then they run on every generated input.
// 4. An expected output is kept only when it can be trusted:
//      verified   — both references agree
//      reference  — only the efficient one finished (large inputs), and it
//                   passed every official sample
//    Inputs where the references disagree are dropped and counted.
// Nothing here runs on the API host in production: every program goes
// through judge.runLang (remote sandboxes when JUDGE_MODE=remote).
const { runLang, normalizeOut } = require("./judge");

const SIZES = ["tiny", "small", "medium", "large"];
const MAX_TESTS = 60;
/** At least this many tests in a set, the problem's own examples included. */
const MIN_TOTAL = 10;
const MAX_INPUT_BYTES = 160 * 1024; // per input
const MAX_TOTAL_BYTES = 900 * 1024; // all inputs together (the judge takes 1 MB per run)
const JOB_BUDGET_S = 7; // one sandbox run stays well under the 10 s Python limit

const pyStr = (s) => JSON.stringify(String(s ?? ""));

/** Python that generates inputs: plan = [[size, seed], …]. Prints JSON. */
function generatorHarness(generator, validator, plan, edgeCases) {
  return `import sys, json, random, signal
sys.setrecursionlimit(100000)
class _Out(Exception): pass
def _alarm(*a): raise _Out()
signal.signal(signal.SIGALRM, _alarm)
G = {"__name__": "gen"}
V = {"__name__": "val"}
errors = []
try:
    exec(compile(${pyStr(generator)}, "generator", "exec"), G)
except BaseException as e:
    print(json.dumps({"fatal": "generator: " + repr(e)[:300]})); sys.exit(0)
has_valid = False
try:
    if ${pyStr(validator)}.strip():
        exec(compile(${pyStr(validator)}, "validator", "exec"), V)
        has_valid = callable(V.get("valid"))
except BaseException as e:
    errors.append("validator: " + repr(e)[:200])
def check(s):
    if not has_valid: return True
    try:
        signal.setitimer(signal.ITIMER_REAL, 1.0)
        return bool(V["valid"](s))
    except BaseException:
        return False
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
out = []
rejected = 0
for kind, s in [("edge", e) for e in json.loads(${pyStr(JSON.stringify(edgeCases))})]:
    if not s.endswith("\\n"): s += "\\n"
    if check(s): out.append({"size": "edge", "input": s})
    else: rejected += 1
for size, seed in json.loads(${pyStr(JSON.stringify(plan))}):
    try:
        signal.setitimer(signal.ITIMER_REAL, 2.0)
        s = G["gen"](random.Random(seed), size)
        signal.setitimer(signal.ITIMER_REAL, 0)
    except BaseException as e:
        signal.setitimer(signal.ITIMER_REAL, 0)
        errors.append(size + ": " + repr(e)[:160]); continue
    if not isinstance(s, str): s = str(s)
    if not s.endswith("\\n"): s += "\\n"
    if len(s.encode()) > ${MAX_INPUT_BYTES}: errors.append(size + ": input too large"); continue
    if check(s): out.append({"size": size, "input": s})
    else: rejected += 1
print(json.dumps({"tests": out, "rejected": rejected, "errors": errors[:8], "validated": has_valid}))
`;
}

/** Python that runs one reference program on many inputs. Prints JSON. */
function referenceHarness(program, inputs, perInputS, budgetS = JOB_BUDGET_S) {
  return `import sys, io, json, signal, time
sys.setrecursionlimit(1000000)
class _Out(Exception): pass
def _alarm(*a): raise _Out()
signal.signal(signal.SIGALRM, _alarm)
SRC = compile(${pyStr(program)}, "reference", "exec")
INPUTS = json.loads(sys.stdin.read())
REAL_OUT, REAL_IN = sys.stdout, sys.stdin
start = time.time()
res = []
for inp in INPUTS:
    left = ${budgetS} - (time.time() - start)
    if left < 0.2:
        res.append({"ok": False, "err": "budget"}); continue
    buf = io.StringIO()
    sys.stdin, sys.stdout = io.StringIO(inp), buf
    t0 = time.time()
    try:
        signal.setitimer(signal.ITIMER_REAL, min(${perInputS}, left))
        exec(SRC, {"__name__": "__main__"})
        ok, err = True, ""
    except SystemExit:
        ok, err = True, ""
    except _Out:
        ok, err = False, "timeout"
    except BaseException as e:
        ok, err = False, repr(e)[:200]
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        sys.stdin, sys.stdout = REAL_IN, REAL_OUT
    res.append({"ok": ok, "out": buf.getvalue()[:200000] if ok else "", "err": err, "ms": int((time.time() - t0) * 1000)})
print(json.dumps(res))
`;
}

async function runPython(code, stdin = "") {
  const r = await runLang(code, stdin, "python");
  if (r.verdict === "CE") throw new Error(`Python failed to start: ${String(r.stderr || "").slice(0, 300)}`);
  const text = String(r.stdout || "").trim();
  const last = text.slice(text.lastIndexOf("\n") + 1);
  try {
    return JSON.parse(last);
  } catch {
    throw new Error(`The sandbox returned no result${r.stderr ? `: ${String(r.stderr).slice(-300)}` : ""}`);
  }
}

/** Run a reference over many inputs, split into chunks that fit one sandbox run each. */
async function runReference(program, inputs, { perInputS, chunkBytes = 300 * 1024, parallel = 4 } = {}) {
  const chunks = [];
  let cur = [];
  let bytes = 0;
  for (const inp of inputs) {
    if (cur.length && (bytes + inp.length > chunkBytes || cur.length >= 12)) {
      chunks.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(inp);
    bytes += inp.length;
  }
  if (cur.length) chunks.push(cur);
  const out = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const i = next++;
      try {
        out[i] = await runPython(referenceHarness(program, chunks[i], perInputS), JSON.stringify(chunks[i]));
      } catch (e) {
        out[i] = chunks[i].map(() => ({ ok: false, err: e.message }));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, chunks.length) }, worker));
  return out.flat();
}

const same = (a, b) => normalizeOut(a) === normalizeOut(b);

/** Does a reference reproduce every official sample? */
async function checkOnSamples(program, samples) {
  if (!program.trim()) return { ok: false, passed: 0, total: samples.length, reason: "missing" };
  if (!samples.length) return { ok: true, passed: 0, total: 0, reason: "no samples to check against" };
  const res = await runReference(program, samples.map((s) => s.input), { perInputS: 3 });
  let passed = 0;
  let firstFail = null;
  let detail = null;
  res.forEach((r, i) => {
    if (r.ok && same(r.out, samples[i].output)) passed++;
    else if (!firstFail) {
      firstFail = r.ok ? "wrong answer on a sample" : r.err || "crashed";
      // What a fixer needs to see: the input, what was expected, what came out.
      detail = `Sample ${i + 1} input:\n${String(samples[i].input).slice(0, 800)}\nExpected output:\n${String(samples[i].output).slice(0, 400)}\n${r.ok ? `The program printed:\n${String(r.out).slice(0, 400)}` : `The program failed: ${String(r.err || "crashed").slice(0, 400)}`}`;
    }
  });
  return { ok: passed === samples.length, passed, total: samples.length, reason: firstFail, detail };
}

/** How many inputs of each size to ask for, given a requested count. */
function makePlan(count, seedBase = 1009) {
  const n = Math.max(4, Math.min(MAX_TESTS, Number(count) || 24));
  const share = { tiny: 0.3, small: 0.35, medium: 0.2, large: 0.15 };
  const plan = [];
  let seed = seedBase;
  for (const size of SIZES) {
    const k = Math.max(1, Math.round(n * share[size]));
    for (let i = 0; i < k; i++) plan.push([size, (seed += 7919)]);
  }
  return plan;
}

/**
 * Generate tests for a problem.
 * problem: { title, statement (plain text), samples: [{input, output}], limits }
 * deps.plan(problem) → the AI plan (ai/modes testgen_plan), injectable for tests.
 */
async function generateTests(problem, { count = 24, plan: planFn, repair = null, onProgress = () => {} } = {}) {
  const samples = (problem.samples || []).filter((s) => String(s.input || "").trim() || String(s.output || "").trim());
  onProgress("Reading the problem and writing a generator");
  const plan = await planFn(problem);
  if (!plan.generator.trim() && !plan.edgeCases.length) throw Object.assign(new Error("The AI didn't produce a generator — try again"), { status: 502 });

  onProgress("Generating inputs");
  // De-duplicate, drop the official samples, keep the total size bounded.
  const seen = new Set(samples.map((s) => normalizeOut(s.input)));
  let total = 0;
  let genStats = { generated: 0, rejected: 0, validated: false, errors: [] };
  const generate = async (n, seedBase) => {
    const gen = await runPython(generatorHarness(plan.generator, plan.validator, makePlan(n, seedBase), seedBase === 1009 ? plan.edgeCases : []));
    if (gen.fatal) throw Object.assign(new Error(`The generated generator didn't run (${gen.fatal}) — try again`), { status: 502 });
    genStats = { generated: genStats.generated + (gen.tests || []).length, rejected: genStats.rejected + (gen.rejected || 0), validated: genStats.validated || !!gen.validated, errors: [...genStats.errors, ...(gen.errors || [])].slice(0, 8) };
    const fresh = [];
    for (const t of gen.tests || []) {
      const k = normalizeOut(t.input);
      if (seen.has(k) || total + t.input.length > MAX_TOTAL_BYTES) continue;
      seen.add(k);
      total += t.input.length;
      fresh.push(t);
    }
    return fresh;
  };
  const inputs = await generate(count, 1009);
  if (!inputs.length) throw Object.assign(new Error("No valid inputs came out of the generator — try again"), { status: 502 });

  onProgress("Checking both reference solutions on the official samples");
  let [bruteCheck, solCheck] = await Promise.all([checkOnSamples(plan.brute || "", samples), checkOnSamples(plan.solution || "", samples)]);
  // One repair try for a reference that fails a sample: the model sees what it printed.
  if (repair && samples.length) {
    const fix = async (which, check) => {
      const program = await repair({ which, program: plan[which] || "", failure: check.detail || check.reason || "" }).catch(() => "");
      if (!program || !program.trim() || program === plan[which]) return check;
      const again = await checkOnSamples(program, samples);
      if (again.ok || again.passed > check.passed) plan[which] = program;
      return again.ok || again.passed > check.passed ? again : check;
    };
    const tries = [];
    if (!bruteCheck.ok && (plan.brute || "").trim()) tries.push(["brute", bruteCheck]);
    if (!solCheck.ok && (plan.solution || "").trim()) tries.push(["solution", solCheck]);
    if (tries.length) {
      onProgress("A reference got a sample wrong: asking the AI to fix it");
      const fixed = await Promise.all(tries.map(([w, c]) => fix(w, c)));
      tries.forEach(([w], k) => (w === "brute" ? (bruteCheck = fixed[k]) : (solCheck = fixed[k])));
    }
  }
  const useBrute = bruteCheck.ok && !!plan.brute.trim();
  const useSol = solCheck.ok && !!plan.solution.trim();
  if (!useBrute && !useSol) {
    throw Object.assign(new Error("Neither AI reference solution got the official samples right, so no expected outputs can be trusted. Try again, or add tests by hand."), {
      status: 422,
      details: { brute: bruteCheck, solution: solCheck },
    });
  }

  onProgress("Computing expected outputs");
  const tests = [];
  let disagreements = 0;
  let unresolved = 0;
  const expectedFor = async (batch) => {
    const [bruteRes, solRes] = await Promise.all([
      // The brute force only gets inputs it can finish; large ones are left to the efficient reference.
      useBrute ? runReference(plan.brute, batch.filter((t) => t.size !== "large").map((t) => t.input), { perInputS: 2 }) : Promise.resolve(null),
      useSol ? runReference(plan.solution, batch.map((t) => t.input), { perInputS: 4 }) : Promise.resolve(null),
    ]);
    let bi = 0;
    batch.forEach((t, i) => {
      const b = bruteRes && t.size !== "large" ? bruteRes[bi++] : null;
      const s = solRes ? solRes[i] : null;
      const bOk = b && b.ok;
      const sOk = s && s.ok;
      let expected = null;
      let confidence = null;
      if (bOk && sOk) {
        if (same(b.out, s.out)) {
          expected = s.out;
          confidence = "verified";
        } else if (plan.multipleAnswers) {
          // Several answers are accepted: either is right, but a plain diff can't judge them.
          expected = s.out;
          confidence = "reference";
        } else disagreements++;
      } else if (sOk) {
        expected = s.out; // brute force skipped (too large) or timed out
        confidence = "reference";
      } else if (bOk) {
        expected = b.out;
        confidence = "reference";
      } else unresolved++;
      if (expected != null) tests.push({ size: t.size, input: t.input, expected, confidence });
    });
  };
  await expectedFor(inputs);
  // Too few kept (duplicates, disagreements): more inputs with new seeds, small ones first.
  const want = Math.max(MIN_TOTAL - samples.length, 0);
  for (let round = 1; round <= 2 && tests.length < want; round++) {
    onProgress(`Only ${samples.length + tests.length} tests so far: making more`);
    const more = await generate(Math.max(8, (want - tests.length) * 2), 1009 + round * 104729).catch(() => []);
    if (!more.length) break;
    await expectedFor(more);
  }

  const order = { edge: 0, tiny: 1, small: 2, medium: 3, large: 4 };
  tests.sort((a, b) => order[a.size] - order[b.size]);
  const counters = {};
  for (const t of tests) {
    counters[t.size] = (counters[t.size] || 0) + 1;
    t.label = `AI · ${t.size} ${counters[t.size]}`;
  }
  // The official examples come first: they are tests too, with the problem's own answers.
  const official = samples.map((x, i) => ({ size: "sample", input: String(x.input).endsWith("\n") ? String(x.input) : `${x.input}\n`, expected: String(x.output), confidence: "official", label: `Example ${i + 1}` }));
  return {
    tests: [...official, ...tests],
    format: plan.format,
    notes: plan.notes,
    multipleAnswers: plan.multipleAnswers,
    stats: {
      generated: genStats.generated,
      rejectedByValidator: genStats.rejected,
      validated: genStats.validated,
      kept: tests.length,
      examples: official.length,
      verified: tests.filter((t) => t.confidence === "verified").length,
      disagreements,
      unresolved,
      references: { brute: bruteCheck, solution: solCheck },
      generatorErrors: genStats.errors,
    },
  };
}

module.exports = { MIN_TOTAL, generateTests, generatorHarness, referenceHarness, makePlan, checkOnSamples, runReference };
