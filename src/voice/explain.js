/*
  Explain-back (docs/voice/BLUEPRINT.md §2 row 3, §3 row 8): after Accepted,
  the student explains their solution aloud (or types it), and it is graded.

  Two parts, so a model can't pass a student on its own say-so:
  1. A trace question on a random small input from the problem's own tests:
     "without running it, what does your code print?" Checked exactly, no AI.
  2. A five-part rubric (idea, approach, why it works, complexity, edge
     cases), 0–2 each, scored by a free model. Every point must quote the
     student's own words; a quote that isn't in what they said scores 0.

  A pass counts towards Nexus mastery (like one more solved problem in its
  skills, once per problem) only when it is unaided: no Guru hint on this
  problem in the 24 hours before, Guru silent during it, and a trace question
  was asked. Otherwise it is practice and says why.
*/
const crypto = require("crypto");
const agent = require("../ai/agent");
const guru = require("./guru");
const { accepted } = require("./build");
const { compareOutput } = require("../judge");

const MINUTES = 15;
const HINT_WINDOW_MS = 24 * 3600 * 1000;
const PASS_TOTAL = 7;

const RUBRIC = [
  { id: "idea", label: "The key idea", ask: "the key insight that makes the solution work" },
  { id: "approach", label: "The steps", ask: "the steps of the algorithm in order" },
  { id: "why", label: "Why it’s correct", ask: "why it gives the right answer (an invariant, a proof idea, or why no case is missed)" },
  { id: "complexity", label: "Time and space", ask: "the time and space complexity, with a reason" },
  { id: "edges", label: "Edge cases", ask: "edge cases or limits it handles (empty input, one element, overflow, duplicates…)" },
];

const SYSTEM = `You grade a student's spoken explanation of their own accepted solution to a programming problem.

Score each criterion 0, 1 or 2:
${RUBRIC.map((r) => `- ${r.id}: ${r.ask}`).join("\n")}
2 = clearly and correctly explained; 1 = mentioned but vague or partly wrong; 0 = missing or wrong.

Rules (strict):
- Grade ONLY what the student said. Do not give credit for things in the reference or the code that the student did not say.
- For every score above 0, copy a short exact quote (3 to 15 words) from the student's words that earns it. Copy it character for character. If you cannot quote it, the score is 0.
- The explanation may mix English and Hindi; that is fine.
- Output ONLY JSON, no code fences: {"scores":{"idea":{"score":0,"quote":""},"approach":{...},"why":{...},"complexity":{...},"edges":{...}},"feedback":"one or two sentences: the most useful thing to add next time"}`;

/* ── pure parts (tests/voice-explain.test.js) ── */

const fold = (s) => String(s || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Does the quote really come from what the student said? */
function quoted(quote, transcript) {
  const q = fold(quote);
  if (q.split(" ").filter(Boolean).length < 3) return false;
  return ` ${fold(transcript)} `.includes(` ${q} `);
}

/** The model's reply → checked scores. Scores without a real quote become 0. */
function checkScores(reply, transcript) {
  let data;
  try {
    data = JSON.parse(String(reply || "").replace(/```(?:json)?|```/g, "").trim().replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
  } catch {
    return null;
  }
  if (!data || typeof data.scores !== "object") return null;
  const criteria = RUBRIC.map((r) => {
    const s = data.scores[r.id] || {};
    let score = Math.max(0, Math.min(2, Math.round(Number(s.score) || 0)));
    const quote = typeof s.quote === "string" ? s.quote.trim().slice(0, 200) : "";
    if (score > 0 && !quoted(quote, transcript)) score = 0;
    return { id: r.id, label: r.label, score, quote: score > 0 ? quote : "" };
  });
  const feedback = typeof data.feedback === "string" ? data.feedback.trim().slice(0, 400) : "";
  return { criteria, total: criteria.reduce((n, c) => n + c.score, 0), feedback };
}

/** A small input to trace by hand, chosen at random from the problem's tests. */
function pickVariant(cases, rand = Math.random) {
  const small = (cases || []).filter((c) => {
    const inp = String(c.input ?? "");
    const out = String(c.output ?? c.expected_output ?? "").trim();
    return inp.trim() && out && inp.length <= 160 && out.length <= 60 && inp.split("\n").filter(Boolean).length <= 8;
  });
  if (!small.length) return null;
  const c = small[Math.floor(rand() * small.length)];
  return { input: String(c.input), expected: String(c.output ?? c.expected_output).trim() };
}

/** Did they pass, and does it count? */
function verdict({ total, criteria, variant, variantOk, aided }) {
  const complexity = criteria.find((c) => c.id === "complexity")?.score ?? 0;
  const passed = total >= PASS_TOTAL && complexity >= 1 && (!variant || variantOk);
  let why = "";
  if (!passed) why = total < PASS_TOTAL ? `It needs ${PASS_TOTAL} of 10 to pass.` : complexity < 1 ? "A pass needs the time and space complexity." : "The trace answer didn’t match.";
  else if (aided) why = "Passed, but Guru helped on this problem in the last day, so it’s practice. Try again tomorrow without help to count it.";
  else if (!variant) why = "Passed, but this problem has no small test to trace, so it’s practice.";
  return { passed, counted: passed && !aided && !!variant, why };
}

/* ── state: one open explain-back per student, kept briefly in memory ── */

const sessions = new Map(); // token → session
const active = new Map(); // username → { item, until }

function prune() {
  const now = Date.now();
  for (const [t, s] of sessions) if (s.until < now) sessions.delete(t);
  for (const [u, a] of active) if (a.until < now) active.delete(u);
}

/** Is this student in the middle of an explain-back on this item? (Guru stays quiet.) */
function explaining(username, item) {
  const a = active.get(username);
  return !!a && a.until > Date.now() && (!item || a.item === String(item));
}

async function ensureTables(db) {
  await db.run(`CREATE TABLE IF NOT EXISTS voice_explain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    item TEXT NOT NULL,
    tags TEXT DEFAULT '',
    score INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    counted INTEGER NOT NULL,
    detail TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  )`);
  await db.run("CREATE INDEX IF NOT EXISTS idx_voice_explain_user ON voice_explain(username, counted)");
  await db.run(`CREATE TABLE IF NOT EXISTS voice_hint_log (
    username TEXT NOT NULL,
    item TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (username, item)
  )`);
}

/** Guru gave a hint on this problem: remember when (it makes an explain-back "aided"). */
async function logHint(db, username, problemId) {
  const item = String(problemId || "").slice(0, 100);
  if (!username || !item) return;
  await db.run("INSERT INTO voice_hint_log(username, item, at) VALUES(?,?,?) ON CONFLICT(username, item) DO UPDATE SET at=excluded.at", [username, item, Date.now()]);
}

/** The problem's title, tags, reference editorial and test cases. */
async function problemInfo(db, problem) {
  if (problem?.kind === "learn") {
    // eslint-disable-next-line global-require
    const p = require("../routes/learn").findProblem(String(problem.id));
    if (!p) return null;
    return { title: p.title, tags: (p.tags || []).join(","), reference: String(p.editorial || "").slice(0, 6000), cases: [...(p.tests || []), ...(p.samples || [])] };
  }
  if (problem?.kind === "platform") {
    const id = Number(problem.id);
    const p = await db.get("SELECT id, title, tags FROM problems WHERE id=?", [id]);
    if (!p) return null;
    const st = await db.get("SELECT samples FROM problem_statements WHERE problem_rowid=?", [id]);
    let samples = [];
    try {
      samples = JSON.parse(st?.samples || "[]");
    } catch {
      samples = [];
    }
    return { title: p.title, tags: String(p.tags || ""), reference: "", cases: Array.isArray(samples) ? samples : [] };
  }
  return null;
}

/** Start: check Accepted, pick the trace input, silence Guru on this problem. */
async function startExplain({ db, user, problem, code, language }) {
  prune();
  const username = user?.username || "";
  if (!(await accepted(db, username, problem))) {
    return { ok: false, locked: true, say: "Explain-back opens once your solution is Accepted." };
  }
  const info = await problemInfo(db, problem);
  if (!info) return { ok: false, say: "I can’t find this problem." };
  const item = `${problem.kind}:${problem.id}`;
  const variant = pickVariant(info.cases);
  const token = crypto.randomBytes(16).toString("hex");
  const until = Date.now() + MINUTES * 60 * 1000;
  sessions.set(token, { username, item, hintItem: String(problem.id), started: Date.now(), until, variant, info, code: String(code || "").slice(0, 12000), language: String(language || "") });
  active.set(username, { item: String(problem.id), until });
  return {
    ok: true,
    token,
    minutes: MINUTES,
    title: info.title,
    rubric: RUBRIC.map((r) => ({ id: r.id, label: r.label })),
    trace: variant ? { input: variant.input } : null,
  };
}

/** Grade: the trace answer exactly, the rubric by a free model with checked quotes. */
async function gradeExplain({ db, user, token, transcript, answer }) {
  prune();
  const username = user?.username || "";
  const s = sessions.get(String(token || ""));
  if (!s || s.username !== username) return { ok: false, say: "This explain-back has ended. Start a new one." };
  const said = String(transcript || "").trim().slice(0, 6000);
  if (said.split(/\s+/).filter(Boolean).length < 25) return { ok: false, say: "Say a little more — the idea, the steps, why it works and the complexity. About a minute is enough." };

  const variantOk = s.variant ? compareOutput(s.variant.expected, String(answer ?? "")) : null;

  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        `Problem: ${s.info.title}`,
        s.info.reference ? `Reference editorial (for you only; give no credit for it):\n${s.info.reference}` : "",
        s.code ? `The student's accepted code (${s.language}):\n${s.code}` : "",
        `The student's explanation, in their words:\n"""${said}"""`,
      ].filter(Boolean).join("\n\n"),
    },
  ];
  let graded = null;
  for (const t of guru.chain()) {
    try {
      const out = await t.client.chat({ model: t.model, messages, maxTokens: 700, temperature: 0, timeoutMs: 60000, think: true });
      if (out.usage) agent.addUsage(username, out.usage).catch(() => {});
      graded = checkScores(out.content, said);
      if (graded) break;
    } catch {
      // Busy or limited: the next free provider.
    }
  }
  if (!graded) return { ok: false, say: "I can’t reach a free AI to grade this right now. Your words are still in the box — try again in a minute." };

  const hint = await db.get("SELECT at FROM voice_hint_log WHERE username=? AND item=?", [username, s.hintItem]).catch(() => null);
  const aided = !!hint && Number(hint.at) > s.started - HINT_WINDOW_MS;
  const v = verdict({ total: graded.total, criteria: graded.criteria, variant: s.variant, variantOk, aided });

  await db.run("INSERT INTO voice_explain(username, item, tags, score, passed, counted, detail, created_at) VALUES(?,?,?,?,?,?,?,?)", [
    username,
    s.item,
    v.counted ? s.info.tags : "",
    graded.total,
    v.passed ? 1 : 0,
    v.counted ? 1 : 0,
    JSON.stringify({ criteria: graded.criteria, variantOk }),
    new Date().toISOString(),
  ]);
  sessions.delete(String(token));
  active.delete(username);
  return {
    ok: true,
    total: graded.total,
    max: 10,
    criteria: graded.criteria,
    feedback: graded.feedback,
    trace: s.variant ? { ok: variantOk, expected: s.variant.expected } : null,
    ...v,
  };
}

/** Counted explanations, as solved-problem tag rows for the DSA Nexus. */
async function countedTagRows(db, username) {
  const rows = await db.all("SELECT item, MAX(tags) AS tags FROM voice_explain WHERE username=? AND counted=1 GROUP BY item", [username]).catch(() => []);
  return rows.map((r) => ({ id: `explain:${r.item}`, tags: String(r.tags || "") }));
}

function cancelExplain(username) {
  active.delete(username);
  for (const [t, s] of sessions) if (s.username === username) sessions.delete(t);
}

module.exports = { startExplain, gradeExplain, cancelExplain, explaining, logHint, ensureTables, countedTagRows, checkScores, quoted, pickVariant, verdict, RUBRIC, SYSTEM };
