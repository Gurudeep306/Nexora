// Admin: problem sources — list, switch on/off, rename, note, auto-sync,
// sync now, and a live test that proves importing works end to end.
// Guarded twice: the authz rule table (problems.manage) and can() here.
const express = require("express");
const sources = require("../sources");
const { run } = require("../db");

function createSourcesRouter({ can, me, invalidateCatalog }) {
  const router = express.Router();
  const guard = (req, res, next) => (can(req, "problems.manage") ? next() : res.status(403).json({ ok: false, error: "You need the Problems permission" }));
  const fail = (res, e) => res.status(e.status || 500).json({ ok: false, error: e.message || String(e) });

  // Public: the sources that are switched on, with the names admins gave them.
  router.get("/api/sources", async (_req, res) => {
    try {
      const list = await sources.listSources({ statements: false });
      res.set("Cache-Control", "public, max-age=60");
      res.json({ ok: true, sources: list.filter((s) => s.enabled).map((s) => ({ id: s.id, label: s.label, kind: s.kind, problems: s.problems })) });
    } catch (e) {
      fail(res, e);
    }
  });

  router.get("/api/problem-sources", guard, async (_req, res) => {
    try {
      res.json({ ok: true, sources: await sources.listSources() });
    } catch (e) {
      fail(res, e);
    }
  });

  router.put("/api/problem-sources/:id", guard, async (req, res) => {
    try {
      const b = req.body || {};
      await sources.updateSource(req.params.id, { enabled: b.enabled, label: b.label, note: b.note, autoSync: b.autoSync }, me());
      invalidateCatalog?.();
      res.json({ ok: true, sources: await sources.listSources() });
    } catch (e) {
      fail(res, e);
    }
  });

  // Syncing a large source takes a minute or more: start it and return; the
  // page polls the list (which shows the running phase and the result).
  router.post("/api/problem-sources/:id/sync", guard, async (req, res) => {
    const id = req.params.id;
    if (!sources.SOURCES[id]) return res.status(404).json({ ok: false, error: "Unknown source" });
    sources
      .syncSource(id, { by: me() })
      .then(() => invalidateCatalog?.())
      .catch((e) => console.warn(`[sources] sync ${id}:`, e.message));
    res.status(202).json({ ok: true, started: true });
  });

  router.post("/api/problem-sources/:id/test", guard, async (req, res) => {
    try {
      req.setTimeout?.(180000);
      res.json({ ok: true, report: await sources.testSource(req.params.id, { problemId: req.body?.problemId || null }) });
    } catch (e) {
      fail(res, e);
    }
  });

  /* ── What is missing, and re-importing it (src/problem-import.js) ── */
  const imp = require("../problem-import");
  // Written to the same audit log as the admin panel's other actions.
  const audit = (req, action, target, after) =>
    run(`INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at) VALUES(?,?,?,?,?,?,?,?,?)`, [
      me() || "?",
      null,
      action,
      "problem_source",
      String(target),
      null,
      after ? JSON.stringify(after) : null,
      req.ip || null,
      Date.now(),
    ]).catch(() => {});

  // Every source: counts of each kind of gap, and any re-import running.
  router.get("/api/problem-sources/gaps", guard, async (req, res) => {
    try {
      const refresh = req.query.refresh === "1";
      const list = [];
      for (const id of sources.MODULES) {
        const { summary, at } = await imp.auditSource(id, { refresh });
        list.push({ ...summary, name: sources.SOURCES[id].name, at, job: imp.jobStatus(id) });
      }
      res.json({ ok: true, labels: imp.GAP_LABEL, sources: list });
    } catch (e) {
      fail(res, e);
    }
  });

  // One source's problems with gaps, a page at a time (?gap=samples&q=…&page=2).
  router.get("/api/problem-sources/:id/gaps", guard, async (req, res) => {
    try {
      if (!sources.SOURCES[req.params.id]) return res.status(404).json({ ok: false, error: "Unknown source" });
      const gap = imp.GAPS.includes(req.query.gap) ? req.query.gap : "";
      res.json({ ok: true, ...(await imp.gapRows(req.params.id, { gap, q: String(req.query.q || "").slice(0, 80), page: req.query.page })), job: imp.jobStatus(req.params.id) });
    } catch (e) {
      fail(res, e);
    }
  });

  // Re-import one problem now (statement, samples, limits, images).
  router.post("/api/problem-sources/:id/problems/:rowid/reimport", guard, async (req, res) => {
    try {
      req.setTimeout?.(120000);
      const r = await imp.reimportProblem(Number(req.params.rowid));
      await audit(req, "problem.reimport", `${req.params.id}:${req.params.rowid}`, { ok: r.ok, error: r.error || null });
      invalidateCatalog?.();
      res.json({ ok: true, result: r });
    } catch (e) {
      fail(res, e);
    }
  });

  // Re-import a source: its list, then up to `limit` problems with gaps (background).
  router.post("/api/problem-sources/:id/reimport", guard, async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(500, Number(req.body?.limit) || 100));
      imp.reimportSource(req.params.id, { limit, by: me() });
      await audit(req, "source.reimport", req.params.id, { limit });
      res.status(202).json({ ok: true, job: imp.jobStatus(req.params.id) });
    } catch (e) {
      fail(res, e);
    }
  });

  router.post("/api/problem-sources/:id/reimport/stop", guard, async (req, res) => {
    try {
      imp.cancelReimport(req.params.id);
      await audit(req, "source.reimport.stop", req.params.id);
      res.json({ ok: true, job: imp.jobStatus(req.params.id) });
    } catch (e) {
      fail(res, e);
    }
  });

  return router;
}

module.exports = { createSourcesRouter };
