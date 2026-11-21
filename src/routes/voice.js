/* Voice: POST /api/voice/guru — one spoken doubt → Guru's short spoken answer
   (src/voice/guru.js). Signed-in users only; the user is the session user. */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { logError } = require("../http-error");
const { askGuru } = require("../voice/guru");
const { approachToPseudo } = require("../voice/pseudo");

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

  router.post("/api/voice/guru", requireAuthenticatedUser, limiter, async (req, res) => {
    const { text, page, hintsGiven, lang } = req.body || {};
    try {
      const out = await askGuru({
        user: req.sessionUser,
        page: page && typeof page === "object" && !Array.isArray(page) ? page : {},
        text,
        hintsGiven: Math.max(0, Math.min(10, Number(hintsGiven) || 0)),
        lang: lang === "hi-IN" ? "hi-IN" : "en-IN",
      });
      res.json({ ok: true, ...out });
    } catch (e) {
      if (e?.name === "AiError") return res.status(e.status || 502).json({ ok: false, error: e.message });
      logError("voice.guru", e);
      res.status(500).json({ ok: false, error: "Guru ran into a problem — try again." });
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

  return router;
}

module.exports = { createVoiceRouter };
