// The smart router: decide what kind of job a request is, then pick the best
// (key, model) for it among everything connected — free tiers, subscription
// agents (Claude Code, Codex) and paid API keys.
//
// Principle: cheap and free models take the volume (mechanical edits, reading,
// searching); strong models take the work that needs them; subscription agents
// (flat-rate, no per-token cost) are preferred for real coding when a machine
// is available. Every pick comes with a one-line explanation, and measured
// results (perf.js) move models up or down over time.
const { all, json } = require("./db");
const keys = require("./keys");
const perf = require("./perf");
const machines = require("./machines");
const { vendorOf, keyVendor } = require("./providers");
const { isChatModel } = require("./models");
const { KINDS, MIN_QUALITY, CARDS, cardFor, quality, baseId } = require("./catalog");

/* ── 1. what kind of job is this? ─────────────────────────────────────── */
const RULES = [
  ["hard", 3, /\b(refactor|re-?architect|architecture|redesign|migrat\w*|concurren\w*|race condition|deadlock|memory leak|performance (issue|problem|regression)|across (the|all|multiple|every)|multi-?file|rewrite (the|this|our)|from scratch|design (the|a|an) (system|schema|architecture)|vulnerab\w*|flaky|intermittent|root cause|scal(e|ing) (to|up)|overhaul)\b/i],
  ["review", 3, /\b(review|audit|critique|find (the |any )?bugs|code review|check (this|the|my|our) (code|changes|pr|diff|implementation)|security (review|audit|check)|look for (bugs|issues|problems)|what('s| is) wrong with)\b/i],
  ["mechanical", 2, /\b(rename|reformat|format(ting)?|lint(ing)?|typos?|docstrings?|jsdoc|add comments|boilerplate|scaffold|translate|convert \w+ to|bump|update (the )?versions?|sort imports|stub|regex|json to|yaml to|csv)\b/i],
  ["search", 2, /\b(where (is|are|do|does)|find (where|the file|all|every)|locate|which files?|grep|map (the|this|our) (code|repo|codebase)|list (all|every))\b/i],
  ["reading", 2, /\b(explain|summari[sz]e|summary of|what does|how does|walk me through|tl;?dr|overview of|describe (how|what)|understand)\b/i],
  ["writing", 2, /\b(write (a |an |the |some )?(doc|docs|documentation|readme|lesson|lessons|blog|post|article|email|copy|guide|tutorial|changelog|release notes|proposal|plan|spec|description)|draft|proofread|copywrit\w*|editorial)\b/i],
  ["coding", 1, /\b(add|implement|build|create|make|fix|bug|endpoint|feature|component|page|tests?|api|function|route|integrat\w*|wire|hook up|support)\b/i],
];
const ORDER = ["chat", "mechanical", "search", "reading", "writing", "coding", "review", "hard"];

/** Classify a request. `agent`: work on a codebase (default kind coding) vs chat. */
function classify(prompt, { agent = true } = {}) {
  const text = String(prompt || "");
  const scores = {};
  for (const [kind, w, re] of RULES) {
    const hits = text.match(new RegExp(re.source, "gi"));
    if (hits) scores[kind] = (scores[kind] || 0) + w * Math.min(3, hits.length);
  }
  let kind = agent ? "coding" : "chat";
  let best = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > best || (v === best && ORDER.indexOf(k) > ORDER.indexOf(kind))) {
      kind = k;
      best = v;
    }
  }
  // Long, detailed requests touching many files are rarely "simple".
  const files = (text.match(/[\w./-]+\.(js|ts|tsx|jsx|py|go|rs|java|css|html|md|json|sql)\b/g) || []).length;
  if ((kind === "coding" || kind === "mechanical") && (text.length > 2500 || files >= 5)) kind = "hard";
  if (!agent && kind === "coding" && !/```|\bcode\b|function|bug|error|stack trace/i.test(text)) kind = "chat";
  return { kind, label: KINDS[kind].label, confidence: best >= 3 ? "high" : best ? "medium" : "low", scores };
}

/* ── 2. who could do it? ──────────────────────────────────────────────── */
const COST_RANK = { free: 0, sub: 0, low: 1, mid: 2, high: 3 };
const COST_LABEL = { free: "free", sub: "your plan — no extra cost", low: "low cost", mid: "mid price", high: "premium" };
const LIGHT = new Set(["chat", "mechanical", "reading", "search"]);

/** Models of one key worth considering (known cards first, capped). */
function modelsOf(row, vendor) {
  if (vendor.subscription) return [row.default_pinned && row.default_model ? row.default_model : "default"];
  if (row.default_pinned && row.default_model) return [row.default_model];
  const list = json(row.models_json, []).filter(isChatModel);
  const seen = new Set();
  const out = [];
  // One model per catalogue family (the first listed), known families only;
  // ":free" variants are kept alongside the paid ones.
  for (const m of list) {
    const id = baseId(m);
    const card = CARDS.find((c) => c.match.test(id));
    if (!card) continue;
    const k = `${card.id}${/:free$/.test(m) ? ":free" : ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
    if (out.length >= 40) break;
  }
  if (row.default_model && !out.includes(row.default_model)) out.push(row.default_model);
  if (!out.length && list.length) out.push(list[0]);
  return out;
}

/**
 * Every usable (key, model) for a kind with its quality and cost class.
 * opts: { kind, needTools, machineId, chat, exclude: { keys, vendorModels } }
 */
async function candidates({ kind = "coding", needTools = true, machineId = null, chat = false, exclude = {}, freeOnly = false, noSubscription = false } = {}) {
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
  const out = [];
  for (const r of rows) {
    if (exclude.keys?.includes(r.id)) continue;
    let v;
    try {
      v = vendorOf(keyVendor(r));
    } catch {
      continue;
    }
    if (exclude.vendors?.includes(v.id)) continue;
    if (needTools && !v.caps.tools) continue;
    if (r.status === "invalid" && Date.now() - Number(r.updated_at || 0) < 10 * 60_000) continue;
    if (!(await keys.hasBudget(r))) continue;
    if (v.subscription && noSubscription) continue;
    if (v.subscription) {
      if (!r.machine_id || !machines.isOnline(r.machine_id)) continue;
      // Agents run where the work is: the CLI must live on the task's machine.
      if (!chat && (!machineId || r.machine_id !== machineId)) continue;
    }
    for (const model of modelsOf(r, v)) {
      if (exclude.vendorModels?.includes(`${v.id}|${model}`)) continue;
      const card = cardFor(model, v.id);
      if (needTools && card.tools === false) continue;
      const cost = v.subscription ? "sub" : r.free_tier || /:free$/.test(model) ? "free" : card.tier || "mid";
      if (freeOnly && cost !== "free" && cost !== "sub") continue;
      let q = quality(card, kind);
      const adj = await perf.adjustment(v.id, model, kind);
      q += adj.delta;
      // Save plan windows for real work: light jobs prefer other free options.
      if (v.subscription && LIGHT.has(kind)) q -= 8;
      if (r.status === "error") q -= 5;
      out.push({ key: r, vendor: v.id, vendorLabel: v.label, model, card, cost, quality: Math.round(q), measured: adj.stat, priority: Number(r.priority || 0) });
    }
  }
  return out;
}

/* ── 3. pick ──────────────────────────────────────────────────────────── */
function rank(list, kind, preference = "balanced") {
  const bar = MIN_QUALITY[kind] ?? 60;
  const good = list.filter((c) => c.quality >= bar);
  const pool = good.length ? good : list;
  const score = (c) => {
    const base = preference === "quality" ? c.quality * 2 - COST_RANK[c.cost] * 3 : preference === "savings" ? c.quality - COST_RANK[c.cost] * 30 : c.quality - COST_RANK[c.cost] * 8;
    return base + c.priority; // staff can nudge keys (Keys → priority)
  };
  return { ranked: [...pool].sort((a, b) => score(b) - score(a) || b.quality - a.quality), meetsBar: good.length > 0, bar };
}

function explain(c, kind, meetsBar, bar) {
  const parts = [`${KINDS[kind].label} → ${c.card.name}${c.card.guessed ? ` (${c.model})` : ""} on ${c.vendorLabel} · ${COST_LABEL[c.cost]}`];
  parts.push(`fit ${c.quality}/100`);
  if (c.measured?.runs) parts.push(`${c.measured.ok}/${c.measured.runs} past runs succeeded here`);
  if (!meetsBar) parts.push(`nothing connected reaches the usual bar of ${bar} for this kind of work — add a stronger key or a subscription agent for better results`);
  return parts.join(" · ");
}

async function preferenceOf() {
  const { resolvePlugins } = require("./plugins");
  const p = (await resolvePlugins(null)).builtins.smart_router;
  return p?.config?.preference || "balanced";
}

/**
 * Route a request. Returns { kind, pick: { provider, keyId, model, quality,
 * cost, card }, alternatives, note } or throws when nothing is connected.
 */
async function route({ prompt = "", kind = null, needTools = true, machineId = null, chat = false, exclude = {}, preference = null, freeOnly = false, noSubscription = false } = {}) {
  const k = kind && KINDS[kind] ? kind : classify(prompt, { agent: !chat }).kind;
  const list = await candidates({ kind: k, needTools, machineId, chat, exclude, freeOnly, noSubscription });
  if (!list.length) {
    const any = await all("SELECT id FROM hive_keys WHERE disabled=0");
    const why = freeOnly ? "No free model is available right now (add more free keys, or allow paid models)" : any.length ? "No connected model can take this right now (all out of budget, paused or offline) — check Keys" : "Connect a model first: add a free key (Keys → Free models) or a subscription agent";
    throw Object.assign(new Error(why), { status: 409 });
  }
  const { ranked, meetsBar, bar } = rank(list, k, preference || (await preferenceOf()));
  const top = ranked[0];
  const alt = ranked.slice(1, 5).map((c) => ({ provider: c.vendor, keyId: c.key.id, model: c.model, name: c.card.name, quality: c.quality, cost: c.cost }));
  return {
    kind: k,
    pick: { provider: top.vendor, keyId: top.key.id, keyLabel: top.key.label, model: top.model, quality: top.quality, cost: top.cost, name: top.card.name, lab: top.card.lab },
    alternatives: alt,
    note: explain(top, k, meetsBar, bar),
  };
}

/**
 * A stronger model to take over after a failure. Must beat the previous
 * quality by a margin and not be the same vendor+model.
 */
async function escalate({ kind, from, machineId, exclude = {}, freeOnly = false }) {
  const list = await candidates({ kind, needTools: true, machineId, freeOnly, exclude: { ...exclude, vendorModels: [...(exclude.vendorModels || []), `${from.provider}|${from.model}`] } });
  const better = list.filter((c) => c.quality >= (from.quality || 0) + 6);
  if (!better.length) return null;
  const { ranked } = rank(better, kind, "balanced");
  const c = ranked[0];
  return { provider: c.vendor, keyId: c.key.id, model: c.model, quality: c.quality, name: c.card.name, cost: c.cost };
}

/**
 * Who continues when a model or plan hits its limit: the best model for the
 * SAME kind of work, free first, never the one that just ran out.
 */
async function continuation({ kind, from, machineId, excludeKeys = [], allowSubscription = false }) {
  const list = await candidates({ kind, needTools: true, machineId, noSubscription: !allowSubscription, exclude: { keys: excludeKeys, vendorModels: [`${from.provider}|${from.model}`] } });
  if (!list.length) return null;
  const { ranked, meetsBar } = rank(list, kind, "balanced");
  const c = ranked[0];
  return { provider: c.vendor, keyId: c.key.id, model: c.model, name: c.card.name, quality: c.quality, cost: c.cost, note: explain(c, kind, meetsBar, MIN_QUALITY[kind]) };
}

/** A reviewer from a DIFFERENT vendor than the authors (cross-vendor review). */
async function reviewer({ authors = [], machineId = null }) {
  const list = (await candidates({ kind: "review", needTools: true, machineId })).filter((c) => !authors.includes(c.vendor));
  const pool = list.length ? list : await candidates({ kind: "review", needTools: true, machineId });
  if (!pool.length) return null;
  const { ranked } = rank(pool, "review", "balanced");
  const c = ranked[0];
  return { provider: c.vendor, keyId: c.key.id, model: c.model, name: c.card.name, quality: c.quality, cost: c.cost, crossVendor: !authors.includes(c.vendor) };
}

module.exports = { classify, candidates, route, escalate, continuation, reviewer, rank, COST_LABEL };
