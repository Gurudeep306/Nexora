/* Voice: POST /api/voice/guru — one spoken doubt → Guru's short spoken answer
   (src/voice/guru.js). Signed-in users only; the user is the session user. */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { logError } = require("../http-error");
const { askGuru, planGuru, localAllowed } = require("../voice/guru");
const { approachToPseudo } = require("../voice/pseudo");
const { buildCode } = require("../voice/build");
const { makeBoard } = require("../voice/board");
const explain = require("../voice/explain");
const db = require("../db");
const { invalidateNexusUser } = require("../nexus/user-cache");

function createVoiceRouter({ getSessionUser, requireAuthenticatedUser }) {
  const router = express.Router();
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => `voice:${getSessionUser(req)?.username || "anon"}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "That's a lot of questions in a minute — take a breath and try again." },
  });

  explain.ensureTables(db).catch((e) => logError("voice.explain.tables", e));

  router.post("/api/voice/guru", requireAuthenticatedUser, limiter, async (req, res) => {
    const { text, page, hintsGiven, lang, teacher, talk, history } = req.body || {};
    const username = req.sessionUser?.username || "";
    const problemId = page && typeof page === "object" ? page.problemId : null;
    // Explain-back is a viva: no hints until it ends.
    if (problemId && explain.explaining(username, problemId)) {
      return res.json({ ok: true, say: lang === "hi-IN" ? "अभी Explain-back चल रहा है — अपने शब्दों में समझाओ, हिंट बाद में।" : "Explain-back is on — tell it in your own words. Hints after.", step: 0, source: "rule" });
    }
    try {
      const out = await askGuru({
        user: req.sessionUser,
        page: page && typeof page === "object" && !Array.isArray(page) ? page : {},
        text,
        hintsGiven: Math.max(0, Math.min(10, Number(hintsGiven) || 0)),
        lang: lang === "hi-IN" ? "hi-IN" : "en-IN",
        // Conversation mode with the virtual teacher: who is speaking, and what was said before.
        teacher: typeof teacher === "string" ? teacher.slice(0, 20) : "",
        talk: talk === true,
        history: Array.isArray(history) ? history.slice(-8) : [],
      });
      // Any help on a problem makes a later explain-back of it "aided" for a day.
      if (problemId && out.source !== "rule" && out.source !== "none") explain.logHint(db, username, problemId).catch(() => {});
      res.json({ ok: true, ...out });
    } catch (e) {
      if (e?.name === "AiError") return res.status(e.status || 502).json({ ok: false, error: e.message });
      logError("voice.guru", e);
      res.status(500).json({ ok: false, error: "Guru ran into a problem — try again." });
    }
  });

  // Guru on the student's own device: the server plans the turn (rules, page,
  // safety) and hands over the messages only when nothing in them must stay
  // hidden; otherwise the device asks /api/voice/guru as before.
  router.post("/api/voice/guru/plan", requireAuthenticatedUser, limiter, async (req, res) => {
    const { text, page, hintsGiven, lang, teacher, talk, history } = req.body || {};
    const username = req.sessionUser?.username || "";
    const problemId = page && typeof page === "object" ? page.problemId : null;
    if (problemId && explain.explaining(username, problemId)) return res.json({ ok: true, local: false });
    try {
      const plan = await planGuru({
        user: req.sessionUser,
        page: page && typeof page === "object" && !Array.isArray(page) ? page : {},
        text,
        hintsGiven: Math.max(0, Math.min(10, Number(hintsGiven) || 0)),
        lang: lang === "hi-IN" ? "hi-IN" : "en-IN",
        teacher: typeof teacher === "string" ? teacher.slice(0, 20) : "",
        talk: talk === true,
        history: Array.isArray(history) ? history.slice(-8) : [],
      });
      if (plan.kind === "say") return res.json({ ok: true, local: false, say: plan.say, step: plan.step, source: plan.source });
      if (!localAllowed(plan)) return res.json({ ok: true, local: false });
      res.json({ ok: true, local: true, messages: plan.messages, step: plan.step });
    } catch (e) {
      if (e?.name === "AiError") return res.status(e.status || 502).json({ ok: false, error: e.message });
      logError("voice.guru.plan", e);
      res.json({ ok: true, local: false });
    }
  });

  // The teacher's whiteboard: a topic → a short lesson of spoken steps with drawings.
  router.post("/api/voice/board", requireAuthenticatedUser, limiter, async (req, res) => {
    const { topic, page, lang, teacher } = req.body || {};
    try {
      const out = await makeBoard({
        user: req.sessionUser,
        topic,
        page: page && typeof page === "object" && !Array.isArray(page) ? page : {},
        lang: lang === "hi-IN" ? "hi-IN" : "en-IN",
        teacher: typeof teacher === "string" ? teacher.slice(0, 20) : "",
      });
      res.json({ ok: true, ...out });
    } catch (e) {
      if (e?.name === "AiError") return res.status(e.status || 502).json({ ok: false, error: e.message });
      logError("voice.board", e);
      res.status(500).json({ ok: false, error: "The whiteboard ran into a problem — try again." });
    }
  });

  // Mirror Run: a spoken approach → pseudocode written exactly as said.
  router.post("/api/voice/pseudo", requireAuthenticatedUser, limiter, async (req, res) => {
    const { text, inputs, lessonTitle } = req.body || {};
    try {
      const out = await approachToPseudo({
        user: req.sessionUser,
        text,
        inputs: Array.isArray(inputs) ? inputs.map(String) : [],
        lessonTitle: typeof lessonTitle === "string" ? lessonTitle : "",
      });
      res.json({ ok: true, ...out });
    } catch (e) {
      logError("voice.pseudo", e);
      res.status(500).json({ ok: false, error: "Couldn’t write the steps — type them instead." });
    }
  });

  // Build mode: translate the student's code, or (after Accepted) change it.
  router.post("/api/voice/build", requireAuthenticatedUser, limiter, async (req, res) => {
    const b = req.body || {};
    const problem = b.problem && typeof b.problem === "object" ? { kind: String(b.problem.kind || ""), id: String(b.problem.id ?? "") } : null;
    const failing = b.failing && typeof b.failing === "object" ? b.failing : null;
    try {
      // eslint-disable-next-line global-require
      const db = require("../db");
      const out = await buildCode({
        user: req.sessionUser,
        db,
        mode: b.mode === "translate" ? "translate" : b.mode === "change" ? "change" : "",
        problem,
        code: typeof b.code === "string" ? b.code : "",
        language: String(b.language || ""),
        target: String(b.target || ""),
        instruction: typeof b.instruction === "string" ? b.instruction : "",
        failing,
        previous: typeof b.previous === "string" ? b.previous : null,
      });
      res.json(out);
    } catch (e) {
      logError("voice.build", e);
      res.status(500).json({ ok: false, say: "Build mode ran into a problem — try again." });
    }
  });

  // Explain-back: after Accepted, explain the solution; graded, and counted when unaided.
  const problemOf = (b) => (b?.problem && typeof b.problem === "object" ? { kind: String(b.problem.kind || ""), id: String(b.problem.id ?? "").slice(0, 100) } : null);
  router.post("/api/voice/explain/start", requireAuthenticatedUser, limiter, async (req, res) => {
    const b = req.body || {};
    try {
      res.json(await explain.startExplain({ db, user: req.sessionUser, problem: problemOf(b), code: typeof b.code === "string" ? b.code : "", language: String(b.language || "") }));
    } catch (e) {
      logError("voice.explain.start", e);
      res.status(500).json({ ok: false, say: "Explain-back couldn’t start — try again." });
    }
  });
  router.post("/api/voice/explain/grade", requireAuthenticatedUser, limiter, async (req, res) => {
    const b = req.body || {};
    try {
      const out = await explain.gradeExplain({ db, user: req.sessionUser, token: b.token, transcript: typeof b.transcript === "string" ? b.transcript : "", answer: typeof b.answer === "string" ? b.answer : "" });
      if (out.counted) invalidateNexusUser(req.sessionUser.username);
      res.json(out);
    } catch (e) {
      logError("voice.explain.grade", e);
      res.status(500).json({ ok: false, say: "Grading ran into a problem — your words are still there, try again." });
    }
  });
  router.post("/api/voice/explain/cancel", requireAuthenticatedUser, (req, res) => {
    explain.cancelExplain(req.sessionUser?.username || "");
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createVoiceRouter };
