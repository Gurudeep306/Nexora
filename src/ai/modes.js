/* One-shot task registry for the agent's runTask().

   Each mode: {
     model: 'main' | 'fast',
     json?: true            → response_format json_object (parsed with parseJson fallback)
     maxTokens, temperature, reasoning?, timeoutMs?, stop?, cache?,
     build(input) → messages,
     post(raw, input) → result (throw AiError for an unusable answer)
   } */
const P = require("./prompts");
const { AiError } = require("./groq");
const { extractAnimation } = require("./animation");

const str = (v, max) => String(v ?? "").slice(0, max);
const numbered = (code) =>
  String(code)
    .split("\n")
    .map((l, i) => `${i + 1}| ${l}`)
    .join("\n");

/** JSON.parse with a fallback that digs the first {...} or [...] out of chatty output. */
function parseJson(text) {
  const s = String(text || "").replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "");
  try {
    return JSON.parse(s);
  } catch {
    const shapes = [/\{[\s\S]*\}/, /\[[\s\S]*\]/];
    const brace = s.indexOf("{");
    const bracket = s.indexOf("[");
    // Try whichever shape opens first: a top-level array of objects starts with "[".
    if (bracket >= 0 && (brace < 0 || bracket < brace)) shapes.reverse();
    for (const re of shapes) {
      const m = s.match(re);
      if (!m) continue;
      try {
        return JSON.parse(m[0]);
      } catch {
        /* try the next shape */
      }
    }
  }
  return null;
}

const need = (j, what = "AI returned an unreadable answer — try again") => {
  if (j == null) throw new AiError(what, 502, "bad_output");
  return j;
};

/** Strip a code fence wrapper and a leading "Completion:" the model sometimes adds. */
function stripFences(text) {
  return String(text || "")
    .replace(/^\s*```[\w+#-]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .replace(/^Completion:\s*/i, "");
}

const replyLang = (uiLang) => (uiLang && uiLang.code !== "en" ? ` Write all human-readable strings in ${uiLang.name}.` : "");
const problemBlock = (i, max = 5000) => P.data("problem", `Title: ${str(i.title, 200)}\n---\n${str(i.statement, max)}`);

/** Every fenced block of one kind (```python, ```input …), in order. */
function fencedBlocks(text, kinds) {
  const out = [];
  const re = /```([\w+#-]*)[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    const tag = (m[1] || "").toLowerCase();
    if (!kinds || kinds.includes(tag)) out.push(m[2].replace(/\s+$/, ""));
  }
  return out;
}
/** The program in a reply: the first ```python block, else the whole reply when it has no fence. */
function programIn(text) {
  const blocks = fencedBlocks(text, ["python", "py", "python3", ""]);
  if (blocks.length) return blocks.sort((x, y) => y.length - x.length)[0].slice(0, 20000);
  return /```/.test(String(text || "")) ? "" : String(text || "").trim().slice(0, 20000);
}
const samplesBlock = (i, n = 3) =>
  i.samples?.length ? P.data("official-samples", i.samples.slice(0, n).map((s, k) => `Sample ${k + 1} input:\n${str(s.input, 1200)}\nSample ${k + 1} output:\n${str(s.output, 600)}`).join("\n\n"), 5000) : "";
const IO_RULES = "Read ALL of standard input (sys.stdin.read() or input()), print exactly the required output format, standard library only.";

const MODES = {
  /* ── Solve page ── */
  complete: {
    model: "fast",
    maxTokens: 150,
    temperature: 0.05,
    timeoutMs: 8000,
    stop: ["\n\n\n", "```"],
    cache: true,
    build: (i) => {
      const prefix = str(i.prefix, 4000).split("\n").slice(-40).join("\n");
      const suffix = str(i.suffix, 1500).split("\n").slice(0, 10).join("\n");
      return [
        { role: "system", content: P.COMPLETE_SYSTEM(str(i.language, 20)) },
        { role: "user", content: `${P.data("code-before-cursor", prefix)}\n[CURSOR]\n${P.data("code-after-cursor", suffix)}` },
      ];
    },
    post: (raw) => {
      let text = stripFences(raw).trimEnd();
      const lines = text.split("\n");
      if (lines.length > 3) text = lines.slice(0, 3).join("\n");
      return { text };
    },
  },

  fix: {
    think: true,
    model: "main",
    maxTokens: 2048,
    temperature: 0,
    build: (i) => [
      { role: "system", content: P.FIX_SYSTEM(str(i.language, 20)) },
      { role: "user", content: `${P.data("code", str(i.code, 6000))}\n${P.data("error", str(i.error || "Compilation error", 800))}` },
    ],
    post: (raw) => {
      const code = stripFences(raw).trim();
      if (!code || code === "NO_FIX") return { code: null, reason: "AI could not safely fix this code" };
      return { code };
    },
  },

  /* One-shot tutor answer (legacy pages without streaming). */
  tutor: {
    model: "main",
    maxTokens: 1024,
    temperature: 0.5,
    build: (i) => {
      const history = (Array.isArray(i.history) ? i.history : [])
        .slice(-10)
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role, content: str(m.content, 1500) }));
      return [
        { role: "system", content: `${P.TUTOR_ONE_SHOT}\n\n${P.data("problem", str(i.statement, 4000) || "No problem statement available")}` },
        ...history,
        { role: "user", content: str(i.question, 2000) },
      ];
    },
    post: (raw) => String(raw).trim(),
  },

  /* ── Translation ── */
  translate: {
    model: "main",
    maxTokens: 4000,
    temperature: 0.1,
    build: (i) => [
      { role: "system", content: P.TRANSLATE_SYSTEM(i.source || {}, i.target || {}) },
      { role: "user", content: P.data("statement", str(i.text, 5000), 5000) },
    ],
    post: (raw) =>
      String(raw)
        .replace(/^```(?:html)?\s*|```\s*$/g, "")
        .replace(/^\s*<data[^>]*>\s*|\s*<\/data>\s*$/g, ""),
  },

  detect_lang: {
    model: "fast",
    json: true,
    maxTokens: 60,
    temperature: 0,
    timeoutMs: 10000,
    cache: true,
    build: (i) => [
      { role: "system", content: P.DETECT_SYSTEM },
      { role: "user", content: P.data("text", str(i.text, 800)) },
    ],
    post: (raw) => {
      const j = parseJson(raw);
      if (!j?.code) return null;
      return { code: str(j.code, 12), confidence: Number(j.confidence) || 0.7 };
    },
  },

  /* ── Coding coach (hints only) ── */
  coach_insight: {
    model: "main",
    json: true,
    maxTokens: 1000,
    temperature: 0.2,
    reasoning: "medium",
    build: (i) => [
      { role: "system", content: P.COACH_RULES + replyLang(i.uiLang) },
      {
        role: "user",
        content: `${problemBlock(i)}\n${P.data("student-code", `${str(i.language, 20)} (line numbers added):\n${numbered(str(i.code, 12000))}`, 14000)}

Read the code carefully and analyse what the student is actually doing. Reply JSON only:
{"summary": "one crisp sentence: what this code currently does or tries to do",
 "approach": "short standard name of the technique or 'unclear'",
 "time": "tight Big-O time of the code AS WRITTEN",
 "space": "tight Big-O extra memory",
 "fits": true|false|null (would it pass typical limits, ~1e8 ops/sec? null if constraints unknown),
 "progress": 0-100,
 "issues": [{"line": <int>, "severity": "error"|"warning"|"info", "message": "one specific, actionable sentence about a real bug or risk you can point to a line for"}],
 "edgeCases": ["a concrete input case this code likely mishandles"],
 "nextStep": "one concrete hint for the most important next step (no full code)"}
Keep every string short. An empty list beats a weak entry.`,
      },
    ],
    post: (raw) => {
      const j = need(parseJson(raw));
      j.issues = Array.isArray(j.issues) ? j.issues.slice(0, 8) : [];
      j.edgeCases = Array.isArray(j.edgeCases) ? j.edgeCases.slice(0, 6) : [];
      return j;
    },
  },

  coach_tests: {
    think: true,
    model: "main",
    json: true,
    maxTokens: 1600,
    temperature: 0.2,
    reasoning: "high",
    timeoutMs: 90000,
    build: (i) => [
      { role: "system", content: P.COACH_RULES },
      {
        role: "user",
        content: `${problemBlock(i)}

Design 4 small, tricky test cases that STRESS this problem's logic. Follow the exact input format and every stated constraint precisely — an input that violates the format is useless.
Cover different edge shapes: minimum size, all-equal values, near-limit values, and any special structure the statement hints at.
Compute the expected output by hand-tracing the rules. Only fill "expected" when you are confident it is exactly right; otherwise use "". Never guess.
Reply JSON only: {"tests": [{"label": "2-3 word name", "input": "exact stdin with real newlines", "expected": "exact stdout or empty", "why": "one short sentence"}]}`,
      },
    ],
    post: (raw) => {
      const j = parseJson(raw);
      const tests = Array.isArray(j?.tests) ? j.tests.slice(0, 6) : [];
      return tests
        .filter((t) => typeof t?.input === "string" && t.input.length < 5000)
        .map((t) => ({ label: str(t.label || "AI test", 40), input: t.input, expected: String(t.expected ?? ""), why: String(t.why || "") }));
    },
  },

  coach_explain: {
    model: "main",
    maxTokens: 800,
    temperature: 0.2,
    reasoning: "medium",
    build: (i) => {
      const f = i.failing || null;
      const failing = f
        ? P.data(
            "failing-case",
            `INPUT:\n${str(f.input, 1500)}\nEXPECTED:\n${str(f.expected, 800)}\nGOT:\n${str(f.actual, 800)}\nSTDERR:\n${str(f.stderr, 800)}`,
          )
        : "";
      return [
        { role: "system", content: P.COACH_RULES + replyLang(i.uiLang) },
        {
          role: "user",
          content: `${problemBlock(i, 3000)}\n${P.data("student-code", `${str(i.language, 20)}:\n${str(i.code, 12000)}`, 14000)}\nVerdict: ${str(i.verdict || "unknown", 40)}\n${failing}

Explain this verdict so the student can fix it themselves. Use exactly this markdown structure:
**What happened** — one sentence on what the verdict means here.
**Where** — 1-3 bullets pointing at the specific line(s) (L##) and the exact value that goes wrong; trace the failing input if given.
**Why** — one or two sentences on the root cause.
**Try this** — one concrete hint for the fix. Do NOT give corrected code.`,
        },
      ];
    },
    post: (raw) => String(raw).trim(),
  },

  coach_ask: {
    model: "main",
    maxTokens: 800,
    temperature: 0.4,
    reasoning: "medium",
    build: (i) => [
      {
        role: "system",
        content: `${P.COACH_RULES}${replyLang(i.uiLang)} Answer the question directly first, then only the detail that helps. Clean markdown. Typically under 150 words.`,
      },
      {
        role: "user",
        content: `${problemBlock(i, 3500)}\n${P.data("student-code", `${str(i.language, 20)}:\n${str(i.code, 12000)}`, 14000)}\nQuestion: ${str(i.question, 1500)}`,
      },
    ],
    post: (raw) => String(raw).trim(),
  },

  /* ── AI test generator: an input generator and two independent references ──
     The server runs them; an expected output is kept only when the
     references pass the official samples and agree (see src/testgen.js). */
  testgen_plan: {
    think: true,
    model: "main",
    json: true,
    maxTokens: 7000,
    temperature: 0.2,
    reasoning: "high",
    timeoutMs: 150000,
    build: (i) => [
      {
        role: "system",
        content:
          "You are a meticulous competitive-programming problem setter. You write test data generators and reference solutions that are exactly faithful to a problem's input format and constraints. You never guess: if a constraint is unclear you stay well inside the safe range.",
      },
      {
        role: "user",
        content: `${problemBlock(i, 9000)}
${i.samples?.length ? P.data("official-samples", i.samples.slice(0, 4).map((s, k) => `Sample ${k + 1} input:\n${str(s.input, 1500)}\nSample ${k + 1} output:\n${str(s.output, 800)}`).join("\n\n"), 7000) : ""}

Write Python 3 code (standard library only) for testing solutions to this problem.

1. "generator": defines gen(rng, size) returning ONE complete stdin input as a string ending with "\\n". rng is a random.Random; size is one of "tiny", "small", "medium", "large". tiny/small must keep every dimension small (n ≤ 8 and values ≤ 20 where possible) so a brute force finishes instantly; medium ≈ 1e3; large: at most 2e4 elements and under 150 KB of text. If the input has T test cases, keep T small (≤ 3 for medium/large). Obey EVERY constraint: guarantees in the statement (distinct values, sorted, connected graph, valid tree, answer exists…) must hold in every input.
2. "validator": defines valid(s) returning True when s satisfies the input format and constraints (scaled down as above is fine). Be strict.
3. "edge_cases": 4–10 hand-written complete inputs for boundary situations: minimum sizes, all equal values, extremes, special structures the statement hints at. Each must be valid.
4. "brute": a program that reads ALL of stdin (sys.stdin.read() or input(); never sys.stdin.buffer) and prints the answer, written as the most obviously correct method — exhaustive search, simulation — speed does not matter.
5. "solution": an independent efficient program solving the problem the intended way, same I/O rules. Do not copy the brute force.
Both programs must print in exactly the required output format. If the problem accepts any of several correct answers (e.g. "print any"), set "multiple_answers": true.

Reply with JSON only:
{"format": "one sentence describing the input", "multiple_answers": false, "generator": "…", "validator": "…", "edge_cases": ["…"], "brute": "…", "solution": "…", "notes": "anything a tester should know"}`,
      },
    ],
    post: (raw) => {
      const j = need(parseJson(raw), "The AI's test plan was unreadable — try again");
      const code = (v) => (typeof v === "string" ? stripFences(v).slice(0, 20000) : "");
      return {
        format: str(j.format, 400),
        multipleAnswers: !!j.multiple_answers,
        generator: code(j.generator),
        validator: code(j.validator),
        edgeCases: (Array.isArray(j.edge_cases) ? j.edge_cases : []).filter((x) => typeof x === "string" && x.length < 20000).slice(0, 12),
        brute: code(j.brute),
        solution: code(j.solution),
        notes: str(j.notes, 600),
      };
    },
  },
  /* Test generation in short steps, in plain code blocks: what small,
     self-hosted models do reliably (one big JSON reply with code inside is
     not). The three steps run at the same time; see routes/coding.js. */
  testgen_cases: {
    model: "main",
    think: true,
    maxTokens: 1600,
    temperature: 0.2,
    timeoutMs: 120000,
    build: (i) => [
      { role: "system", content: "You are a careful competitive-programming problem setter. You write test inputs that obey every constraint of the problem exactly." },
      {
        role: "user",
        content: `${problemBlock(i, 6000)}
${samplesBlock(i)}

1. In one \`\`\`python block, define gen(rng, size): it returns ONE complete stdin input (a string ending with "\\n"). rng is a random.Random; size is "tiny", "small", "medium" or "large". tiny/small: every dimension ≤ 8 and values ≤ 20 where possible; medium about 1000; large at most 20000 elements and under 150 KB. If there are T test cases, keep T ≤ 3 for medium and large. Every guarantee in the statement (distinct, sorted, connected, an answer exists…) must hold. You may also define valid(s) returning True when s is a correct input.
2. Then 4 to 8 boundary inputs (smallest sizes, all equal values, extremes), each one complete input in its own \`\`\`input block.`,
      },
    ],
    post: (raw) => {
      const code = programIn(raw);
      const edgeCases = fencedBlocks(raw, ["input", "text", "txt", "stdin", "plaintext"]).filter((x) => x.trim() && x.length < 20000).slice(0, 12).map((x) => `${x}\n`);
      need(code || edgeCases.length ? true : null, "The AI's generator was unreadable — try again");
      return { generator: code, validator: /\bdef\s+valid\s*\(/.test(code) ? code : "", edgeCases };
    },
  },
  testgen_brute: {
    model: "main",
    think: true,
    maxTokens: 1200,
    temperature: 0.1,
    timeoutMs: 120000,
    build: (i) => [
      { role: "system", content: "You write the most obviously correct solution to a problem: exhaustive search or direct simulation. Speed does not matter; correctness does." },
      { role: "user", content: `${problemBlock(i, 6000)}\n${samplesBlock(i)}\n\nWrite a brute-force Python 3 program for this problem. ${IO_RULES} It must reproduce every sample output exactly. Reply with one \`\`\`python block.` },
    ],
    post: (raw) => ({ program: need(programIn(raw) || null, "The AI's reference solution was unreadable — try again") }),
  },
  testgen_solution: {
    model: "main",
    think: true,
    maxTokens: 1400,
    temperature: 0.1,
    timeoutMs: 120000,
    build: (i) => [
      { role: "system", content: "You are a strong competitive programmer. You solve problems the intended, efficient way." },
      { role: "user", content: `${problemBlock(i, 6000)}\n${samplesBlock(i)}\n${i.limits ? `Limits: ${str(i.limits, 80)}\n` : ""}\nWrite an efficient Python 3 solution that fits the limits. ${IO_RULES} Reply with one \`\`\`python block.` },
    ],
    post: (raw) => ({ program: programIn(raw) }),
  },
  testgen_fix: {
    model: "main",
    think: true,
    maxTokens: 1200,
    temperature: 0.1,
    timeoutMs: 120000,
    build: (i) => [
      { role: "system", content: "You fix programs. You read the failure carefully and change only what is wrong." },
      {
        role: "user",
        content: `${problemBlock(i, 5000)}\n${samplesBlock(i)}\n\nThis Python program should solve the problem but fails a sample:\n${P.data("program", str(i.program, 12000))}\n${P.data("failure", str(i.failure, 2000))}\n\nFix it. ${IO_RULES} Reply with the whole corrected program in one \`\`\`python block.`,
      },
    ],
    post: (raw) => ({ program: programIn(raw) }),
  },

  /* ── Code analysis: everything about the student's code ── */
  code_analysis: {
    think: true,
    model: "main",
    json: true,
    maxTokens: 3500,
    temperature: 0.1,
    reasoning: "high",
    timeoutMs: 120000,
    build: (i) => [
      { role: "system", content: P.COACH_RULES + replyLang(i.uiLang) },
      {
        role: "user",
        content: `${problemBlock(i, 6000)}
${i.limits ? `Limits: ${str(i.limits, 120)}` : ""}
${P.data("student-code", `${str(i.language, 20)} (line numbers added):\n${numbered(str(i.code, 16000))}`, 18000)}
${i.metrics ? P.data("measured-metrics", JSON.stringify(i.metrics).slice(0, 1500), 2000) : ""}

Analyse this code exactly as written (not the solution you would write). Be precise, give line numbers (L##), keep every string short. Reply with JSON only:
{"summary": "what the code does, one sentence",
 "approach": "standard technique name",
 "time": {"worst": "Big-O with the problem's variables", "average": "Big-O or same", "best": "Big-O or same", "derivation": ["2-5 short steps: which loops/recursion multiply to give the bound, with L## refs"]},
 "space": {"auxiliary": "Big-O extra memory", "total": "including input", "derivation": ["1-3 short steps"]},
 "parts": [{"name": "function or block", "lines": "L10-L24", "time": "Big-O", "note": "short"}],
 "hotspot": {"lines": "L##-L##", "why": "where most time goes"},
 "fits": {"verdict": "fits" | "tight" | "too_slow" | "unknown", "operations": "estimated operations at max constraints, e.g. ~4e8", "why": "one sentence vs ~1e8 simple ops/sec"},
 "memoryFit": {"verdict": "fits" | "tight" | "too_much" | "unknown", "estimate": "e.g. ~80 MB", "why": "one sentence"},
 "correctness": [{"line": 0, "severity": "error" | "warning" | "info", "issue": "a concrete bug or risk: overflow, off-by-one, uninitialised, wrong edge handling, recursion depth, precision"}],
 "edgeCases": [{"input": "short concrete case", "risk": "what goes wrong"}],
 "quality": {"score": 0-100, "readability": "one sentence", "notes": ["naming, structure, duplication, dead code"]},
 "optimizations": [{"idea": "one concrete improvement (no full code)", "gain": "e.g. O(n^2) → O(n log n)"}],
 "dataStructures": ["each data structure used and why it matters"],
 "language": ["language-specific advice: fast I/O, integer types, container costs"]}
An empty list beats a weak entry.`,
      },
    ],
    post: (raw) => {
      const j = need(parseJson(raw), "The analysis came back unreadable — try again");
      const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
      return {
        summary: str(j.summary, 300),
        approach: str(j.approach, 80),
        time: { worst: str(j.time?.worst, 60), average: str(j.time?.average, 60), best: str(j.time?.best, 60), derivation: arr(j.time?.derivation, 6).map((x) => str(x, 240)) },
        space: { auxiliary: str(j.space?.auxiliary, 60), total: str(j.space?.total, 60), derivation: arr(j.space?.derivation, 4).map((x) => str(x, 240)) },
        parts: arr(j.parts, 10).map((p) => ({ name: str(p?.name, 60), lines: str(p?.lines, 20), time: str(p?.time, 40), note: str(p?.note, 160) })),
        hotspot: j.hotspot ? { lines: str(j.hotspot.lines, 20), why: str(j.hotspot.why, 200) } : null,
        fits: { verdict: ["fits", "tight", "too_slow", "unknown"].includes(j.fits?.verdict) ? j.fits.verdict : "unknown", operations: str(j.fits?.operations, 40), why: str(j.fits?.why, 240) },
        memoryFit: { verdict: ["fits", "tight", "too_much", "unknown"].includes(j.memoryFit?.verdict) ? j.memoryFit.verdict : "unknown", estimate: str(j.memoryFit?.estimate, 40), why: str(j.memoryFit?.why, 240) },
        correctness: arr(j.correctness, 10).map((c) => ({ line: Number(c?.line) || 0, severity: ["error", "warning", "info"].includes(c?.severity) ? c.severity : "info", issue: str(c?.issue, 260) })),
        edgeCases: arr(j.edgeCases, 8).map((e) => ({ input: str(e?.input, 200), risk: str(e?.risk, 200) })),
        quality: { score: Math.max(0, Math.min(100, Math.round(Number(j.quality?.score) || 0))), readability: str(j.quality?.readability, 240), notes: arr(j.quality?.notes, 6).map((x) => str(x, 200)) },
        optimizations: arr(j.optimizations, 6).map((o) => ({ idea: str(o?.idea, 260), gain: str(o?.gain, 80) })),
        dataStructures: arr(j.dataStructures, 8).map((x) => str(x, 200)),
        language: arr(j.language, 6).map((x) => str(x, 220)),
      };
    },
  },

  /* ── Problem finder ── */
  find_problems_intent: {
    model: "main",
    json: true,
    maxTokens: 420,
    temperature: 0.1,
    reasoning: "medium",
    cache: true,
    build: (i) => [
      { role: "system", content: P.FIND_INTENT_SYSTEM((i.platforms || []).slice(0, 20), (i.vocab || []).slice(0, 200)) },
      { role: "user", content: P.data("request", str(i.query, 500)) },
    ],
    post: (raw) => parseJson(raw) || {},
  },

  find_problems_rank: {
    model: "main",
    json: true,
    maxTokens: 1200,
    temperature: 0.1,
    build: (i) => [
      { role: "system", content: P.FIND_RANK_SYSTEM(i.want || 12) },
      { role: "user", content: `${P.data("request", str(i.query, 500))}\n${P.data("problems", str(i.listing, 6000), 6000)}` },
    ],
    post: (raw) => parseJson(raw),
  },

  /* Animation of an algorithm or a code snippet (no chat thread). */
  animate: {
    model: "main",
    maxTokens: 2048,
    temperature: 0.2,
    build: (i) => [
      { role: "system", content: P.chatSystem({ animate: true, toolsEnabled: false }) },
      { role: "user", content: `Animate this:\n${P.data("code", str(i.topic || i.code, 3000))}` },
    ],
    post: (raw) => {
      const out = extractAnimation(raw);
      if (!out.visualization) throw new AiError("Could not generate animation frames — try rephrasing", 502, "bad_output");
      return out;
    },
  },

  /* ── Studio authoring (full content allowed: the author is the teacher) ── */
  studio_author: {
    model: "main",
    maxTokens: 2500,
    temperature: 0.15,
    build: (i) => [
      { role: "system", content: P.STUDIO_SYSTEM[i.type] || P.STUDIO_SYSTEM.description },
      { role: "user", content: P.data("author-request", str(i.prompt, 6000), 6000) },
    ],
    post: (raw, i) => {
      const text = stripFences(raw).trim();
      if (i.type === "quiz" || i.type === "hints") {
        const j = parseJson(text);
        if (j) return { text, json: j };
      }
      return { text };
    },
  },

  /* ── GATE: narrative on top of the rule-based attempt analysis ── */
  gate_narrative: {
    model: "main",
    maxTokens: 450,
    temperature: 0.4,
    build: (i) => [
      { role: "system", content: P.GATE_NARRATIVE_SYSTEM },
      { role: "user", content: P.data("attempt-analysis", JSON.stringify(i.analysis ?? {}).slice(0, 5000), 5000) },
    ],
    post: (raw) => String(raw).trim(),
  },

  /* Topics of one problem (src/topics.js), only when the tags and the text
     leave it unsure. Public statement text only — nothing about any user. */
  topic_classify: {
    model: "main",
    json: true,
    maxTokens: 120,
    temperature: 0,
    cache: true,
    build: (i) => [
      {
        role: "system",
        content: `${P.DATA_RULE}\nYou label competitive-programming problems by topic. Choose 1 to 3 topics from this list only, the ones a strong solver would use to solve it (not words that merely appear in the story). Answer JSON only: {"topics":["id", …]} using the ids exactly as listed.\n${(i.topics || []).slice(0, 80).join("\n")}`,
      },
      { role: "user", content: problemBlock(i, 4000) },
    ],
    post: (raw) => {
      const j = parseJson(raw);
      const list = Array.isArray(j) ? j : j && Array.isArray(j.topics) ? j.topics : [];
      return list.map(String).slice(0, 3);
    },
  },
};

module.exports = { MODES, parseJson, stripFences };
