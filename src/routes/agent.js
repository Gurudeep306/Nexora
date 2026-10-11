/* HTTP surface of the Nexora AI agent (src/ai/agent.js). Everything needs a
   signed-in account; the user is always the session user.

   POST   /api/agent/chat                  → text/event-stream
   POST   /api/agent/task                  → { ok, result }
   GET    /api/agent/status                → { ok, configured, used, limit }
   GET    /api/agent/conversations         → own conversations
   GET    /api/agent/conversations/:id     → own turns
   DELETE /api/agent/conversations/:id                                          */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { errMessage, logError } = require("../http-error");
const agent = require("../ai/agent");
const { isConfigured, NOT_CONFIGURED } = require("../ai/groq");
const { MODES } = require("../ai/modes");

// Modes a page may call directly. Internal pipelines (translate, find-problems)
// go through their own endpoints, which call runTask themselves.
const PUBLIC_MODES = new Set([
  "complete",
  "fix",
  "tutor",
  "coach_insight",
  "coach_tests",
  "coach_explain",
  "coach_ask",
  "animate",
  "gate_narrative",
  "studio_author",
]);

/** Map any error to a JSON response; AiError carries a user-safe status/message. */
function sendError(res, e, scope) {
  if (e?.name === "AiError") return res.status(e.status || 502).json({ ok: false, error: e.message, code: e.code });
  logError(scope, e);
  return res.status(500).json({ ok: false, error: errMessage(e) });
}

function createAgentRouter({ getSessionUser, requireAuthenticatedUser, studioAuth }) {
  const router = express.Router();
  const userKey = (req) => `u:${getSessionUser(req)?.username || "anon"}`;
  const limiter = (max, what) =>
    rateLimit({
      windowMs: 60 * 1000,
      max,
      keyGenerator: userKey,
      standardHeaders: true,
      legacyHeaders: false,
      message: { ok: false, error: `${what} rate limit reached — please wait a moment.` },
    });
  const chatLimiter = limiter(30, "AI chat");
  const completeLimiter = limiter(120, "AI completion");
  const taskLimiter = limiter(40, "AI");

  const configured = (_req, res, next) =>
    isConfigured() ? next() : res.status(503).json({ ok: false, error: NOT_CONFIGURED, code: "not_configured" });

  router.use("/api/agent", requireAuthenticatedUser);

  router.get("/api/agent/status", async (req, res) => {
    try {
      const used = await agent.usedToday(req.sessionUser.username);
      res.json({ ok: true, configured: isConfigured(), used, limit: agent.dailyLimit() });
    } catch (e) {
      sendError(res, e, "agent.status");
    }
  });

  router.post("/api/agent/chat", configured, chatLimiter, async (req, res) => {
    const { conversationId, message, page, animate } = req.body || {};
    if (!String(message || "").trim()) return res.status(400).json({ ok: false, error: "Message is required" });

    const ctrl = new AbortController();
    let started = false;
    let heartbeat = null;
    const start = () => {
      if (started) return;
      started = true;
      res.status(200);
      res.set({
        "Content-Type": "text/event-stream; charset=utf-8",
        // no-transform keeps the compression middleware from buffering the stream.
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders?.();
      heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);
    };
    const send = (event, data) => {
      if (res.writableEnded) return;
      start();
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    res.on("close", () => {
      clearInterval(heartbeat);
      if (!res.writableEnded) ctrl.abort();
    });

    try {
      await agent.runChat({
        user: req.sessionUser,
        conversationId,
        message,
        page: page && typeof page === "object" ? page : {},
        animate: !!animate,
        signal: ctrl.signal,
        onEvent: send,
      });
    } catch (e) {
      if (ctrl.signal.aborted && !res.writableEnded) return res.end();
      if (!started) return sendError(res, e, "agent.chat");
      if (e?.name !== "AiError") logError("agent.chat", e);
      send("error", { error: e?.name === "AiError" ? e.message : "The AI ran into a problem — try again.", status: e?.status || 500 });
    }
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  });

  router.post("/api/agent/task", configured, async (req, res, next) => {
    const mode = String(req.body?.mode || "");
    if (!MODES[mode] || !PUBLIC_MODES.has(mode)) return res.status(400).json({ ok: false, error: "Unknown AI task" });
    (mode === "complete" ? completeLimiter : taskLimiter)(req, res, () => {
      // Studio authoring also needs the studio password (or an admin).
      if (mode === "studio_author") return studioAuth(req, res, next);
      next();
    });
  });
  router.post("/api/agent/task", async (req, res) => {
    const { mode, ...input } = req.body || {};
    const ctrl = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) ctrl.abort();
    });
    try {
      const result = await agent.runTask(mode, input, { user: req.sessionUser, signal: ctrl.signal });
      res.json({ ok: true, result });
    } catch (e) {
      sendError(res, e, `agent.task.${mode}`);
    }
  });

  router.get("/api/agent/conversations", async (req, res) => {
    try {
      res.json({ ok: true, conversations: await agent.listConversations(req.sessionUser.username) });
    } catch (e) {
      sendError(res, e, "agent.conversations");
    }
  });

  router.get("/api/agent/conversations/:id", async (req, res) => {
    try {
      const messages = await agent.getConversation(req.sessionUser.username, req.params.id);
      if (!messages.length) return res.status(404).json({ ok: false, error: "Conversation not found" });
      res.json({ ok: true, conversationId: req.params.id, messages });
    } catch (e) {
      sendError(res, e, "agent.conversation");
    }
  });

  router.delete("/api/agent/conversations/:id", async (req, res) => {
    try {
      const n = await agent.deleteConversation(req.sessionUser.username, req.params.id);
      if (!n) return res.status(404).json({ ok: false, error: "Conversation not found" });
      res.json({ ok: true });
    } catch (e) {
      sendError(res, e, "agent.conversation.delete");
    }
  });

  return router;
}

module.exports = { createAgentRouter, sendError };
