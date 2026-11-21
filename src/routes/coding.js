// The solver's AI tools: generate verified tests for a problem, and analyse
// a piece of code end to end (measured metrics + AI analysis + real runs on
// the biggest inputs to check the time limit).
const express = require("express");
const cheerio = require("cheerio");
const { runTask } = require("../ai/agent");
const { sendError } = require("./agent");
const { generateTests, MIN_TOTAL } = require("../testgen");
const metrics = require("../code-metrics");
const { quickRun, LANG_CONFIG } = require("../judge");

const text = (html, max = 12000) => {
  if (!html) return "";
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  $("br").replaceWith("\n");
  $("p, li, div, pre, h1, h2, h3, h4, tr").each((_, el) => $(el).append("\n"));
  return $("#r").text().replace(/\$\$\$/g, "$").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
};

const samplesOf = (v) => {
  try {
    const a = typeof v === "string" ? JSON.parse(v || "[]") : v;
    return (Array.isArray(a) ? a : []).map((s) => ({ input: String(s?.input ?? ""), output: String(s?.output ?? s?.expected_output ?? "") })).filter((s) => s.input.trim() || s.output.trim());
  } catch {
    return [];
  }
};

/** A problem that accepts any of several answers: a plain diff can't judge it. */
const manyAnswers = (statement) => /\b(print|output) any\b|any of them|if there are (several|multiple)|any (valid|correct) answer|multiple (solutions|answers)/i.test(String(statement || ""));

/**
 * The test plan in short steps (works on small self-hosted models): the
 * generator with edge cases, a brute force and an efficient solution, asked
 * for at the same time. A step that fails is simply left out.
 */
async function splitPlan(p, ask) {
  const input = { title: p.title, statement: p.statement, samples: p.samples, limits: p.limits };
  const [cases, brute, sol] = await Promise.allSettled([ask("testgen_cases", input), ask("testgen_brute", input), ask("testgen_solution", input)]);
  // Nothing configured / the model is down: report that, not "no generator".
  if (cases.status === "rejected" && brute.status === "rejected") throw cases.reason;
  const c = cases.status === "fulfilled" ? cases.value : { generator: "", validator: "", edgeCases: [] };
  return {
    format: "",
    multipleAnswers: manyAnswers(p.statement),
    generator: c.generator,
    validator: c.validator,
    edgeCases: c.edgeCases,
    brute: brute.status === "fulfilled" ? brute.value.program : "",
    solution: sol.status === "fulfilled" ? sol.value.program : "",
    notes: "",
  };
}

function createCodingRouter({ get, run = null, me, aiLimiter, judgeLimiter }) {
  const router = express.Router();

  /* Verified AI tests are kept per problem: the next person gets them at once. */
  let cacheReady = null;
  const cacheInit = () =>
    (cacheReady ||= run
      ? run("CREATE TABLE IF NOT EXISTS ai_test_sets (problem_key TEXT PRIMARY KEY, tests TEXT NOT NULL, stats TEXT, created_by TEXT, created_at INTEGER NOT NULL)").catch((e) => {
          cacheReady = null;
          throw e;
        })
      : Promise.resolve());
  const keyOf = (b) => (b.problem_id ? `p:${Number(b.problem_id)}` : b.custom_problem_id ? `c:${Number(b.custom_problem_id)}` : null);

  /** Problem context from the database (platform or Workshop problem), else from the request. */
  async function problemContext(b) {
    if (b.problem_id) {
      const p = await get("SELECT * FROM problems WHERE id=?", [Number(b.problem_id)]);
      if (p) {
        const st = await get("SELECT * FROM problem_statements WHERE problem_rowid=?", [p.id]);
        return {
          title: p.title,
          statement: [text(st?.statement), text(st?.input_spec), text(st?.output_spec), text(st?.note, 3000)].filter(Boolean).join("\n\n") || String(b.statement || "").slice(0, 12000),
          samples: samplesOf(st?.samples).length ? samplesOf(st?.samples) : samplesOf(b.samples),
          limits: [st?.time_limit, st?.memory_limit].filter(Boolean).join(", "),
        };
      }
    }
    if (b.custom_problem_id) {
      const p = await get("SELECT * FROM custom_problems WHERE id=?", [Number(b.custom_problem_id)]);
      if (p) {
        return {
          title: p.title,
          statement: [text(p.statement), text(p.input_spec), text(p.output_spec)].filter(Boolean).join("\n\n"),
          samples: samplesOf(p.samples),
          limits: [p.time_limit, p.memory_limit].filter(Boolean).join(", "),
        };
      }
    }
    return { title: String(b.title || "Problem").slice(0, 200), statement: text(String(b.statement || "")) || String(b.statement || "").slice(0, 12000), samples: samplesOf(b.samples).slice(0, 10), limits: String(b.limits || "").slice(0, 80) };
  }

  // Generation takes a minute or two (AI + sandbox runs), so the reply streams
  // progress lines (NDJSON) and ends with the result.
  router.post("/api/ai/testgen", aiLimiter, judgeLimiter, async (req, res) => {
    const user = req.session?.user;
    try {
      const ctx = await problemContext(req.body || {});
      if (!ctx.statement || ctx.statement.length < 20) return res.status(400).json({ ok: false, error: "This problem has no statement to generate tests from yet" });
      res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      const send = (o) => res.write(`${JSON.stringify(o)}\n`);
      const ctrl = new AbortController();
      res.on("close", () => ctrl.abort());
      const key = keyOf(req.body || {});
      // Someone already generated tests for this problem: hand them over at once.
      if (key && run && !req.body?.fresh) {
        await cacheInit();
        const hit = await get("SELECT tests, stats, created_at FROM ai_test_sets WHERE problem_key=?", [key]).catch(() => null);
        let tests = hit ? JSON.parse(hit.tests || "[]") : [];
        // Sets saved before the examples were included get them in front.
        if (hit && !tests.some((t) => t.confidence === "official")) {
          const ex = ctx.samples.map((x, i) => ({ size: "sample", input: String(x.input).endsWith("\n") ? String(x.input) : `${x.input}\n`, expected: String(x.output), confidence: "official", label: `Example ${i + 1}` }));
          tests = [...ex, ...tests];
        }
        // A saved set that is too small is made again rather than handed on.
        if (hit && tests.length >= MIN_TOTAL) {
          send({ type: "done", ok: true, tests, stats: { ...JSON.parse(hit.stats || "{}"), cached: true, cachedAt: hit.created_at }, multipleAnswers: manyAnswers(ctx.statement) });
          return res.end();
        }
      }
      const ask = (mode, input) => runTask(mode, input, { user, signal: ctrl.signal });
      const result = await generateTests(ctx, {
        count: Math.max(4, Math.min(60, Number(req.body?.count) || 24)),
        plan: (p) => splitPlan(p, ask),
        repair: async ({ program, failure }) => (await ask("testgen_fix", { title: ctx.title, statement: ctx.statement, samples: ctx.samples, program, failure })).program,
        onProgress: (step) => send({ type: "progress", step }),
      });
      // Keep a set worth sharing (at least MIN_TOTAL tests, examples included), for everyone after.
      if (key && run && result.tests.length >= MIN_TOTAL) {
        await cacheInit();
        const stats = { kept: result.stats.kept, verified: result.stats.verified };
        await run("INSERT OR REPLACE INTO ai_test_sets(problem_key, tests, stats, created_by, created_at) VALUES(?,?,?,?,?)", [key, JSON.stringify(result.tests), JSON.stringify(stats), me() || null, Date.now()]).catch(() => {});
      }
      send({ type: "done", ok: true, ...result });
      res.end();
    } catch (e) {
      if (res.headersSent) {
        res.write(`${JSON.stringify({ type: "error", ok: false, error: e.public || e.status ? e.message : "Test generation failed — try again", details: e.details || null })}\n`);
        return res.end();
      }
      if (e.status && !e.name?.includes("AiError")) return res.status(e.status).json({ ok: false, error: e.message, details: e.details || null });
      sendError(res, e, "testgen");
    }
  });

  // Everything about a piece of code: exact metrics, the AI's analysis, and
  // (when inputs are given) real runs to measure time against the limit.
  router.post("/api/ai/analyze", aiLimiter, async (req, res) => {
    const b = req.body || {};
    const code = String(b.code || "");
    const language = LANG_CONFIG[b.language] ? b.language : "cpp";
    if (!code.trim()) return res.status(400).json({ ok: false, error: "There's no code to analyse" });
    if (code.length > 60000) return res.status(413).json({ ok: false, error: "That code is too long to analyse (60 KB max)" });
    try {
      const ctx = await problemContext(b);
      const measured = metrics.analyze(code, language, { statement: ctx.statement });
      const inputs = (Array.isArray(b.inputs) ? b.inputs : []).slice(0, 3).filter((x) => typeof x?.input === "string" && x.input.length <= 400_000);
      const [ai, runs] = await Promise.all([
        runTask("code_analysis", { title: ctx.title, statement: ctx.statement, limits: ctx.limits, code, language, metrics: measured, uiLang: b.uiLang }, { user: req.session?.user }).catch((e) => ({ error: e.public || e.name === "AiError" ? e.message : "The AI analysis is unavailable right now" })),
        Promise.all(
          inputs.map(async (x) => {
            const r = await quickRun(code, x.input, language);
            return { label: String(x.label || "Input").slice(0, 40), bytes: x.input.length, verdict: r.verdict, timeMs: r.timeMs ?? null, engine: r.engine, outputPreview: String(r.output || "").slice(0, 300), stderr: String(r.stderr || r.error || "").slice(0, 300) };
          }),
        ),
      ]);
      res.json({ ok: true, language, limits: ctx.limits || null, metrics: measured, ai, runs });
    } catch (e) {
      sendError(res, e, "analyze");
    }
  });

  return router;
}

module.exports = { createCodingRouter, splitPlan, manyAnswers };
