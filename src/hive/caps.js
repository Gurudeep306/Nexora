// Spending caps and alerts. A cap limits tokens and/or dollars per day or
// month for one project, provider, model or person. "block" stops new model
// calls in that scope once reached; "warn" only alerts. Alerts fire at 80%
// and 100% and show up in Hive (bell + toast) for every staff member.
const { run, get, all, newId, now } = require("./db");
const hub = require("./hub");

const SCOPES = new Set(["project", "vendor", "model", "user", "all"]);
const PERIODS = new Set(["day", "month"]);
const day = () => new Date().toISOString().slice(0, 10);
const start = (period) => (period === "day" ? day() : `${day().slice(0, 7)}-01`);
const COL = { project: "project_id", vendor: "vendor", model: "model", user: "username" };

let cache = { at: 0, caps: [] };
async function caps() {
  if (Date.now() - cache.at < 15_000) return cache.caps;
  cache = { at: Date.now(), caps: await all("SELECT * FROM hive_caps ORDER BY created_at") };
  return cache.caps;
}

async function list() {
  const out = [];
  for (const c of await all("SELECT * FROM hive_caps ORDER BY created_at")) out.push({ ...publicCap(c), ...(await usageOf(c)) });
  return out;
}

const publicCap = (c) => ({ id: c.id, scopeType: c.scope_type, scope: c.scope, tokens: c.tokens, dollars: c.dollars, period: c.period, action: c.action, createdBy: c.created_by, createdAt: c.created_at });

async function create({ scopeType, scope, tokens, dollars, period = "month", action = "block" }, by) {
  if (!SCOPES.has(scopeType)) throw Object.assign(new Error("Scope must be project, vendor, model, user or all"), { status: 400 });
  if (scopeType !== "all" && (!scope || typeof scope !== "string")) throw Object.assign(new Error("Pick what the cap applies to"), { status: 400 });
  if (!PERIODS.has(period)) throw Object.assign(new Error("Period must be day or month"), { status: 400 });
  const t = tokens === "" || tokens == null ? null : Math.round(Number(tokens));
  const d = dollars === "" || dollars == null ? null : Number(dollars);
  if (t == null && d == null) throw Object.assign(new Error("Set a token or dollar limit"), { status: 400 });
  if ((t != null && !(t > 0)) || (d != null && !(d > 0))) throw Object.assign(new Error("Limits must be positive"), { status: 400 });
  const id = newId("cap");
  await run("INSERT INTO hive_caps(id, scope_type, scope, tokens, dollars, period, action, created_by, created_at) VALUES(?,?,?,?,?,?,?,?,?)", [
    id,
    scopeType,
    scopeType === "all" ? "*" : String(scope).slice(0, 200),
    t,
    d,
    period,
    action === "warn" ? "warn" : "block",
    by,
    now(),
  ]);
  cache.at = 0;
  return id;
}

async function remove(id) {
  await run("DELETE FROM hive_caps WHERE id=?", [id]);
  cache.at = 0;
}

async function usageOf(c) {
  const where = c.scope_type === "all" ? "" : ` AND ${COL[c.scope_type]}=?`;
  const r = await get(
    `SELECT COALESCE(SUM(input_tokens + output_tokens),0) AS t, COALESCE(SUM(cost_micros),0) AS c FROM hive_usage_detail WHERE day>=?${where}`,
    c.scope_type === "all" ? [start(c.period)] : [start(c.period), c.scope],
  );
  const tokens = Number(r?.t || 0);
  const dollars = Number(r?.c || 0) / 1e6;
  const pct = Math.max(c.tokens ? tokens / c.tokens : 0, c.dollars ? dollars / c.dollars : 0);
  return { usedTokens: tokens, usedDollars: +dollars.toFixed(4), pct: +pct.toFixed(4) };
}

const applies = (c, m) => c.scope_type === "all" || (c.scope_type === "project" && c.scope === m.projectId) || (c.scope_type === "vendor" && c.scope === m.vendor) || (c.scope_type === "model" && c.scope === m.model) || (c.scope_type === "user" && c.scope === m.username);

function describe(c) {
  const what = c.scope_type === "all" ? "all of Hive" : `${c.scope_type} ${c.scope}`;
  const lim = [c.tokens ? `${Number(c.tokens).toLocaleString()} tokens` : null, c.dollars ? `$${c.dollars}` : null].filter(Boolean).join(" / ");
  return `${lim} per ${c.period} for ${what}`;
}

/** May a call in this scope go ahead? { ok, reason } */
async function check(meta) {
  for (const c of await caps()) {
    if (c.action !== "block" || !applies(c, meta)) continue;
    const u = await usageOf(c);
    if (u.pct >= 1) return { ok: false, cap: publicCap(c), reason: `Budget cap reached: ${describe(c)} (Hive → Budgets)` };
  }
  return { ok: true };
}

const fired = new Set(); // `${capId}:${periodStart}:${threshold}`

/** After usage is recorded: alert at 80% and 100% (once per period). */
async function afterUsage(meta) {
  for (const c of await caps()) {
    if (!applies(c, meta)) continue;
    const u = await usageOf(c);
    for (const th of [1, 0.8]) {
      if (u.pct < th) continue;
      const k = `${c.id}:${start(c.period)}:${th}`;
      if (fired.has(k)) break;
      fired.add(k);
      const exists = await get("SELECT id FROM hive_alerts WHERE ref=?", [k]);
      if (exists) break;
      await alert({
        kind: "budget",
        level: th >= 1 ? "error" : "warn",
        title: th >= 1 ? `Budget reached: ${describe(c)}` : `80% of a budget used: ${describe(c)}`,
        body: `${u.usedTokens.toLocaleString()} tokens${u.usedDollars ? ` · $${u.usedDollars.toFixed(2)}` : ""} used this ${c.period}.${th >= 1 && c.action === "block" ? " New model calls in this scope are paused until it resets or the cap is raised." : ""}`,
        ref: k,
      });
      break;
    }
  }
}

async function alert({ kind, level = "info", title, body = "", ref = null }) {
  const a = { id: newId("alr"), kind, level, title: String(title).slice(0, 300), body: String(body).slice(0, 2000), ref, read: 0, created_at: now() };
  await run("INSERT INTO hive_alerts(id, kind, level, title, body, ref, read, created_at) VALUES(?,?,?,?,?,?,?,?)", [a.id, a.kind, a.level, a.title, a.body, a.ref, 0, a.created_at]);
  hub.emit("alert", a);
  return a;
}

async function alerts(limit = 50) {
  return all("SELECT * FROM hive_alerts ORDER BY created_at DESC LIMIT ?", [limit]);
}

async function readAlerts(id) {
  if (id) await run("UPDATE hive_alerts SET read=1 WHERE id=? AND read=0", [id]);
  else await run("UPDATE hive_alerts SET read=1 WHERE read=0");
}

/** Spend overview for the Budgets page: by day, vendor, model, project, user. */
async function spend(days = 30) {
  const since = new Date(Date.now() - (days - 1) * 86400e3).toISOString().slice(0, 10);
  const q = (group) =>
    all(
      `SELECT ${group} AS k, SUM(input_tokens) AS input, SUM(output_tokens) AS output, SUM(cached_tokens) AS cached, SUM(requests) AS requests, SUM(cost_micros) AS cost FROM hive_usage_detail WHERE day>=? GROUP BY ${group} ORDER BY SUM(input_tokens + output_tokens) DESC LIMIT 60`,
      [since],
    );
  const [byDay, byVendor, byModel, byProject, byUser] = await Promise.all([q("day"), q("vendor"), q("model"), q("project_id"), q("username")]);
  const norm = (rows) => rows.map((r) => ({ key: r.k, input: Number(r.input || 0), output: Number(r.output || 0), cached: Number(r.cached || 0), requests: Number(r.requests || 0), dollars: Number(r.cost || 0) / 1e6 }));
  return { since, byDay: norm(byDay).sort((a, b) => String(a.key).localeCompare(String(b.key))), byVendor: norm(byVendor), byModel: norm(byModel), byProject: norm(byProject), byUser: norm(byUser) };
}

module.exports = { list, create, remove, check, afterUsage, alert, alerts, readAlerts, spend, describe };
