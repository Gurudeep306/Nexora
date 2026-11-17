// Staff: "Add a coding problem" (src/authoring.js). Guarded by the Problems
// permission (problems.manage), like the rest of the problem tools.
const express = require("express");
const authoring = require("../authoring");

function createAuthoringRouter({ can, me, audit, invalidateCatalog }) {
  const router = express.Router();
  const guard = (req, res, next) => (can(req, "problems.manage") ? next() : res.status(403).json({ ok: false, error: "You need the Problems permission" }));
  const fail = (res, e) => res.status(e.status || 500).json({ ok: false, error: e.message || String(e) });
  const h = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      fail(res, e);
    }
  };
  const deps = () => {
    const { judge, quickRun } = require("../judge");
    return { judge, runner: quickRun, by: me() };
  };
  const note = (req, action, id, extra = {}) => audit?.(req, action, { targetType: "problem", target: String(id), ...extra }).catch?.(() => {});

  router.get("/api/authoring", guard, h(async (_req, res) => res.json({ ok: true, problems: await authoring.list(), langs: authoring.LANGS, checkers: authoring.CHECKER_MODES, limits: { tests: authoring.MAX_TESTS, testBytes: authoring.MAX_TEST_BYTES, totalBytes: authoring.MAX_TOTAL_TEST_BYTES } })));

  router.post("/api/authoring", guard, h(async (req, res) => {
    const p = await authoring.create(req.body?.data || {}, me());
    note(req, "authoring.create", p.id);
    res.json({ ok: true, problem: p });
  }));

  router.get("/api/authoring/:id", guard, h(async (req, res) => {
    const p = await authoring.load(req.params.id);
    if (!p) return res.status(404).json({ ok: false, error: "No such problem" });
    res.json({ ok: true, problem: p, job: authoring.jobStatus(p.id), missing: authoring.problemsFor(p.data) });
  }));

  router.put("/api/authoring/:id", guard, h(async (req, res) => {
    const p = await authoring.save(req.params.id, req.body?.data || {}, me());
    res.json({ ok: true, problem: p, missing: authoring.problemsFor(p.data) });
  }));

  router.delete("/api/authoring/:id", guard, h(async (req, res) => {
    await authoring.remove(req.params.id);
    note(req, "authoring.delete", req.params.id);
    res.json({ ok: true });
  }));

  // Run all five solutions on every test (in the background; the page asks how it is going).
  router.post("/api/authoring/:id/verify", guard, h(async (req, res) => {
    const job = await authoring.verify(req.params.id, deps());
    res.status(202).json({ ok: true, job });
  }));

  // Make the missing outputs from a reference solution, and new tests from the generator.
  router.post("/api/authoring/:id/generate", guard, h(async (req, res) => {
    const job = await authoring.generate(req.params.id, { ...deps(), refLang: String(req.body?.refLang || "cpp"), makeTests: !!req.body?.makeTests });
    res.status(202).json({ ok: true, job });
  }));

  // A picture for the statement or editorial: PNG, JPEG, GIF or WebP only
  // (checked by the file's own bytes; no SVG, which can carry scripts), kept
  // in the database too, so it survives a redeploy (src/upload-store.js).
  const multer = require("multer");
  const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
  const kindOf = (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? "png"
      : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "jpg"
        : b.subarray(0, 4).toString("latin1") === "GIF8" ? "gif"
          : b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" ? "webp"
            : null;
  router.post("/api/authoring/:id/image", guard, (req, res) => {
    imageUpload.single("file")(req, res, async (err) => {
      try {
        if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "Pictures can be up to 2 MB" : "Could not read the file" });
        if (!(await authoring.load(req.params.id))) return res.status(404).json({ ok: false, error: "No such problem" });
        const buf = req.file?.buffer;
        const ext = buf && kindOf(buf);
        if (!ext) return res.status(400).json({ ok: false, error: "Use a PNG, JPEG, GIF or WebP picture" });
        const fs = require("fs");
        const path = require("path");
        const { UPLOADS_DIR, persistUpload } = require("../upload-store");
        const dir = path.join(UPLOADS_DIR, "problems");
        fs.mkdirSync(dir, { recursive: true });
        const name = `${Number(req.params.id)}-${require("crypto").randomBytes(6).toString("hex")}.${ext}`;
        fs.writeFileSync(path.join(dir, name), buf);
        const url = `/uploads/problems/${name}`;
        await persistUpload(url, path.join(dir, name));
        res.json({ ok: true, url });
      } catch (e) {
        fail(res, e);
      }
    });
  });

  // The draft as students will see it: the same conversion publishing uses.
  router.get("/api/authoring/:id/preview", guard, h(async (req, res) => {
    const p = await authoring.load(req.params.id);
    if (!p) return res.status(404).json({ ok: false, error: "No such problem" });
    const { markdown } = require("../sources/common");
    const { normalizeStatement } = require("../statement-media");
    const d = p.data;
    const html = (s) => (s && s.trim() ? markdown(s) : "");
    const sec = (title, s) => (s && s.trim() ? `<div class="section-title">${title}</div>${html(s)}` : "");
    const norm = normalizeStatement({ statement: html(d.statement), inputSpec: sec("Input", d.inputSpec), outputSpec: sec("Output", d.outputSpec), note: html(d.note) }, { platform: "nexora" });
    res.json({
      ok: true,
      problem: { id: p.problemRowid || 0, platform: "nexora", problem_id: `NX${p.id}`, title: d.title || "Untitled problem", url: "", rating: d.rating, tags: JSON.stringify(d.tags), solve_status: "unsolved" },
      statement: { ok: true, ...norm, timeLimit: d.timeLimit, memLimit: d.memoryLimit, samples: d.tests.filter((t) => t.sample).map((t) => ({ input: t.input, output: t.output })), extra: authoring.studentExtra(d), platform: "nexora", source: "preview" },
    });
  }));

  router.get("/api/authoring/:id/job", guard, h(async (req, res) => res.json({ ok: true, job: authoring.jobStatus(req.params.id) })));

  router.post("/api/authoring/:id/publish", guard, h(async (req, res) => {
    const { markdown } = require("../sources/common");
    const p = await authoring.publish(req.params.id, { by: me(), markdown });
    invalidateCatalog?.();
    note(req, "authoring.publish", p.id, { after: { problemRowid: p.problemRowid, title: p.data.title } });
    res.json({ ok: true, problem: p });
  }));

  router.post("/api/authoring/:id/unpublish", guard, h(async (req, res) => {
    const p = await authoring.unpublish(req.params.id, me());
    invalidateCatalog?.();
    note(req, "authoring.unpublish", p.id);
    res.json({ ok: true, problem: p });
  }));

  return router;
}

module.exports = { createAuthoringRouter };
