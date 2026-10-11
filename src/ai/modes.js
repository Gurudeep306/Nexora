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
const sessionBlock = (i) =>
  P.data(
    "explainlab-session",
    `Title: ${str(i.title, 200)}\nDescription: ${str(i.description, 2000) || "No description"}\nKey moments: ${str(i.markers, 1500) || "none"}`,
  );
const problemBlock = (i, max = 5000) => P.data("problem", `Title: ${str(i.title, 200)}\n---\n${str(i.statement, max)}`);

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

  /* ── ExplainLab ── */
  el_summary: {
    model: "main",
    maxTokens: 500,
    temperature: 0.3,
    build: (i) => [
      { role: "system", content: P.EL_SYSTEM.summary },
      { role: "user", content: `${sessionBlock(i)}\nWrite a short plain-text paragraph summary (3-5 sentences) of this teaching session.` },
    ],
    post: (raw) => String(raw).trim(),
  },
  el_notes: {
    model: "main",
    maxTokens: 3000,
    temperature: 0.2,
    build: (i) => [
      { role: "system", content: P.EL_SYSTEM.notes },
      { role: "user", content: `${sessionBlock(i)}\nGenerate structured typed notes in HTML: key concepts, important formulas, examples, and common mistakes.` },
    ],
    post: (raw) => stripFences(raw).trim(),
  },
  el_full: {
    model: "main",
    maxTokens: 4000,
    temperature: 0.2,
    build: (i) => [
      { role: "system", content: P.EL_SYSTEM.full },
      {
        role: "user",
        content: `${sessionBlock(i)}\nCreate a comprehensive explanation in HTML with sections: Introduction, Prerequisites, Main Concept, Step-by-step breakdown, Examples and applications, Common mistakes, Summary and key takeaways, Practice suggestions.`,
      },
    ],
    post: (raw) => stripFences(raw).trim(),
  },
  el_quiz: {
    model: "main",
    json: true,
    maxTokens: 2000,
    temperature: 0.3,
    build: (i) => [
      { role: "system", content: P.EL_SYSTEM.quiz },
      {
        role: "user",
        content: `${sessionBlock(i)}\nGenerate 5 multiple-choice questions. JSON only: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}`,
      },
    ],
    post: (raw) => {
      const j = need(parseJson(raw), "Failed to parse quiz JSON");
      const list = Array.isArray(j) ? j : j.questions;
      if (!Array.isArray(list)) throw new AiError("Failed to parse quiz JSON", 502, "bad_output");
      return list.slice(0, 10);
    },
  },
  el_flashcards: {
    model: "main",
    json: true,
    maxTokens: 2000,
    temperature: 0.3,
    build: (i) => [
      { role: "system", content: P.EL_SYSTEM.flashcards },
      { role: "user", content: `${sessionBlock(i)}\nGenerate 10 revision flashcards. JSON only: {"cards":[{"front":"term or question","back":"definition or answer"}]}` },
    ],
    post: (raw) => {
      const j = need(parseJson(raw), "Failed to parse flashcards JSON");
      const list = Array.isArray(j) ? j : j.cards || j.flashcards;
      if (!Array.isArray(list)) throw new AiError("Failed to parse flashcards JSON", 502, "bad_output");
      return list.slice(0, 20);
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
};

module.exports = { MODES, parseJson, stripFences };
