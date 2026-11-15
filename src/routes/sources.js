// Admin: problem sources — list, switch on/off, rename, note, auto-sync,
// sync now, and a live test that proves importing works end to end.
// Guarded twice: the authz rule table (problems.manage) and can() here.
const express = require("express");
const sources = require("../sources");

function createSourcesRouter({ can, me, invalidateCatalog }) {
  const router = express.Router();
  const guard = (req, res, next) => (can(req, "problems.manage") ? next() : res.status(403).json({ ok: false, error: "You need the Problems permission" }));
  const fail = (res, e) => res.status(e.status || 500).json({ ok: false, error: e.message || String(e) });

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

  return router;
}

module.exports = { createSourcesRouter };
