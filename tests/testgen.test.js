// AI test generation, end to end with real Python runs (the AI plan is
// scripted): inputs are generated and validated, references are checked on
// the official samples, and an expected output is kept only when it can be
// trusted.
process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const { generateTests, makePlan } = require("../src/testgen");

let hasPython = true;
try {
  execSync("python3 --version", { stdio: "ignore" });
} catch {
  hasPython = false;
}

// Problem: first line n, second line n integers; print their maximum pair sum.
const problem = {
  title: "Max pair sum",
  statement: "Given n (2 ≤ n ≤ 2e5) integers, print the largest a_i + a_j with i < j.",
  samples: [
    { input: "3\n1 5 2\n", output: "7\n" },
    { input: "2\n-1 -1\n", output: "-2\n" },
  ],
};

const generator = `
def gen(rng, size):
    n = {"tiny": rng.randint(2, 4), "small": rng.randint(2, 8), "medium": rng.randint(50, 200), "large": rng.randint(2000, 5000)}[size]
    a = [rng.randint(-20, 20) for _ in range(n)]
    return f"{n}\\n{' '.join(map(str, a))}\\n"
`;
const validator = `
def valid(s):
    lines = s.split("\\n")
    n = int(lines[0]); a = list(map(int, lines[1].split()))
    return n >= 2 and len(a) == n
`;
const brute = `
n = int(input()); a = list(map(int, input().split()))
best = None
for i in range(n):
    for j in range(i + 1, n):
        if best is None or a[i] + a[j] > best: best = a[i] + a[j]
print(best)
`;
const solution = `
import sys
d = sys.stdin.read().split(); n = int(d[0]); a = sorted(map(int, d[1:1 + n]))
print(a[-1] + a[-2])
`;
const wrong = `
import sys
d = sys.stdin.read().split(); n = int(d[0]); a = sorted(map(int, d[1:1 + n]))
print(a[-1] * 2)
`;
// Right on both samples, wrong whenever the two largest values differ by more than one.
const subtlyWrong = `
import sys
d = sys.stdin.read().split(); n = int(d[0]); a = sorted(map(int, d[1:1 + n]))
print(a[-1] + a[-2] if a[-1] - a[-2] <= 3 else a[-1] + a[-1] - 1)
`;

const plan = (over = {}) => async () => ({ format: "n then n integers", multipleAnswers: false, generator, validator, edgeCases: ["2\n20 20\n", "2\n-20 20\n", "1\n5\n"], brute, solution, notes: "", ...over });

test("the plan asks for every size", () => {
  const p = makePlan(20);
  for (const size of ["tiny", "small", "medium", "large"]) assert.ok(p.some(([s]) => s === size), size);
});

test("correct references: tests of every size, all verified or reference-checked, invalid edge cases rejected", { skip: !hasPython }, async () => {
  const r = await generateTests(problem, { count: 16, plan: plan() });
  assert.ok(r.tests.length >= 10, `got ${r.tests.length}`);
  assert.equal(r.stats.disagreements, 0);
  assert.equal(r.stats.rejectedByValidator, 1, "the n = 1 edge case breaks the constraints");
  assert.ok(r.stats.references.brute.ok && r.stats.references.solution.ok);
  for (const t of r.tests) {
    const [n, ...a] = t.input.trim().split(/\s+/).map(Number);
    assert.equal(a.length, n);
    const s = [...a].sort((x, y) => x - y);
    assert.equal(t.expected.trim(), String(s[n - 1] + s[n - 2]), t.label);
    assert.ok(["verified", "reference"].includes(t.confidence));
    if (t.size !== "large") assert.equal(t.confidence, "verified", "small inputs are checked by both references");
  }
  assert.ok(r.tests.some((t) => t.size === "large" && t.confidence === "reference"));
  assert.ok(r.tests.some((t) => t.size === "edge"));
  assert.match(r.tests[0].label, /^AI · edge 1$/);
});

test("a reference that fails the official samples is never trusted", { skip: !hasPython }, async () => {
  const r = await generateTests(problem, { count: 8, plan: plan({ solution: wrong }) });
  assert.equal(r.stats.references.solution.ok, false);
  assert.ok(r.tests.length > 0);
  for (const t of r.tests) {
    const [n, ...a] = t.input.trim().split(/\s+/).map(Number);
    const s = [...a].sort((x, y) => x - y);
    assert.equal(t.expected.trim(), String(s[n - 1] + s[n - 2]), "only the brute force's answers are used");
  }
  assert.ok(!r.tests.some((t) => t.size === "large"), "without an efficient reference, large inputs get no expected output");
});

test("references that disagree drop the test instead of guessing", { skip: !hasPython }, async () => {
  const r = await generateTests(problem, { count: 20, plan: plan({ solution: subtlyWrong }) });
  assert.ok(r.stats.disagreements > 0);
  for (const t of r.tests.filter((x) => x.confidence === "verified")) {
    const [n, ...a] = t.input.trim().split(/\s+/).map(Number);
    const s = [...a].sort((x, y) => x - y);
    assert.equal(t.expected.trim(), String(s[n - 1] + s[n - 2]));
  }
});

test("no trustworthy reference: a clear error, no tests", { skip: !hasPython }, async () => {
  await assert.rejects(generateTests(problem, { count: 6, plan: plan({ solution: wrong, brute: wrong }) }), /Neither AI reference solution got the official samples right/);
});

test("a broken generator is reported, not hidden", { skip: !hasPython }, async () => {
  await assert.rejects(generateTests(problem, { count: 6, plan: plan({ generator: "def gen(rng, size) return 1", edgeCases: [] }) }), /generator didn't run/);
});

/* ── Short steps for small self-hosted models (routes/coding.js splitPlan) ── */
const { splitPlan, manyAnswers } = require("../src/routes/coding");
const { MODES } = require("../src/ai/modes");
const fence = (lang, code) => "```" + lang + "\n" + code.trim() + "\n```";

test("short steps: the replies a small model gives become a plan, a wrong brute force is repaired", { skip: !hasPython }, async () => {
  const asked = [];
  // What a small model replies, in plain code blocks (parsed by the real modes).
  const replies = {
    testgen_cases: `Here is the generator.\n${fence("python", generator + validator)}\nEdge cases:\n${fence("input", "2\n20 20")}\n${fence("input", "2\n-20 -20")}`,
    testgen_brute: fence("python", wrong), // wrong on a sample at first
    testgen_solution: "I think the answer is to sort.", // no code block and not code: left out
    testgen_fix: `Fixed:\n${fence("python", brute)}`,
  };
  const ask = async (mode, input) => {
    asked.push(mode);
    if (mode === "testgen_fix") assert.match(input.failure, /Expected output:\n7/, "the fixer sees what was expected");
    return MODES[mode].post(replies[mode], input);
  };
  const plan = await splitPlan(problem, ask);
  assert.deepEqual(asked.sort(), ["testgen_brute", "testgen_cases", "testgen_solution"]);
  assert.match(plan.generator, /def gen/);
  assert.match(plan.validator, /def valid/);
  assert.deepEqual(plan.edgeCases, ["2\n20 20\n", "2\n-20 -20\n"]);
  assert.equal(plan.solution.length > 0, true, "plain prose is kept as a program and then fails the samples");

  const r = await generateTests(problem, {
    count: 8,
    plan: async () => plan,
    repair: async ({ which, program, failure }) => (await ask("testgen_fix", { program, failure, which })).program,
  });
  assert.ok(asked.includes("testgen_fix"), "the failing reference was sent back to be fixed");
  assert.equal(r.stats.references.brute.ok, true, "the repaired brute force passes the samples");
  assert.ok(r.tests.length >= 4, `kept ${r.tests.length}`);
  for (const t of r.tests) {
    const [n, ...rest] = t.input.trim().split(/\s+/).map(Number);
    const a = rest.slice(0, n).sort((x, y) => x - y);
    assert.equal(t.expected.trim(), String(a[n - 1] + a[n - 2]), `expected output is right for ${JSON.stringify(t.input)}`);
  }
  assert.ok(r.tests.some((t) => t.size === "edge"), "the hand-written edge cases are in");
});

test("a reply with no code at all fails the step instead of passing junk on", () => {
  assert.throws(() => MODES.testgen_brute.post("```python\n```"), /unreadable/);
  assert.equal(MODES.testgen_solution.post("```python\nprint(1)\n```").program, "print(1)");
  assert.ok(manyAnswers("If there are several answers, print any of them."));
  assert.ok(!manyAnswers("Print the maximum sum."));
});
