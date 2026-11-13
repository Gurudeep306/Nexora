// Token Steward: the AI that spends your tokens wisely.
//
//  1. Compacts long chats — older turns are folded into a running summary
//     written by a FREE model and cached on the conversation, so every new
//     message re-sends a few thousand tokens instead of the whole history.
//  2. Keeps tool output lean (search results, pages, MCP replies are clipped).
//  3. Audits spend (hive_usage_detail × model cards × plugin settings) and
//     produces concrete savings with one-click fixes: turn on token-saving
//     plugins, route by savings, connect free sources, add a cap, trim tools.
//  4. Plans a prompt: which model is enough for it, the cheapest and the
//     best choice side by side, and the estimated cost of each.
//  5. Answers questions about cost and tooling ("ask the Steward"), grounded
//     in your real numbers and the open-source tools catalogue — using a free
//     model when one is connected.
const { run, all, get, json } = require("./db");
const { resolvePlugins, setBuiltin } = require("./plugins");
const { cardFor, priceOf, FREE_SOURCES, KINDS } = require("./catalog");

const est = (s) => Math.ceil(String(s || "").length / 3.6);
const msgTokens = (m) => est(m.text) + (m.attachments?.length || 0) * 1500 + (m.toolCalls ? est(JSON.stringify(m.toolCalls)) : 0);

async function config(projectId) {
  const p = (await resolvePlugins(projectId || null)).builtins.token_steward;
  return { enabled: !!p?.enabled, triggerTokens: Number(p?.config?.triggerTokens) || 24000, keepTokens: Number(p?.config?.keepTokens) || 8000, maxToolChars: Number(p?.config?.maxToolChars) || 12000 };
}

/**
 * Fold older turns into a cached summary when the history is long.
 * messages: [{role:'user'|'assistant', text, attachments?}] (chat format).
 * Returns { messages, compacted: null | {folded, saved, model} }.
 */
async function compactHistory(convo, messages, { username = "hive" } = {}) {
  const cfg = await config(convo.project_id);
  if (!cfg.enabled) return { messages, compacted: null };
  const total = messages.reduce((n, m) => n + msgTokens(m), 0);
  if (total < cfg.triggerTokens || messages.length < 6) return { messages, compacted: null };
  // Keep the newest turns that fit in keepTokens; the cut must land on a user turn.
  let keepFrom = messages.length;
  let kept = 0;
  while (keepFrom > 1 && kept + msgTokens(messages[keepFrom - 1]) <= cfg.keepTokens) kept += msgTokens(messages[--keepFrom]);
  while (keepFrom < messages.length - 1 && messages[keepFrom].role !== "user") keepFrom++;
  if (keepFrom >= messages.length - 1) keepFrom = messages.length - 1; // always keep the latest question
  while (keepFrom > 0 && messages[keepFrom].role !== "user") keepFrom--;
  if (keepFrom < 2) return { messages, compacted: null };

  const cached = json(convo.summary_json, null);
  let summary = cached && cached.upto <= keepFrom ? cached : null;
  let model = summary?.model || null;
  if (!summary || summary.upto < keepFrom) {
    const from = summary ? summary.upto : 0;
    const slice = messages
      .slice(from, keepFrom)
      .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${String(m.text || "").slice(0, 12000)}${m.attachments?.length ? ` [${m.attachments.length} attachment(s)]` : ""}`)
      .join("\n\n");
    const llm = require("./llm");
    try {
      const r = await llm.ask({
        kind: "reading",
        preference: "savings",
        freeOnly: true,
        username,
        projectId: convo.project_id || "",
        system:
          "You maintain the running memory of a long conversation so it can continue without re-reading everything. Write a dense factual summary: goals, decisions, facts, names, numbers, code identifiers, file names, open questions and what was promised next. No pleasantries. Markdown bullets. At most ~900 words.",
        prompt: `${summary ? `Summary so far:\n${summary.text}\n\n` : ""}New turns to fold in:\n\n${slice.slice(0, 120000)}\n\nWrite the updated summary.`,
      });
      model = r.model;
      summary = { upto: keepFrom, text: r.text.trim().slice(0, 9000), model, at: Date.now() };
      await run("UPDATE hive_convos SET summary_json=? WHERE id=?", [JSON.stringify(summary), convo.id]);
    } catch {
      return { messages, compacted: null }; // never block a reply on housekeeping
    }
  }
  const recent = messages.slice(summary.upto);
  const out = [{ role: "user", text: `(Context from earlier in this conversation, summarised to save tokens)\n\n${summary.text}` }, { role: "assistant", text: "Got it — I have the earlier context." }, ...recent];
  const after = out.reduce((n, m) => n + msgTokens(m), 0);
  return { messages: out, compacted: { folded: summary.upto, saved: Math.max(0, total - after), model } };
}

/** Clip a tool result to the Steward's limit. */
async function clipTool(text, projectId) {
  const cfg = await config(projectId);
  const s = String(text);
  if (!cfg.enabled || s.length <= cfg.maxToolChars) return s;
  return `${s.slice(0, cfg.maxToolChars)}\n… [${s.length - cfg.maxToolChars} more characters trimmed by Token Steward — ask for a specific part if you need it]`;
}

/* ── audit ──────────────────────────────────────────────────────────── */
const SAVERS = ["token_steward", "smart_router", "repo_map", "context_trim", "lean_reads", "prompt_cache"];

async function report({ days = 30 } = {}) {
  const since = new Date(Date.now() - (days - 1) * 86400e3).toISOString().slice(0, 10);
  const rows = await all("SELECT vendor, model, SUM(input_tokens) AS input, SUM(output_tokens) AS output, SUM(cached_tokens) AS cached, SUM(requests) AS requests, SUM(cost_micros) AS cost FROM hive_usage_detail WHERE day>=? GROUP BY vendor, model", [since]);
  const keys = await all("SELECT id, provider, free_tier, disabled FROM hive_keys");
  const plugins = (await resolvePlugins(null)).builtins;
  const caps = await all("SELECT id FROM hive_caps").catch(() => []);
  const mcp = await all("SELECT tools_json FROM hive_integrations WHERE kind='mcp' AND enabled=1").catch(() => []);
  const mcpTools = mcp.reduce((n, r) => n + json(r.tools_json, []).length, 0);

  const tiers = { free: 0, sub: 0, low: 0, mid: 0, high: 0 };
  let dollars = 0;
  let input = 0;
  let output = 0;
  let cached = 0;
  const models = rows.map((r) => {
    const card = cardFor(r.model, r.vendor);
    const free = keys.some((k) => k.provider === r.vendor && k.free_tier) || /:free$/.test(r.model);
    const tier = r.vendor === "claude_code" || r.vendor === "codex" ? "sub" : free ? "free" : card?.tier || "mid";
    const usd = Number(r.cost || 0) / 1e6;
    tiers[tier] += usd;
    dollars += usd;
    input += Number(r.input || 0);
    output += Number(r.output || 0);
    cached += Number(r.cached || 0);
    return { vendor: r.vendor, model: r.model, name: card?.name || r.model, tier, input: Number(r.input || 0), output: Number(r.output || 0), cached: Number(r.cached || 0), requests: Number(r.requests || 0), dollars: usd };
  });
  models.sort((a, b) => b.dollars - a.dollars || b.input + b.output - (a.input + a.output));
  const tokens = input + output;
  const freeTokens = models.filter((m) => m.tier === "free" || m.tier === "sub").reduce((n, m) => n + m.input + m.output, 0);
  const monthly = days ? (dollars / days) * 30 : 0;

  const tips = [];
  const tip = (t) => tips.push(t);
  const on = (id) => !!plugins[id]?.enabled;

  if (!on("token_steward")) tip({ id: "steward", impact: "high", title: "Turn on the Token Steward", detail: "Long chats get folded into a running summary by a free model, and tool output is trimmed. Typical long conversations drop 60–85% of their input tokens.", action: { type: "plugin", plugin: "token_steward", enabled: true } });
  if (!on("smart_router")) tip({ id: "router", impact: "high", title: "Turn on the Smart router", detail: "Easy work goes to free and cheap models; strong models only where they are needed.", action: { type: "plugin", plugin: "smart_router", enabled: true } });
  const highShare = dollars ? tiers.high / dollars : 0;
  if (on("smart_router") && highShare > 0.4 && (plugins.smart_router?.config?.preference || "balanced") !== "savings")
    tip({ id: "savings", impact: "high", title: `${Math.round(highShare * 100)}% of spend is on premium models`, detail: `Switch the router to “savings”: premium models stay for hard engineering and review, everything else moves down. Estimated saving ≈ $${(tiers.high * 0.5 * (30 / days)).toFixed(2)}/month.`, action: { type: "plugin", plugin: "smart_router", config: { preference: "savings" } } });
  for (const id of ["prompt_cache", "context_trim", "repo_map", "lean_reads"]) {
    if (!on(id)) tip({ id, impact: id === "prompt_cache" ? "high" : "medium", title: `Turn on ${plugins[id]?.name || id}`, detail: plugins[id]?.description || "", action: { type: "plugin", plugin: id, enabled: true } });
  }
  const anthropicIn = models.filter((m) => m.vendor === "anthropic").reduce((n, m) => n + m.input, 0);
  if (anthropicIn > 200000 && cached / Math.max(1, anthropicIn) < 0.15 && on("prompt_cache"))
    tip({ id: "cachehit", impact: "medium", title: "Low cache hit rate on Claude", detail: "Only a small part of Claude input is served from cache. Keep project instructions and system prompts stable (don't paste changing timestamps or logs at the top) so the cached prefix can be reused." });
  const freeVendors = new Set(keys.filter((k) => k.free_tier && !k.disabled).map((k) => k.provider));
  const missingFree = FREE_SOURCES.filter((s) => !freeVendors.has(s.vendor)).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 4);
  if (freeVendors.size < 3 && missingFree.length)
    tip({ id: "free", impact: freeVendors.size ? "medium" : "high", title: freeVendors.size ? "Add more free sources" : "Connect free models", detail: `Free tiers take reading, search, summaries and chat off your paid keys. Best next: ${missingFree.map((s) => s.name).join(", ")}.`, action: { type: "connect", vendors: missingFree.map((s) => s.vendor) } });
  if (!caps.length) tip({ id: "cap", impact: "medium", title: "Set a monthly spending cap", detail: `You're on track for about $${monthly.toFixed(2)} this month. A cap pauses paid keys at the limit (free and subscription models keep working) and alerts at 80%.`, action: { type: "cap", suggest: Math.max(10, Math.ceil((monthly * 1.2) / 5) * 5) } });
  if (mcpTools > 40) tip({ id: "mcp", impact: "medium", title: `${mcpTools} MCP tools are switched on`, detail: "Every tool definition is sent with every chat request. Disable servers you aren't using this week (Plugins → Connected tools).", action: { type: "open", to: "/hive/plugins?tab=connected" } });
  const out = models.reduce((n, m) => n + m.output, 0);
  if (tokens > 500000 && out / Math.max(1, tokens) > 0.35 && !on("terse")) tip({ id: "terse", impact: "low", title: "Answers are long", detail: "Output tokens cost 4–5× input. Terse mode keeps agent narration short.", action: { type: "plugin", plugin: "terse", enabled: true } });
  const top = models[0];
  if (top && dollars > 1 && top.dollars / dollars > 0.6 && top.tier === "high")
    tip({ id: "top", impact: "medium", title: `${top.name} is ${Math.round((top.dollars / dollars) * 100)}% of all spend`, detail: "Check which projects use it pinned (Usage → by project). Pinned agents bypass the router — set them to Auto unless the task is truly hard." });

  const order = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => order[a.impact] - order[b.impact]);
  const score = Math.max(0, Math.min(100, Math.round(100 - tips.reduce((n, t) => n + (t.impact === "high" ? 18 : t.impact === "medium" ? 8 : 3), 0))));
  return {
    days,
    since,
    score,
    totals: { dollars, monthly, input, output, cached, tokens, freeShare: tokens ? freeTokens / tokens : 0, cacheShare: input ? cached / input : 0 },
    tiers,
    models: models.slice(0, 12),
    savers: SAVERS.map((id) => ({ id, name: plugins[id]?.name || id, enabled: on(id) })),
    tips,
  };
}

async function apply(action, by) {
  if (!action || typeof action !== "object") throw Object.assign(new Error("Nothing to apply"), { status: 400 });
  if (action.type === "plugin") {
    await setBuiltin("*", String(action.plugin), { enabled: action.enabled, config: action.config }, by);
    return { ok: true, message: "Done — the change applies to every new request." };
  }
  if (action.type === "cap") {
    const caps = require("./caps");
    await caps.create({ scopeType: "all", scope: "*", period: "month", dollars: Number(action.dollars || action.suggest) || 25, action: "block" }, by);
    return { ok: true, message: "Monthly cap added." };
  }
  throw Object.assign(new Error("This suggestion is done by hand"), { status: 400 });
}

/** Which model is enough for this prompt — cheapest vs best, with estimated cost. */
async function plan({ prompt, chat = false }) {
  const router = require("./router");
  const tokensIn = est(prompt) + (chat ? 1500 : 30000); // agents read code; chat sends history
  const tokensOut = chat ? 800 : 6000;
  const price = (p) => {
    if (p.cost === "free" || p.cost === "sub") return 0;
    const card = cardFor(p.model, p.provider);
    return card ? priceOf(card, tokensIn, tokensOut) : null;
  };
  const [cheap, best] = await Promise.all([router.route({ prompt, chat, needTools: !chat, preference: "savings" }).catch(() => null), router.route({ prompt, chat, needTools: !chat, preference: "quality" }).catch(() => null)]);
  if (!cheap && !best) throw Object.assign(new Error("Connect a model first"), { status: 409 });
  const kind = (cheap || best).kind;
  const pack = (r) => (r ? { ...r.pick, dollars: price(r.pick), note: r.note } : null);
  const a = pack(cheap);
  const b = pack(best);
  return { kind, kindLabel: KINDS[kind]?.label || kind, tokensIn, tokensOut, cheapest: a, best: b, same: !!a && !!b && a.provider === b.provider && a.model === b.model };
}

/** Ask the Steward anything about cost, models and tools. */
async function ask({ question, username = "hive" }) {
  const llm = require("./llm");
  const toolbox = require("./toolbox");
  const r = await report({ days: 30 });
  const facts = {
    spend30d: `$${r.totals.dollars.toFixed(2)} (≈ $${r.totals.monthly.toFixed(2)}/month)`,
    tokens: r.totals.tokens,
    freeShare: `${Math.round(r.totals.freeShare * 100)}%`,
    cacheShare: `${Math.round(r.totals.cacheShare * 100)}%`,
    byTier: r.tiers,
    topModels: r.models.slice(0, 6).map((m) => `${m.name} (${m.vendor}, ${m.tier}): $${m.dollars.toFixed(2)}, ${m.input + m.output} tokens`),
    savers: r.savers.map((s) => `${s.name}: ${s.enabled ? "on" : "off"}`),
    openSuggestions: r.tips.map((t) => t.title),
  };
  const tools = ["gateways", "observability", "agents", "data", "local"].map((c) => toolbox.compactIndex(c)).join("\n").slice(0, 14000);
  const res = await llm.ask({
    kind: "writing",
    preference: "savings",
    freeOnly: true,
    username,
    system: `You are the Token Steward of Nexora Hive — a frugal, practical expert in LLM cost: routing, caching, context compaction, free model tiers, local models, gateways and token-efficient tooling. Hive already has: smart router (free/sub first), escalation, prompt caching, context trimmer, repo map, lean reads, terse mode, chat compaction, budgets/caps, free sources (GitHub Models, Gemini, Groq, Cerebras, OpenRouter :free, Mistral, NVIDIA, SambaNova, HF, Cloudflare, Ollama), subscription agents (Claude Code, Codex via a worker machine), MCP servers and search engines in Plugins. Ground every answer in the numbers below. Give concrete steps in Hive (which page, which switch). Recommend open-source tools from the catalogue only when Hive doesn't already cover it. Be brief: bullets, at most ~250 words.\n\nThis workspace, last 30 days:\n${JSON.stringify(facts, null, 1)}\n\nOpen-source tools catalogue (subset):\n${tools}`,
    prompt: String(question).slice(0, 4000),
  });
  return { answer: res.text, model: res.model, provider: res.provider };
}

module.exports = { compactHistory, clipTool, report, apply, plan, ask, config };
