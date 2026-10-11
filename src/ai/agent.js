/* ========== The Nexora AI agent ==========
   One server-side agent, powered only by Groq, behind every AI feature.

   runChat()  — streaming tutor/assistant chat with tools, per-user history.
   runTask()  — one-shot, non-streaming task (modes.js): completion, fix,
                coach, translate, studio, GATE narrative, …

   Both enforce: GROQ_API_KEY configured (else 503), and the per-user daily
   token budget (AI_DAILY_TOKENS, else 429). The user is always the session
   user passed in by the route — never a name from the request body. */
const crypto = require("crypto");
const { get, all, run } = require("../db");
const { runAs, me } = require("../context");
const { groq, models, AiError, isConfigured, NOT_CONFIGURED } = require("./groq");
const { MODES } = require("./modes");
const P = require("./prompts");
const tools = require("./tools");
const D = require("./data");
const { extractAnimation, wantsAnimation } = require("./animation");

const MAX_ROUNDS = 5;
const MAX_PARALLEL_TOOLS = 3;
const HISTORY_TURNS = 20;

/* ── budget ── */
const today = () => new Date().toISOString().slice(0, 10);
const dailyLimit = () => {
  const n = Number(process.env.AI_DAILY_TOKENS);
  return Number.isFinite(n) && n > 0 ? n : 200000;
};

async function usedToday(username) {
  const r = await get("SELECT tokens FROM ai_usage WHERE username=? AND day=?", [username, today()]).catch(() => null);
  return r?.tokens || 0;
}

async function addUsage(username, usage) {
  const n = Math.max(0, Math.round(Number(usage?.total_tokens) || (Number(usage?.prompt_tokens) || 0) + (Number(usage?.completion_tokens) || 0)));
  if (!n || !username) return;
  await run(
    `INSERT INTO ai_usage(username, day, tokens) VALUES(?,?,?)
     ON CONFLICT(username, day) DO UPDATE SET tokens = tokens + excluded.tokens`,
    [username, today(), n],
  ).catch((e) => console.warn("[ai] usage not recorded:", e.message));
}

async function assertReady(username) {
  if (!isConfigured()) throw new AiError(NOT_CONFIGURED, 503, "not_configured");
  if (!username) throw new AiError("Please sign in first", 401, "auth");
  if ((await usedToday(username)) >= dailyLimit()) {
    throw new AiError("daily AI budget used — it resets at midnight UTC", 429, "budget");
  }
}

/* ── one-shot tasks ── */
const taskCache = new Map(); // LRU: key → { value, ts }
const CACHE_MAX = 400;
const CACHE_TTL = 90 * 1000;

function cacheGet(key) {
  const hit = taskCache.get(key);
  if (!hit) return undefined;
  taskCache.delete(key);
  if (Date.now() - hit.ts > CACHE_TTL) return undefined;
  taskCache.set(key, hit);
  return hit.value;
}
function cacheSet(key, value) {
  taskCache.set(key, { value, ts: Date.now() });
  while (taskCache.size > CACHE_MAX) taskCache.delete(taskCache.keys().next().value);
}

/**
 * Run one task mode for `user` ({ username }). Resolves to the mode's result.
 * Throws AiError (status 400/401/429/502/503/504).
 */
async function runTask(mode, input = {}, { user, signal, client } = {}) {
  const def = MODES[mode];
  if (!def) throw new AiError(`Unknown AI task "${String(mode).slice(0, 40)}"`, 400, "bad_mode");
  const username = user?.username || "";
  await assertReady(username);

  const messages = def.build(input || {});
  let key = null;
  if (def.cache) {
    key = `${mode}:${crypto.createHash("sha1").update(JSON.stringify(messages)).digest("hex")}`;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
  }

  const m = models();
  const out = await (client || groq()).chat({
    model: def.model === "fast" ? m.fast : m.main,
    // Ghost completions must be fast or useless: don't fall back to a big model.
    fallbackModel: mode === "complete" ? null : undefined,
    messages,
    json: !!def.json,
    maxTokens: def.maxTokens,
    temperature: def.temperature,
    reasoningEffort: def.reasoning,
    stop: def.stop,
    timeoutMs: def.timeoutMs,
    signal,
  });
  await addUsage(username, out.usage);
  const result = def.post(out.content, input || {});
  if (key && result != null) cacheSet(key, result);
  return result;
}

/* ── chat ── */
const CONV_RE = /^[A-Za-z0-9_-]{8,64}$/;
const newConversationId = () => crypto.randomUUID();

async function loadHistory(username, conversationId) {
  const rows = await all(
    `SELECT role, content FROM ai_user_chats WHERE username=? AND conversation_id=? ORDER BY id DESC LIMIT ?`,
    [username, conversationId, HISTORY_TURNS],
  );
  return rows
    .reverse()
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({ role: r.role, content: String(r.content).slice(0, 4000) }));
}

/* ── page context ──
   What the student is looking at, sent by the floating assistant with every
   message. All of it is untrusted: it is capped, stringified, and only ever
   reaches the model inside a <data> block. The page kind and exam state are
   decided here, on the server. */
const PAGE_LIMITS = {
  path: 200,
  title: 200,
  label: 120,
  code: 12000,
  language: 20,
  selection: 3000,
  visibleText: 6000,
  gateQuestionId: 60,
  gateQuestionText: 3000,
  learnTopic: 120,
  verdict: 300,
  filters: 600,
};

const str = (v, max) => (v == null || typeof v === "object" ? "" : String(v).slice(0, max).trim());

/** Coerce the client's page object into capped strings and real booleans. */
function normalizePage(page) {
  const src = page && typeof page === "object" && !Array.isArray(page) ? page : {};
  const out = {};
  for (const [k, max] of Object.entries(PAGE_LIMITS)) {
    const v = str(src[k], max);
    if (v) out[k] = v;
  }
  const pid = src.problemId;
  if (typeof pid === "number" || typeof pid === "string") {
    const v = String(pid).slice(0, 80).trim();
    if (v) out.problemId = v;
  }
  out.kind = P.pageKind(out.path);
  out.gateAnswered = src.gateAnswered === true;
  // A /gate/cbt/<paper> page is an active exam unless the client says the
  // paper has been submitted; the client may also flag an exam anywhere.
  out.examActive = src.examActive === true || (out.kind === "gate-exam" && src.examReview !== true);
  return out;
}

/**
 * Pure: the page-context text for the model, from a normalized page and any
 * server lookups ({ problem, learnSolved }). Returns { text, solved }.
 */
function describePage(page, { problem = null, learnSolved = false } = {}) {
  const parts = [];
  let solved = false;
  const pid = page.problemId || "";
  if (page.path) parts.push(`Page: ${page.path} (${page.kind})`);
  if (page.examActive) parts.push("EXAM STATUS: a timed GATE mock exam is ACTIVE — answers must not be revealed.");

  if (problem) {
    solved = problem.status === "solved";
    parts.push(
      `Problem #${problem.id}: ${problem.title} [${problem.platform} ${problem.code}] rating ${problem.rating ?? "?"}, tags: ${(problem.tags || []).join(", ") || "none"}`,
      `Student status on this problem: ${String(problem.status || "unsolved").toUpperCase()}`,
    );
    if (problem.statement) parts.push(`Statement:\n${String(problem.statement).slice(0, 5000)}`);
  } else if (pid && /^\/solve\/learn\//.test(page.path || "")) {
    solved = !!learnSolved;
    parts.push(`Course problem: ${pid}`, `Student status on this problem: ${solved ? "SOLVED" : "UNSOLVED"}`);
  } else if (pid) {
    parts.push(`Problem: ${pid}`, "Student status on this problem: UNSOLVED");
  }
  if (page.title && !problem) parts.push(`Title: ${page.title}`);
  if (page.learnTopic) parts.push(`Topic: ${page.learnTopic}`);
  if (page.filters) parts.push(`Active filters: ${page.filters}`);
  if (page.verdict) parts.push(`Last verdict: ${page.verdict}`);
  if (page.gateQuestionId) {
    parts.push(`GATE question on screen: ${page.gateQuestionId}`);
    if (!page.examActive) {
      parts.push(page.gateAnswered ? "The student has answered/checked this question (review mode)." : "The student has NOT answered this question yet.");
    }
  }
  if (page.gateQuestionText) parts.push(`Question text:\n${page.gateQuestionText}`);
  if (page.visibleText && !(problem && problem.statement)) parts.push(`On screen:\n${page.visibleText}`);
  if (page.code) parts.push(`Student's current ${page.language || ""} code:\n${page.code}`);
  if (page.selection) parts.push(`Selected text:\n${page.selection}`);
  return { text: parts.join("\n\n"), solved };
}

/** Server-verified page context: looks up the problem and solved status, then describes the page. */
async function pageContext(rawPage = {}) {
  const page = normalizePage(rawPage);
  const pid = page.problemId || "";
  let problem = null;
  let learnSolved = false;
  if (/^\d+$/.test(pid)) {
    problem = await D.getProblem(pid, { maxChars: 5000 }).catch(() => null);
  } else if (pid && /^\/solve\/learn\//.test(page.path || "")) {
    const r = await get("SELECT status FROM learn_progress WHERE username=? AND item=?", [me(), `code:${pid}`]).catch(() => null);
    learnSolved = r?.status === "solved" || r?.status === "correct";
  }
  return { ...describePage(page, { problem, learnSolved }), page };
}

/** Pure: the message list for one chat turn (system prompt, page data, history, question). */
function buildChatMessages({ ctx, history = [], text, animate = false }) {
  const { page } = ctx;
  return [
    { role: "system", content: P.chatSystem({ solved: ctx.solved && !page.examActive, animate, kind: page.kind, examActive: page.examActive }) },
    ...(ctx.text ? [{ role: "system", content: `What the student is looking at right now:\n${P.data("page", ctx.text, 30000)}` }] : []),
    ...history,
    { role: "user", content: text },
  ];
}

async function persistTurn(username, conversationId, role, content, visualization = null) {
  const r = await run(
    "INSERT INTO ai_user_chats (username, role, content, visualization, created_at, conversation_id) VALUES (?, ?, ?, ?, ?, ?)",
    [username, role, String(content).slice(0, 20000), visualization ? JSON.stringify(visualization) : null, new Date().toISOString(), conversationId],
  );
  return r?.lastID ?? null;
}

/**
 * Streaming chat. Calls onEvent(type, payload) with:
 *   meta{conversationId} · token{text} · tool{name,status,ok?} · action{type,path,label}
 *   animation{visualization} · done{conversationId,messageId,usage}
 * Throws AiError before streaming starts (not configured / budget) or mid-way.
 */
async function runChat({ user, conversationId, message, page = {}, animate = false, signal, onEvent = () => {}, client }) {
  const username = user?.username || "";
  await assertReady(username);
  const text = String(message || "").trim().slice(0, 4000);
  if (!text) throw new AiError("Message is required", 400, "bad_request");

  const convId = CONV_RE.test(String(conversationId || "")) ? String(conversationId) : newConversationId();
  onEvent("meta", { conversationId: convId });

  const history = await loadHistory(username, convId);
  const ctx = await runAs(username, () => pageContext(page || {}));
  // No animated walkthroughs during an exam: they would solve the question.
  const wantAnim = !ctx.page.examActive && (!!animate || wantsAnimation(text));
  const messages = buildChatMessages({ ctx, history, text, animate: wantAnim });

  const llm = client || groq();
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let reply = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1;
    let done = null;
    for await (const ev of llm.chatStream({
      model: models().main,
      messages,
      tools: tools.DEFINITIONS,
      toolChoice: last ? "none" : "auto",
      maxTokens: wantAnim ? 3000 : 1500,
      temperature: wantAnim ? 0.2 : 0.5,
      reasoningEffort: "low",
      timeoutMs: 90000,
      signal,
    })) {
      if (ev.type === "delta") {
        reply += ev.content;
        onEvent("token", { text: ev.content });
      } else if (ev.type === "done") done = ev;
    }
    if (done?.usage) {
      for (const k of Object.keys(usage)) usage[k] += Number(done.usage[k]) || 0;
    }
    const calls = (done?.toolCalls || []).filter((c) => c?.function?.name);
    if (!calls.length || last) break;

    messages.push({ role: "assistant", content: done.content || null, tool_calls: calls });
    for (let i = 0; i < calls.length; i += MAX_PARALLEL_TOOLS) {
      const batch = calls.slice(i, i + MAX_PARALLEL_TOOLS);
      for (const c of batch) onEvent("tool", { name: c.function.name, status: "running" });
      const results = await Promise.all(batch.map((c) => tools.runTool(c, { username, page: ctx.page })));
      results.forEach((r, j) => {
        onEvent("tool", { name: r.name, status: "done", ok: r.ok });
        if (r.action) onEvent("action", r.action);
        messages.push({ role: "tool", tool_call_id: batch[j].id || `call_${round}_${i + j}`, content: r.content });
      });
    }
    if (signal?.aborted) break;
  }

  let visualization = null;
  let saved = reply.trim();
  if (wantAnim) {
    const out = extractAnimation(reply);
    if (out.visualization) {
      visualization = out.visualization;
      saved = out.text;
      onEvent("animation", { visualization });
    }
  }

  await addUsage(username, usage);
  let messageId = null;
  if (saved || visualization) {
    try {
      await persistTurn(username, convId, "user", text);
      messageId = await persistTurn(username, convId, "assistant", saved || "(animation)", visualization);
    } catch (e) {
      console.warn("[ai] could not save chat turn:", e.message);
    }
  }
  onEvent("done", { conversationId: convId, messageId, usage });
  return { conversationId: convId, reply: saved, visualization, usage };
}

/* ── conversation storage (own rows only) ── */
async function listConversations(username) {
  const rows = await all(
    `SELECT conversation_id as id, MIN(created_at) as started, MAX(created_at) as updated, COUNT(*) as turns,
            (SELECT content FROM ai_user_chats c2 WHERE c2.username=c.username AND c2.conversation_id=c.conversation_id AND c2.role='user' ORDER BY c2.id ASC LIMIT 1) as title
     FROM ai_user_chats c WHERE username=? AND conversation_id IS NOT NULL
     GROUP BY conversation_id ORDER BY updated DESC LIMIT 50`,
    [username],
  );
  return rows.map((r) => ({ ...r, title: String(r.title || "Conversation").slice(0, 80) }));
}

async function getConversation(username, conversationId) {
  const rows = await all(
    "SELECT id, role, content, visualization, created_at FROM ai_user_chats WHERE username=? AND conversation_id=? ORDER BY id ASC LIMIT 200",
    [username, String(conversationId)],
  );
  return rows.map((r) => {
    let vis = null;
    if (r.visualization) {
      try {
        vis = JSON.parse(r.visualization);
      } catch {
        /* ignore */
      }
    }
    return { id: r.id, role: r.role, content: r.content, visualization: vis, createdAt: r.created_at };
  });
}

async function deleteConversation(username, conversationId) {
  const r = await run("DELETE FROM ai_user_chats WHERE username=? AND conversation_id=?", [username, String(conversationId)]);
  return r?.changes || 0;
}

module.exports = {
  runChat,
  normalizePage,
  describePage,
  buildChatMessages,
  PAGE_LIMITS,
  runTask,
  listConversations,
  getConversation,
  deleteConversation,
  usedToday,
  dailyLimit,
  _taskCache: taskCache,
};
