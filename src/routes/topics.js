// Topics (src/topics.js): the list with counts, each problem's topics, staff
// corrections, and the backfill (Admin → Problem sources → Topics).
// Staff routes live under /api/problem-sources/ so the Problems permission
// and the "Problem sources" staff section (src/authz/sections.js) cover them.
const express = require("express");
const topics = require("../topics");
const { getCatalog } = require("../problem-catalog");
const { get, run } = require("../db");

/** One audit_log row, the same shape Admin writes (src/routes/admin.js). */
async function audit(req, action, { targetType = null, target = null, before, after } = {}) {
  const j = (v) => (v === undefined ? null : JSON.stringify(v));
  try {
    await run(
      `INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
      [req.access?.username || "?", req.access?.role || null, action, targetType, target, j(before), j(after), req.ip || null, Date.now()],
    );
  } catch (e) {
    console.warn("[topics] audit failed:", e.message);
  }
}

function createTopicsRouter({ can, me }) {
  const router = express.Router();
  const guard = (req, res, next) => (can(req, "problems.manage") ? next() : res.status(403).json({ ok: false, error: "You need the Problems permission" }));
  const fail = (res, e) => res.status(500).json({ ok: false, error: String((e && e.message) || e) });

  /** Every topic, with how many problems in the catalog have it. */
  router.get("/api/topics", async (_req, res) => {
    try {
      const catalog = await getCatalog();
      // Count only what the Problems page can show: no source switched off in Admin.
      const off = await require("../sources").disabledPlatforms();
      const counts = new Map();
      for (const r of catalog.rows) {
        if (!r.topics || r.topics === "[]" || off.has(r.platform)) continue;
        try {
          for (const id of JSON.parse(r.topics)) counts.set(id, (counts.get(id) || 0) + 1);
        } catch {
          /* skip a bad row */
        }
      }
      res.json({ ok: true, topics: topics.TOPICS.map((t) => ({ ...t, count: counts.get(t.id) || 0 })) });
    } catch (e) {
      fail(res, e);
    }
  });

  /** One problem's topics, with where each came from. */
  router.get("/api/problems/:id/topics", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Bad problem id" });
    try {
      // An unpublished problem (category __hidden) is staff-only, like the problem itself.
      const p = await get("SELECT category FROM problems WHERE id=?", [id]);
      if (!p || (p.category === "__hidden" && !can(req, "problems.manage"))) return res.status(404).json({ ok: false, error: "Problem not found" });
      const t = await topics.topicsFor(id);
      res.json({ ok: true, ...t, canEdit: can(req, "problems.manage") });
    } catch (e) {
      fail(res, e);
    }
  });

  /** A staff correction: kept for good, the pipeline never changes it. */
  router.put("/api/problem-sources/topics/:id", guard, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Bad problem id" });
    const list = Array.isArray(req.body?.topics) ? req.body.topics : null;
    if (!list) return res.status(400).json({ ok: false, error: "Send topics: a list of topic ids" });
    const unknown = list.filter((x) => !topics.TOPICS.some((t) => t.id === x));
    if (unknown.length) return res.status(400).json({ ok: false, error: `Unknown topic: ${unknown.slice(0, 3).join(", ")}` });
    try {
      const before = await topics.topicsFor(id);
      const detail = await topics.setTopics(id, list, me());
      await audit(req, "problem.topics", { targetType: "problem", target: String(id), before: { topics: before.topics.map((t) => t.id) }, after: { topics: list } });
      res.json({ ok: true, topics: detail, locked: true });
    } catch (e) {
      fail(res, e);
    }
  });

  /** Undo a correction: back to what the pipeline finds. */
  router.delete("/api/problem-sources/topics/:id/lock", guard, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Bad problem id" });
    try {
      const r = await topics.unlock(id);
      await audit(req, "problem.topics.unlock", { targetType: "problem", target: String(id) });
      res.json({ ok: true, ...(r || { topics: [] }), locked: false });
    } catch (e) {
      fail(res, e);
    }
  });

  /** Counts and the backfill's progress. */
  router.get("/api/problem-sources/topics", guard, async (_req, res) => {
    try {
      res.json({ ok: true, summary: await topics.summary(), job: topics.status() });
    } catch (e) {
      fail(res, e);
    }
  });

  /**
   * Run the pipeline now: problems with no topics yet (default) or all of
   * them except staff-locked ones (`all`). `ai: true` also asks the site's AI
   * model about unsure problems whose statement we have (up to `aiLimit`,
   * counted against this admin's own AI budget).
   */
  router.post("/api/problem-sources/topics/backfill", guard, async (req, res) => {
    const b = req.body || {};
    if (topics.status().running) return res.status(409).json({ ok: false, error: "Already running", job: topics.status() });
    let ai = null;
    if (b.ai) {
      const { isConfigured } = require("../ai/groq");
      if (!isConfigured()) return res.status(400).json({ ok: false, error: "No AI model is set up (Admin → AI models)" });
      const { runTask } = require("../ai/agent");
      ai = {
        user: { username: me() },
        limit: Math.max(1, Math.min(100, Number(b.aiLimit) || 30)),
        ask: (input, user) => runTask("topic_classify", input, { user }),
      };
    }
    topics.backfill({ all: !!b.all, by: me(), ai }).catch(() => {});
    await audit(req, "problem.topics.backfill", { targetType: "topics", target: b.all ? "all" : "new", after: { ai: !!b.ai } });
    res.json({ ok: true, job: topics.status() });
  });

  router.post("/api/problem-sources/topics/stop", guard, (_req, res) => res.json({ ok: true, job: topics.stopBackfill() }));

  return router;
}

module.exports = { createTopicsRouter };
