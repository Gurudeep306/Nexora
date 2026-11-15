// The solver's AI tools: generate verified tests for a problem, and analyse
// a piece of code end to end (measured metrics + AI analysis + real runs on
// the biggest inputs to check the time limit).
const express = require("express");
const cheerio = require("cheerio");
const { runTask } = require("../ai/agent");
const { sendError } = require("./agent");
const { generateTests } = require("../testgen");
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

function createCodingRouter({ get, me, aiLimiter, judgeLimiter }) {
  const router = express.Router();

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
      const result = await generateTests(ctx, {
        count: Math.max(4, Math.min(60, Number(req.body?.count) || 24)),
        plan: (p) => runTask("testgen_plan", { title: p.title, statement: p.statement, samples: p.samples }, { user, signal: ctrl.signal }),
        onProgress: (step) => send({ type: "progress", step }),
      });
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

module.exports = { createCodingRouter };
