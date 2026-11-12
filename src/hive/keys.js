// Provider keys: encrypted storage, token budgets per period, usage counters,
// automatic key selection and failover.
const { run, get, all, newId, now, json } = require("./db");
const vault = require("./vault");
const { vendorOf, keyVendor, VENDORS } = require("./providers");
const modelsLib = require("./models");

const PERIODS = new Set(["day", "month", "total"]);
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const periodStart = (period) => (period === "day" ? day() : period === "month" ? day().slice(0, 7) + "-01" : "0000-00-00");

const active = new Map(); // key id -> running calls
const usageCache = new Map(); // key id -> { start, tokens }

function publicKey(row, usedTokens = 0, extra = {}) {
  const limit = row.token_limit == null ? null : Number(row.token_limit);
  return {
    id: row.id,
    provider: keyVendor(row),
    impl: row.provider,
    label: row.label,
    baseUrl: row.base_url || null,
    priority: Number(row.priority || 0),
    last4: row.last4,
    models: json(row.models_json, []),
    defaultModel: row.default_model,
    tokenLimit: limit,
    limitPeriod: row.limit_period,
    maxConcurrency: row.max_concurrency,
    owner: row.owner,
    disabled: !!row.disabled,
    status: row.status,
    statusDetail: row.status_detail,
    rateLimit: json(row.rl_json, null),
    rateLimitAt: row.rl_at,
    used: usedTokens,
    remaining: limit == null ? null : Math.max(0, limit - usedTokens),
    active: active.get(row.id) || 0,
    createdAt: row.created_at,
    ...extra,
  };
}

async function usedTokens(row) {
  const start = periodStart(row.limit_period);
  const c = usageCache.get(row.id);
  if (c && c.start === start) return c.tokens;
  const r = await get("SELECT COALESCE(SUM(input_tokens + output_tokens),0) AS t FROM hive_usage WHERE key_id=? AND day>=?", [row.id, start]);
  const tokens = Number(r?.t || 0);
  usageCache.set(row.id, { start, tokens });
  return tokens;
}

async function listKeys() {
  const rows = await all("SELECT * FROM hive_keys ORDER BY created_at ASC");
  const out = [];
  for (const r of rows) {
    const used = await usedTokens(r);
    const totals = await get(
      "SELECT COALESCE(SUM(input_tokens),0) AS i, COALESCE(SUM(output_tokens),0) AS o, COALESCE(SUM(requests),0) AS n, COALESCE(SUM(cost_micros),0) AS c FROM hive_usage WHERE key_id=? AND day>=?",
      [r.id, periodStart(r.limit_period)],
    );
    out.push(publicKey(r, used, { periodInput: Number(totals.i), periodOutput: Number(totals.o), periodRequests: Number(totals.n), periodCostMicros: Number(totals.c) }));
  }
  return out;
}

async function keyRow(id) {
  return get("SELECT * FROM hive_keys WHERE id=?", [id]);
}

function validateInput({ provider, label, apiKey, baseUrl, tokenLimit, limitPeriod, maxConcurrency }, { creating }) {
  const p = vendorOf(provider);
  if (creating && (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8)) throw new Error("Paste a valid API key");
  if (label !== undefined && (typeof label !== "string" || !label.trim() || label.length > 60)) throw new Error("Give the key a name (≤ 60 characters)");
  if (p.baseUrlRequired && creating && !baseUrl) throw new Error("This provider needs a base URL");
  if (baseUrl) {
    let u;
    try {
      u = new URL(baseUrl);
    } catch {
      throw new Error("Base URL is not a valid URL");
    }
    const localDev = process.env.NODE_ENV !== "production" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
    if (u.protocol !== "https:" && !localDev && process.env.HIVE_ALLOW_HTTP_BASE !== "1") throw new Error("Base URL must use https");
  }
  if (tokenLimit != null && tokenLimit !== "" && !(Number.isFinite(Number(tokenLimit)) && Number(tokenLimit) >= 0)) throw new Error("Token limit must be a positive number");
  if (limitPeriod !== undefined && !PERIODS.has(limitPeriod)) throw new Error("Period must be day, month or total");
  if (maxConcurrency !== undefined && !(Number.isInteger(Number(maxConcurrency)) && Number(maxConcurrency) >= 1 && Number(maxConcurrency) <= 32)) throw new Error("Concurrency must be 1-32");
}

async function createKey(input, owner) {
  validateInput(input, { creating: true });
  const id = newId("key");
  const t = now();
  const secret = input.apiKey.trim();
  const v = vendorOf(input.provider);
  const family = v.impl === "openai" && !v.official ? "openai_compat" : v.impl;
  await run(
    `INSERT INTO hive_keys(id, provider, preset, label, base_url, secret_enc, last4, token_limit, limit_period, max_concurrency, owner, default_model, default_pinned, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      family,
      v.id,
      input.label.trim(),
      input.baseUrl || null,
      vault.seal(secret),
      vault.last4(secret),
      input.tokenLimit == null || input.tokenLimit === "" ? null : Math.round(Number(input.tokenLimit)),
      input.limitPeriod || "month",
      Number(input.maxConcurrency || 4),
      owner,
      input.defaultModel || null,
      input.defaultModel ? 1 : 0,
      t,
      t,
    ],
  );
  return id;
}

async function updateKey(id, input) {
  const row = await keyRow(id);
  if (!row) throw Object.assign(new Error("Key not found"), { status: 404 });
  validateInput({ provider: keyVendor(row), ...input }, { creating: false });
  const sets = [];
  const vals = [];
  const set = (col, v) => {
    sets.push(`${col}=?`);
    vals.push(v);
  };
  if (input.label !== undefined) set("label", input.label.trim());
  if (input.tokenLimit !== undefined) set("token_limit", input.tokenLimit == null || input.tokenLimit === "" ? null : Math.round(Number(input.tokenLimit)));
  if (input.limitPeriod !== undefined) set("limit_period", input.limitPeriod);
  if (input.maxConcurrency !== undefined) set("max_concurrency", Number(input.maxConcurrency));
  if (input.disabled !== undefined) set("disabled", input.disabled ? 1 : 0);
  if (input.defaultModel !== undefined) {
    set("default_model", input.defaultModel || null);
    set("default_pinned", input.defaultModel ? 1 : 0);
  }
  if (input.baseUrl !== undefined) set("base_url", input.baseUrl || null);
  if (input.priority !== undefined) set("priority", Math.max(-100, Math.min(100, Math.round(Number(input.priority) || 0))));
  if (input.apiKey) {
    set("secret_enc", vault.seal(input.apiKey.trim()));
    set("last4", vault.last4(input.apiKey));
    set("status", "unchecked");
  }
  if (!sets.length) return;
  set("updated_at", now());
  vals.push(id);
  await run(`UPDATE hive_keys SET ${sets.join(", ")} WHERE id=?`, vals);
  usageCache.delete(id);
}

async function deleteKey(id) {
  await run("DELETE FROM hive_keys WHERE id=?", [id]);
  usageCache.delete(id);
}

function secretOf(row) {
  return vault.open(row.secret_enc);
}

/** Verify a key by listing models; stores the model list and status. */
async function checkKey(id) {
  const row = await keyRow(id);
  if (!row) throw Object.assign(new Error("Key not found"), { status: 404 });
  const p = vendorOf(keyVendor(row));
  try {
    const models = await p.implModule.listModels({ secret: secretOf(row), baseUrl: row.base_url || p.baseUrl, official: !!p.official });
    // Keep a chosen default only while the provider still offers it.
    const keep = !!row.default_pinned && !!row.default_model && (!models.length || models.includes(row.default_model));
    const def = keep ? row.default_model : modelsLib.pickDefault(models, p.suggested);
    await run("UPDATE hive_keys SET models_json=?, status='ok', status_detail=NULL, default_model=?, updated_at=? WHERE id=?", [
      JSON.stringify(models.slice(0, 600)),
      def,
      now(),
      id,
    ]);
    const fresh = await modelsLib.observe(p.id, models).catch(() => []);
    return { ok: true, models, defaultModel: def, newModels: fresh };
  } catch (e) {
    await run("UPDATE hive_keys SET status=?, status_detail=?, updated_at=? WHERE id=?", [e.kind === "auth" ? "invalid" : "error", String(e.message).slice(0, 300), now(), id]);
    return { ok: false, error: e.message };
  }
}

/** Record tokens used by one call. */
async function recordUsage(keyId, username, { input = 0, output = 0, costMicros = 0 }, rateLimit) {
  const d = day();
  await run(
    `INSERT INTO hive_usage(key_id, day, username, input_tokens, output_tokens, requests, cost_micros) VALUES(?,?,?,?,?,1,?)
     ON CONFLICT(key_id, day, username) DO UPDATE SET input_tokens=input_tokens+excluded.input_tokens, output_tokens=output_tokens+excluded.output_tokens, requests=requests+1, cost_micros=cost_micros+excluded.cost_micros`,
    [keyId, d, username, input, output, costMicros],
  );
  const c = usageCache.get(keyId);
  if (c) c.tokens += input + output;
  if (rateLimit) await run("UPDATE hive_keys SET rl_json=?, rl_at=? WHERE id=?", [JSON.stringify(rateLimit), now(), keyId]);
}

/** Is there budget left on this key? */
async function hasBudget(row, reserve = 0) {
  if (row.disabled) return false;
  if (row.token_limit == null) return true;
  return (await usedTokens(row)) + reserve < Number(row.token_limit);
}

/**
 * Pick a key for (provider, model). `prefer` is a key id or "auto".
 * Auto = enabled key of that provider with the most remaining budget share
 * and the fewest running calls; keys without a limit count as full.
 */
async function pickKey(provider, { prefer = "auto", exclude = [] } = {}) {
  if (prefer && prefer !== "auto") {
    const row = await keyRow(prefer);
    if (row && !exclude.includes(row.id)) return row;
  }
  const rows = (await all("SELECT * FROM hive_keys WHERE disabled=0")).filter((r) => keyVendor(r) === provider);
  let best = null;
  let bestScore = -Infinity;
  for (const r of rows) {
    if (exclude.includes(r.id) || r.status === "invalid") continue;
    if (!(await hasBudget(r))) continue;
    const share = r.token_limit == null ? 1 : 1 - (await usedTokens(r)) / Math.max(1, Number(r.token_limit));
    const load = (active.get(r.id) || 0) / Math.max(1, r.max_concurrency);
    // Staff can rank keys (e.g. spend the free tier first).
    const score = share - load + Number(r.priority || 0) / 10;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Any key that can take over an agent when its own vendor is out of budget:
 * vendors in `order` first (the Never-stop plugin's preference), then the
 * rest; only vendors whose models can use tools.
 */
async function pickHandoffKey({ exclude = [], order = [], skipVendor } = {}) {
  const ids = [...new Set([...order, ...VENDORS.map((v) => v.id)])];
  for (const vid of ids) {
    if (vid === skipVendor) continue;
    let v;
    try {
      v = vendorOf(vid);
    } catch {
      continue;
    }
    if (!v.caps.tools) continue;
    const k = await pickKey(vid, { exclude });
    if (k) return k;
  }
  return null;
}

/** Wait for a slot on a key (per-key concurrency), then return a release fn. */
async function acquire(row, signal) {
  for (;;) {
    if ((active.get(row.id) || 0) < Math.max(1, row.max_concurrency)) break;
    if (signal?.aborted) throw new Error("Stopped");
    await new Promise((r) => setTimeout(r, 400));
  }
  active.set(row.id, (active.get(row.id) || 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active.set(row.id, Math.max(0, (active.get(row.id) || 1) - 1));
  };
}

async function usageSeries(keyId, days = 30) {
  const since = day(Date.now() - (days - 1) * 86400e3);
  const rows = await all(
    "SELECT day, SUM(input_tokens) AS input, SUM(output_tokens) AS output, SUM(requests) AS requests FROM hive_usage WHERE key_id=? AND day>=? GROUP BY day ORDER BY day",
    [keyId, since],
  );
  const byUser = await all(
    "SELECT username, SUM(input_tokens + output_tokens) AS tokens, SUM(requests) AS requests FROM hive_usage WHERE key_id=? AND day>=? GROUP BY username ORDER BY tokens DESC",
    [keyId, since],
  );
  return { days: rows.map((r) => ({ day: r.day, input: Number(r.input), output: Number(r.output), requests: Number(r.requests) })), byUser };
}

/** Re-check every enabled key: refreshes model lists, defaults and the radar. */
async function refreshAll() {
  const rows = await all("SELECT id FROM hive_keys WHERE disabled=0");
  const fresh = [];
  for (const r of rows) {
    const c = await checkKey(r.id).catch(() => null);
    if (c?.newModels?.length) fresh.push(...c.newModels);
  }
  return fresh;
}

module.exports = { refreshAll, listKeys, keyRow, createKey, updateKey, deleteKey, checkKey, secretOf, recordUsage, hasBudget, pickKey, pickHandoffKey, acquire, usageSeries, publicKey, keyVendor };
