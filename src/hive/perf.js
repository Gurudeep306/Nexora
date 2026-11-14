// Measured performance: how each model actually does on this team's work, by
// task kind. Every finished agent adds a run (ok / failed, tokens, steps,
// time); shipping a task's changes marks its agents' work accepted, archiving
// it unshipped marks it rejected, and chat answers can be rated. The router
// blends these numbers with the public estimates in catalog.js.
const { run, get, all, now } = require("./db");

let cache = { at: 0, map: new Map() };
const keyOf = (vendor, model, kind) => `${vendor}|${model}|${kind}`;

async function load() {
  if (Date.now() - cache.at < 60_000) return cache.map;
  const rows = await all("SELECT * FROM hive_model_stats");
  cache = { at: Date.now(), map: new Map(rows.map((r) => [keyOf(r.vendor, r.model, r.kind), r])) };
  return cache.map;
}

async function bump(vendor, model, kind, fields) {
  if (!vendor || !model || !kind) return;
  const cols = Object.keys(fields);
  await run(
    `INSERT INTO hive_model_stats(vendor, model, kind, ${cols.join(", ")}, updated_at) VALUES(?,?,?,${cols.map(() => "?").join(",")},?)
     ON CONFLICT(vendor, model, kind) DO UPDATE SET ${cols.map((c) => `${c}=${c}+excluded.${c}`).join(", ")}, updated_at=excluded.updated_at`,
    [vendor, model, kind, ...cols.map((c) => Math.round(Number(fields[c]) || 0)), now()],
  );
  cache.at = 0;
}

/** One finished agent run. */
function recordRun({ vendor, model, kind, ok, tokens = 0, steps = 0, ms = 0 }) {
  return bump(vendor, model, kind || "coding", { runs: 1, ok: ok ? 1 : 0, failed: ok ? 0 : 1, tokens, steps, ms });
}

/** Humans shipped (accepted) or discarded (rejected) a task's work. */
async function judgeTask(taskId, accepted) {
  const agents = await all("SELECT provider, model, routed_kind, role, status FROM hive_agents WHERE task_id=? AND role <> 'reviewer' AND status='done'", [taskId]);
  const task = await get("SELECT kind FROM hive_tasks WHERE id=?", [taskId]);
  for (const a of agents) await bump(a.provider, a.model, a.routed_kind || task?.kind || "coding", accepted ? { accepted: 1 } : { rejected: 1 });
}

/** A Judge verdict: the winning attempt counts as accepted, the others as rejected. */
async function judgeVerdict(kind, winner, others) {
  await bump(winner.provider, winner.model, kind || "coding", { accepted: 1 });
  for (const a of others) if (`${a.provider}|${a.model}` !== `${winner.provider}|${winner.model}`) await bump(a.provider, a.model, kind || "coding", { rejected: 1 });
}

/** A rated chat answer. */
function rateChat({ vendor, model, good }) {
  return bump(vendor, model, "chat", { runs: 1, ok: good ? 1 : 0, failed: good ? 0 : 1, accepted: good ? 1 : 0, rejected: good ? 0 : 1 });
}

/**
 * How much measured results move a model's quality for a kind (-25 … +12).
 * Needs a few runs before it says anything.
 */
async function adjustment(vendor, model, kind) {
  const r = (await load()).get(keyOf(vendor, model, kind));
  if (!r || r.runs + r.accepted + r.rejected < 3) return { delta: 0, stat: r || null };
  const success = (r.ok + 1) / (r.runs + 2); // Laplace-smoothed
  const judged = r.accepted + r.rejected;
  const accept = judged ? (r.accepted + 1) / (judged + 2) : 0.6;
  const delta = Math.max(-25, Math.min(12, (success - 0.8) * 50 + (accept - 0.6) * 25));
  return { delta: Math.round(delta), stat: r };
}

/** Everything, for the Models page. */
async function summary() {
  const rows = await all("SELECT * FROM hive_model_stats ORDER BY runs DESC LIMIT 1000");
  return rows.map((r) => ({
    vendor: r.vendor,
    model: r.model,
    kind: r.kind,
    runs: r.runs,
    ok: r.ok,
    failed: r.failed,
    accepted: r.accepted,
    rejected: r.rejected,
    successRate: r.runs ? r.ok / r.runs : null,
    acceptRate: r.accepted + r.rejected ? r.accepted / (r.accepted + r.rejected) : null,
    avgTokens: r.runs ? Math.round(r.tokens / r.runs) : null,
    avgSteps: r.runs ? +(r.steps / r.runs).toFixed(1) : null,
    avgSeconds: r.runs ? Math.round(r.ms / r.runs / 1000) : null,
    updatedAt: r.updated_at,
  }));
}

module.exports = { recordRun, judgeTask, judgeVerdict, rateChat, adjustment, summary };
