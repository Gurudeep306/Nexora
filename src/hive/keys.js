// Provider keys: encrypted storage, token budgets per period, usage counters,
// automatic key selection and failover.
const { run, get, all, newId, now, json } = require("./db");
const vault = require("./vault");
const { vendorOf, keyVendor, VENDORS } = require("./providers");
const modelsLib = require("./models");

const PERIODS = new Set(["day", "month", "total"]);
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const periodEnd = (period) => {
  const d = new Date();
  if (period === "day") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  if (period === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return null;
};
const periodStart = (period) => (period === "day" ? day() : period === "month" ? day().slice(0, 7) + "-01" : "0000-00-00");

const active = new Map(); // key id -> running calls
const usageCache = new Map(); // key id -> { start, tokens }

/** The models a key offers: the tested-and-working ones once it has been tested, else everything listed. */
function workingModels(row) {
  const list = json(row.models_json, []);
  const ok = json(row.verified_json, null)?.ok;
  if (!ok?.length) return list;
  const set = new Set(ok);
  return list.filter((m) => set.has(m));
}

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
    // Once a key's models are tested, only the ones that answered are offered.
    models: workingModels(row),
    untestedModels: (() => {
      const w = new Set(workingModels(row));
      return json(row.models_json, []).filter((m) => !w.has(m));
    })(),
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
    machineId: row.machine_id || null,
    freeTier: !!row.free_tier,
    verified: require("./health").verifiedOf(row),
    // Free connections always show a limit: the provider's live numbers when it sends them, else its typical free allowance.
    freeLimit: (() => {
      try {
        const v = vendorOf(keyVendor(row));
        if (v.subscription || !(row.free_tier || v.freeTier)) return null;
        return require("./catalog").freeLimitFor(v.id);
      } catch {
        return null;
      }
    })(),
    subscription: (() => {
      try {
        return !!vendorOf(keyVendor(row)).subscription;
      } catch {
        return false;
      }
    })(),
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
      "SELECT COALESCE(SUM(input_tokens),0) AS i, COALESCE(SUM(output_tokens),0) AS o, COALESCE(SUM(cached_tokens),0) AS ca, COALESCE(SUM(requests),0) AS n, COALESCE(SUM(cost_micros),0) AS c FROM hive_usage WHERE key_id=? AND day>=?",
      [r.id, periodStart(r.limit_period)],
    );
    const today = await get("SELECT COALESCE(SUM(input_tokens + output_tokens),0) AS t, COALESCE(SUM(requests),0) AS n FROM hive_usage WHERE key_id=? AND day=?", [r.id, day()]);
    out.push(
      publicKey(r, used, {
        periodInput: Number(totals.i),
        periodOutput: Number(totals.o),
        periodCached: Number(totals.ca),
        periodRequests: Number(totals.n),
        periodCostMicros: Number(totals.c),
        todayTokens: Number(today?.t || 0),
        todayRequests: Number(today?.n || 0),
        periodStart: periodStart(r.limit_period),
        periodEnds: periodEnd(r.limit_period),
      }),
    );
  }
  return out;
}

async function keyRow(id) {
  return get("SELECT * FROM hive_keys WHERE id=?", [id]);
}

function validateInput({ provider, label, apiKey, baseUrl, tokenLimit, limitPeriod, maxConcurrency, machineId }, { creating }) {
  const p = vendorOf(provider);
  if (p.subscription) {
    if (creating && !machineId) throw new Error(`${p.label} runs on a connected machine — pick one (Hive → Machines)`);
    if (apiKey && (typeof apiKey !== "string" || apiKey.trim().length < 20)) throw new Error("That doesn't look like a token from `claude setup-token`");
  } else if (creating && (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < (provider === "ollama" ? 1 : 8))) throw new Error("Paste a valid API key");
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
  const v = vendorOf(input.provider);
  const secret = String(input.apiKey || "").trim();
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
      secret ? vault.seal(secret) : "none",
      secret ? vault.last4(secret) : v.subscription ? "plan" : "",
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
  const freeTier = input.freeTier === undefined ? !!v.freeTier : !!input.freeTier;
  await run("UPDATE hive_keys SET machine_id=?, free_tier=? WHERE id=?", [v.subscription ? String(input.machineId) : null, freeTier ? 1 : 0, id]);
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
  if (input.freeTier !== undefined) set("free_tier", input.freeTier ? 1 : 0);
  if (input.machineId !== undefined && input.machineId) set("machine_id", String(input.machineId));
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
  if (row.secret_enc === "none") return null;
  try {
    return vault.open(row.secret_enc);
  } catch {
    throw Object.assign(new Error(`“${row.label}” can't be decrypted — HIVE_SECRET (or SESSION_SECRET) changed since it was saved. Paste the key again in Keys (⋯ → Budget, model & priority → new key).`), { kind: "auth" });
  }
}

/** Subscription connections may have no secret (the machine is signed in). */
function optionalSecret(row) {
  if (!row.secret_enc || row.secret_enc === "none") return null;
  try {
    return vault.open(row.secret_enc);
  } catch {
    return null;
  }
}

/**
 * List a key's models. Some OpenAI-compatible gateways don't serve
 * GET /models (404). Then, at the same address only, check the chat endpoint
 * exists and fall back to the models already on the key plus the vendor's
 * suggestions; each one is then tested with a real call (health.verifyKey).
 */
async function listOrProbe(row, p) {
  const secret = p.subscription ? optionalSecret(row) : secretOf(row);
  const base = row.base_url || p.baseUrl;
  try {
    return await p.implModule.listModels({ secret, baseUrl: base, official: !!p.official, modelsUrl: p.modelsUrl, vendor: p.id, cli: p.cli, machineId: row.machine_id });
  } catch (e) {
    if (p.impl !== "openai" || e.status !== 404 || p.modelsUrl || !p.implModule.probeChat) throw e;
    const fallback = [...new Set([...json(row.models_json, []), ...(p.suggested || [])])];
    const status = fallback.length ? await p.implModule.probeChat({ secret, baseUrl: base, model: fallback[0] }).catch(() => null) : null;
    if (status && status !== 404) return fallback;
    throw Object.assign(new Error(`Nothing answers at ${base} (model list and chat both 404). Copy the API base URL from the provider's console or docs into the key's Address field.`), { kind: "config" });
  }
}

/** Verify a key by listing models; stores the model list and status. */
async function checkKey(id) {
  const row = await keyRow(id);
  if (!row) throw Object.assign(new Error("Key not found"), { status: 404 });
  const p = vendorOf(keyVendor(row));
  try {
    const blocked = new Set(json(row.blocked_models, []));
    const listed = await listOrProbe(row, p);
    // Models the provider still lists but refuses to serve (retired for new users…) stay out.
    let models = listed.filter((m) => !blocked.has(m));
    // A free OpenRouter key can only call the ":free" variants.
    if (p.id === "openrouter" && row.free_tier) models = models.filter((m) => /:free$/.test(m));
    // Models proven to answer stay first, so pickers and the router try them before untested ones.
    const proven = json(row.verified_json, null)?.ok || [];
    if (proven.length) models = [...proven.filter((m) => models.includes(m)), ...models.filter((m) => !proven.includes(m))];
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

/**
 * A model the key lists but the provider refused to serve ("no longer
 * available", "not found"…): remember it, drop it from the key's list, and
 * move the default to the next best model. Returns the new default.
 */
async function blockModel(id, model) {
  const row = await keyRow(id);
  if (!row || !model) return null;
  const blocked = [...new Set([...json(row.blocked_models, []), model])].slice(-100);
  const models = json(row.models_json, []).filter((m) => m !== model);
  const p = vendorOf(keyVendor(row));
  const def = row.default_model && row.default_model !== model ? row.default_model : modelsLib.pickDefault(models, (p.suggested || []).filter((m) => m !== model));
  await run("UPDATE hive_keys SET blocked_models=?, models_json=?, default_model=?, default_pinned=CASE WHEN default_model=? THEN 0 ELSE default_pinned END, updated_at=? WHERE id=?", [JSON.stringify(blocked), JSON.stringify(models), def, model, now(), id]);
  return def && def !== model ? def : null;
}

async function saveVerified(id, v) {
  await run("UPDATE hive_keys SET verified_json=?, updated_at=? WHERE id=?", [JSON.stringify(v), now(), id]);
}

/**
 * Record tokens used by one call. Providers count prompt-cache reads inside
 * `input`; those are ~10x cheaper and re-sent every agent step, so they are
 * stored separately and NOT charged against the key's token budget.
 */
async function recordUsage(keyId, username, { input = 0, output = 0, cacheRead = 0, costMicros = 0 }, rateLimit, meta = null) {
  const d = day();
  const cached = Math.max(0, Math.min(input, cacheRead || 0));
  const fresh = Math.max(0, input - cached);
  await run(
    `INSERT INTO hive_usage(key_id, day, username, input_tokens, output_tokens, cached_tokens, requests, cost_micros) VALUES(?,?,?,?,?,?,1,?)
     ON CONFLICT(key_id, day, username) DO UPDATE SET input_tokens=input_tokens+excluded.input_tokens, output_tokens=output_tokens+excluded.output_tokens, cached_tokens=cached_tokens+excluded.cached_tokens, requests=requests+1, cost_micros=cost_micros+excluded.cost_micros`,
    [keyId, d, username, fresh, output, cached, costMicros],
  );
  const c = usageCache.get(keyId);
  if (c) c.tokens += fresh + output;
  if (rateLimit) await run("UPDATE hive_keys SET rl_json=?, rl_at=? WHERE id=?", [JSON.stringify(rateLimit), now(), keyId]);
  // Per project / vendor / model detail, for budgets and the Usage page.
  if (meta?.vendor) {
    let cost = costMicros;
    if (!cost) {
      const row = await get("SELECT free_tier, preset, provider FROM hive_keys WHERE id=?", [keyId]);
      const { cardFor, priceOf } = require("./catalog");
      const sub = (() => {
        try {
          return !!vendorOf(meta.vendor).subscription;
        } catch {
          return false;
        }
      })();
      if (row && !row.free_tier && !sub && !/:free$/.test(meta.model || "")) {
        const usd = priceOf(cardFor(meta.model, meta.vendor), fresh + cached * 0.1, output);
        cost = usd ? Math.round(usd * 1e6) : 0;
      }
    }
    await run(
      `INSERT INTO hive_usage_detail(day, project_id, vendor, model, username, input_tokens, output_tokens, cached_tokens, requests, cost_micros) VALUES(?,?,?,?,?,?,?,?,1,?)
       ON CONFLICT(day, project_id, vendor, model, username) DO UPDATE SET input_tokens=input_tokens+excluded.input_tokens, output_tokens=output_tokens+excluded.output_tokens, cached_tokens=cached_tokens+excluded.cached_tokens, requests=requests+1, cost_micros=cost_micros+excluded.cost_micros`,
      [d, meta.projectId || "", meta.vendor, meta.model || "", username, fresh, output, cached, cost],
    );
    await require("./caps").afterUsage({ projectId: meta.projectId || "", vendor: meta.vendor, model: meta.model || "", username }).catch(() => {});
  }
}

/** Live subscription usage windows (Claude Code reports them on every run). */
async function setPlanUsage(keyId, info) {
  if (!info || typeof info !== "object") return;
  const prev = json((await get("SELECT rl_json FROM hive_keys WHERE id=?", [keyId]))?.rl_json, null);
  const windows = prev?.plan ? { ...(prev.windows || {}) } : {};
  const ms = (t) => (t == null ? null : Number(t) < 1e12 ? Number(t) * 1000 : Number(t));
  // 0–1 or 0–100 → 0–1
  const frac = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v) > 1 ? Math.min(1, Number(v) / 100) : Math.max(0, Number(v)));
  const fromStatus = (st) => (st === "rejected" ? 1 : st === "allowed_warning" ? 0.85 : null);
  if (info.codex) {
    // Codex: { primary: { used_percent, window_minutes, resets_in_seconds | resets_at }, secondary: {…} }
    for (const [k, w] of Object.entries(info.codex)) {
      if (!w || typeof w !== "object") continue;
      const name = w.window_minutes ? (w.window_minutes <= 360 ? "five_hour" : "seven_day") : k;
      const reset = w.resets_at ? ms(w.resets_at) : w.resets_in_seconds != null ? Date.now() + Number(w.resets_in_seconds) * 1000 : null;
      windows[name] = { utilization: frac(w.used_percent) ?? 0, resetsAt: reset, status: null };
    }
  } else {
    // Claude Code reports one window per event (rateLimitType), sometimes all of them (unifiedWindows).
    for (const [k, w] of Object.entries(info.unifiedWindows || {})) windows[k] = { utilization: frac(w.utilization) ?? fromStatus(w.status) ?? 0, resetsAt: ms(w.resetsAt), status: w.status || null };
    if (info.rateLimitType) {
      const old = windows[info.rateLimitType] || {};
      windows[info.rateLimitType] = { utilization: frac(info.utilization) ?? fromStatus(info.status) ?? old.utilization ?? 0, resetsAt: ms(info.resetsAt) ?? old.resetsAt ?? null, status: info.status || null };
    }
  }
  // Windows whose reset time has passed start again from zero.
  for (const w of Object.values(windows)) if (w.resetsAt && w.resetsAt < Date.now()) Object.assign(w, { utilization: 0, status: null });
  const out = { plan: true, status: info.status || prev?.status || null, type: info.rateLimitType || prev?.type || null, resetsAt: ms(info.resetsAt) ?? null, windows };
  await run("UPDATE hive_keys SET rl_json=?, rl_at=? WHERE id=?", [JSON.stringify(out), now(), keyId]);
}

/**
 * Ask Anthropic for a Claude plan's usage directly (the numbers Claude Code's
 * /usage shows), so every connected Claude account has its 5-hour and weekly
 * bars even before it has run any work. Needs the account's setup token.
 * Returns the windows, or { error } when the account can't be asked.
 */
async function refreshPlanUsage(keyId) {
  const row = await keyRow(keyId);
  if (!row) return { error: "Key not found" };
  if (keyVendor(row) !== "claude_code") return { error: "Only Claude plans report usage this way" };
  const token = optionalSecret(row);
  if (!token) return { error: "This account uses the machine's own login — its usage appears after its first run (or add its setup token)" };
  const base = process.env.HIVE_ANTHROPIC_API || "https://api.anthropic.com";
  let res;
  try {
    res = await fetch(`${base}/api/oauth/usage`, { headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return { error: `Couldn't reach Anthropic: ${e.message}` };
  }
  if (!res.ok) return { error: `Anthropic answered ${res.status} — usage fills in after this account's first run` };
  const j = await res.json().catch(() => null);
  if (!j || typeof j !== "object") return { error: "Unexpected answer from Anthropic" };
  // { five_hour: { utilization: 0-100, resets_at }, seven_day: {…}, seven_day_opus: {…}, … }
  const unifiedWindows = {};
  for (const [k, w] of Object.entries(j)) {
    if (!w || typeof w !== "object" || w.utilization == null) continue;
    unifiedWindows[k] = { utilization: Math.max(0, Math.min(1, Number(w.utilization) / 100)), resetsAt: w.resets_at ? Date.parse(w.resets_at) : null, status: Number(w.utilization) >= 100 ? "rejected" : null };
  }
  if (!Object.keys(unifiedWindows).length) return { error: "No usage windows in the answer" };
  await setPlanUsage(keyId, { unifiedWindows });
  return { windows: unifiedWindows };
}

/** Refresh every connected Claude account's plan usage (a few seconds each, no plan usage spent). */
async function refreshAllPlanUsage() {
  const rows = (await all("SELECT * FROM hive_keys WHERE disabled=0")).filter((r) => keyVendor(r) === "claude_code");
  const out = [];
  for (const r of rows) out.push({ keyId: r.id, ...(await refreshPlanUsage(r.id).catch((e) => ({ error: e.message }))) });
  return out;
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
    if (exclude.includes(r.id)) continue;
    if (r.machine_id && !require("./machines").isOnline(r.machine_id)) continue;
    // A key whose last check failed is retried after a cool-down: listing
    // models can fail (restricted project keys, a provider hiccup) while
    // chatting works. A real auth failure on a call re-marks it.
    if (r.status === "invalid" && Date.now() - Number(r.updated_at || 0) < 10 * 60_000) continue;
    if (!(await hasBudget(r))) continue;
    const share = (r.token_limit == null ? 1 : 1 - (await usedTokens(r)) / Math.max(1, Number(r.token_limit))) - (r.status === "invalid" || r.status === "error" ? 0.5 : 0);
    const load = (active.get(r.id) || 0) / Math.max(1, r.max_concurrency);
    // Staff can rank keys (e.g. spend the free tier first).
    const cool = await require("./health").cooling(r.id, r.default_model || "");
    const score = share - load + Number(r.priority || 0) / 10 - (cool ? 3 : 0);
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
    if (!v.caps.tools || v.subscription) continue;
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
    "SELECT day, SUM(input_tokens) AS input, SUM(output_tokens) AS output, SUM(cached_tokens) AS cached, SUM(requests) AS requests FROM hive_usage WHERE key_id=? AND day>=? GROUP BY day ORDER BY day",
    [keyId, since],
  );
  const byUser = await all(
    "SELECT username, SUM(input_tokens + output_tokens) AS tokens, SUM(requests) AS requests FROM hive_usage WHERE key_id=? AND day>=? GROUP BY username ORDER BY tokens DESC",
    [keyId, since],
  );
  return { days: rows.map((r) => ({ day: r.day, input: Number(r.input), output: Number(r.output), cached: Number(r.cached || 0), requests: Number(r.requests) })), byUser };
}

/** Why no key of this vendor can take a call — one readable sentence. */
async function explainNoKey(vendorId) {
  let label = vendorId;
  try {
    label = vendorOf(vendorId).label;
  } catch {}
  const rows = (await all("SELECT * FROM hive_keys")).filter((r) => keyVendor(r) === vendorId);
  if (!rows.length) return `No ${label} key yet — add one in Keys.`;
  const parts = [];
  for (const r of rows) {
    if (r.disabled) parts.push(`“${r.label}” is paused`);
    else if (r.status === "invalid") parts.push(`“${r.label}” was rejected by ${label}${r.status_detail ? `: ${String(r.status_detail).slice(0, 200)}` : ""}`);
    else if (r.token_limit != null && (await usedTokens(r)) >= Number(r.token_limit)) parts.push(`“${r.label}” used its ${Number(r.token_limit).toLocaleString()}-token ${r.limit_period === "total" ? "budget" : `budget for this ${r.limit_period}`}`);
  }
  return `No ${label} key can take this right now — ${parts.join("; ") || "all are busy"}. Fix it in Keys.`;
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

module.exports = { refreshPlanUsage, refreshAllPlanUsage, workingModels, saveVerified, blockModel, setPlanUsage, explainNoKey, refreshAll, listKeys, keyRow, createKey, updateKey, deleteKey, checkKey, secretOf, recordUsage, hasBudget, pickKey, pickHandoffKey, acquire, usageSeries, publicKey, keyVendor };
