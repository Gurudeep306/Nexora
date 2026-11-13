// Agent health: keeps work flowing by routing around models that are failing.
//
// Every model call goes through providers.providerOf(...).impl.turn, which
// reports here. Each (key, model) pair has a small circuit breaker:
//   healthy  → calls succeed
//   cooling  → it failed recently; the router and chat skip it until the
//              cool-down ends (rate limit: minutes; server errors: back off
//              exponentially; bad key / no credit: hours), then one call
//              "half-opens" it again
//   down     → the key itself is rejected (auth) or out of credit
// Free and subscription keys are also probed in the background (a tiny
// "reply OK" call), so a dead free model is noticed before real work hits it.
const { run, get, all, now } = require("./db");

const MIN = 60_000;
const memo = new Map(); // `${keyId}|${model}` → { until } for fast checks

function cooldownFor(kind, consecutive) {
  if (kind === "auth") return 6 * 60 * MIN;
  if (kind === "quota") return 60 * MIN;
  if (kind === "rate") return Math.min(15 * MIN, 1 * MIN * Math.max(1, consecutive));
  if (kind === "model") return 24 * 60 * MIN;
  if (kind === "bad_request") return consecutive >= 3 ? 10 * MIN : 0;
  // server / network / timeouts: 30s, 1m, 2m, 4m … capped at 30m
  return Math.min(30 * MIN, 30_000 * 2 ** Math.max(0, consecutive - 1));
}

const keyOf = (keyId, model) => `${keyId}|${model || ""}`;

async function record(keyId, model, { ok, kind = null, error = null, latencyMs = null }) {
  if (!keyId) return;
  const m = model || "";
  const t = now();
  const row = await get("SELECT * FROM hive_health WHERE key_id=? AND model=?", [keyId, m]);
  if (ok) {
    const lat = latencyMs == null ? row?.latency_ms ?? null : row?.latency_ms ? Math.round(row.latency_ms * 0.7 + latencyMs * 0.3) : latencyMs;
    if (row) await run("UPDATE hive_health SET ok_count=ok_count+1, consecutive_fails=0, last_ok=?, cooldown_until=0, latency_ms=? WHERE key_id=? AND model=?", [t, lat, keyId, m]);
    else await run("INSERT INTO hive_health(key_id, model, ok_count, fail_count, consecutive_fails, last_ok, latency_ms, cooldown_until) VALUES(?,?,1,0,0,?,?,0)", [keyId, m, t, lat]);
    memo.delete(keyOf(keyId, m));
    // A key-level problem (auth/quota) clears as soon as any model on it works.
    if (m) {
      await run("UPDATE hive_health SET consecutive_fails=0, cooldown_until=0 WHERE key_id=? AND model=''", [keyId]);
      memo.delete(keyOf(keyId, ""));
    }
    return;
  }
  if (kind === "aborted") return;
  const consecutive = (row?.consecutive_fails || 0) + 1;
  const until = t + cooldownFor(kind, consecutive);
  const msg = String(error || "").slice(0, 300);
  if (row) await run("UPDATE hive_health SET fail_count=fail_count+1, consecutive_fails=?, last_fail=?, last_error=?, last_kind=?, cooldown_until=? WHERE key_id=? AND model=?", [consecutive, t, msg, kind, until, keyId, m]);
  else await run("INSERT INTO hive_health(key_id, model, ok_count, fail_count, consecutive_fails, last_fail, last_error, last_kind, cooldown_until) VALUES(?,?,0,1,?,?,?,?,?)", [keyId, m, consecutive, t, msg, kind, until]);
  memo.set(keyOf(keyId, m), { until });
  // Bad key or no credit: the whole key is out, not just this model.
  if ((kind === "auth" || kind === "quota") && m) await record(keyId, "", { ok: false, kind, error });
  try {
    require("./hub").emit("health", { keyId, model: m, ok: false, kind });
  } catch {
    /* hub not attached (tests) */
  }
}

/** Is this key (or this model on it) cooling down right now? */
async function cooling(keyId, model = "") {
  const t = Date.now();
  for (const m of model ? [model, ""] : [""]) {
    const k = keyOf(keyId, m);
    let hit = memo.get(k);
    if (!hit) {
      const row = await get("SELECT cooldown_until FROM hive_health WHERE key_id=? AND model=?", [keyId, m]);
      hit = { until: Number(row?.cooldown_until || 0) };
      memo.set(k, hit);
    }
    if (hit.until > t) return hit.until;
  }
  return 0;
}

/** Wrap a provider's turn() so every call reports its outcome. */
function wrapTurn(vendorId, turn) {
  return async (args) => {
    const t0 = Date.now();
    try {
      const res = await turn(args);
      record(args.keyRow?.id, args.model, { ok: true, latencyMs: Date.now() - t0 }).catch(() => {});
      return res;
    } catch (e) {
      if (!args.signal?.aborted) record(args.keyRow?.id, args.model, { ok: false, kind: e.kind || "server", error: e.message }).catch(() => {});
      throw e;
    }
  };
}

/* ── probes ─────────────────────────────────────────────────────────── */
async function probe(keyId) {
  const keys = require("./keys");
  const { providerOf, keyVendor } = require("./providers");
  const row = await keys.keyRow(keyId);
  if (!row) throw Object.assign(new Error("Key not found"), { status: 404 });
  const vendor = keyVendor(row);
  const v = providerOf(vendor);
  if (v.subscription) {
    // The CLI lives on a machine: online + installed is what we can check cheaply.
    const machines = require("./machines");
    const ok = !!row.machine_id && machines.isOnline(row.machine_id);
    await record(keyId, row.default_model || "default", ok ? { ok: true } : { ok: false, kind: "network", error: "Its machine is offline" });
    return { ok, model: row.default_model || "default", latencyMs: null, error: ok ? null : "Its machine is offline" };
  }
  const model = row.default_model || (JSON.parse(row.models_json || "[]")[0] ?? null);
  if (!model) {
    await record(keyId, "", { ok: false, kind: "bad_request", error: "No models listed — refresh the key" });
    return { ok: false, model: null, error: "No models listed — refresh the key" };
  }
  const t0 = Date.now();
  try {
    const res = await v.impl.turn({
      secret: keys.secretOf(row),
      keyRow: row,
      baseUrl: row.base_url || v.baseUrl,
      official: !!v.official,
      vision: false,
      model,
      system: "Reply with exactly: OK",
      messages: [{ role: "user", text: "OK?" }],
      tools: [],
      maxTokens: 8,
      signal: AbortSignal.timeout(45_000),
    });
    await keys.recordUsage(row.id, "hive-health", { input: res.usage?.input || 0, output: res.usage?.output || 0 }, res.rateLimit, { vendor, model }).catch(() => {});
    return { ok: true, model, latencyMs: Date.now() - t0, reply: String(res.text || "").slice(0, 40) };
  } catch (e) {
    // wrapTurn already recorded the failure; a retired model is dropped from the key.
    if (e.kind === "model") await keys.blockModel(row.id, model).catch(() => null);
    return { ok: false, model, latencyMs: Date.now() - t0, error: e.message, kind: e.kind || "server" };
  }
}

/** Probe every key (free and subscription by default; paid keys only when asked). */
async function probeAll({ includePaid = false, concurrency = 4 } = {}) {
  const { vendorOf, keyVendor } = require("./providers");
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
  const todo = rows.filter((r) => {
    try {
      const v = vendorOf(keyVendor(r));
      return includePaid || r.free_tier || v.freeTier || v.subscription;
    } catch {
      return false;
    }
  });
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, todo.length) }, async () => {
      while (i < todo.length) {
        const r = todo[i++];
        out.push({ keyId: r.id, ...(await probe(r.id).catch((e) => ({ ok: false, error: e.message }))) });
      }
    }),
  );
  return out;
}

/* ── the board ──────────────────────────────────────────────────────── */
function stateOf(h, t) {
  if (!h) return "unknown";
  if (Number(h.cooldown_until) > t) return h.last_kind === "auth" || h.last_kind === "quota" ? "down" : "cooling";
  if (h.consecutive_fails > 0) return "flaky";
  return h.ok_count > 0 ? "healthy" : "unknown";
}

async function board() {
  const { vendorOf, keyVendor } = require("./providers");
  const keys = await all("SELECT * FROM hive_keys ORDER BY created_at");
  const rows = await all("SELECT * FROM hive_health");
  const t = Date.now();
  return keys.map((k) => {
    let v = null;
    try {
      v = vendorOf(keyVendor(k));
    } catch {
      /* unknown vendor */
    }
    const mine = rows.filter((r) => r.key_id === k.id);
    const keyLevel = mine.find((r) => r.model === "");
    const models = mine
      .filter((r) => r.model)
      .map((r) => ({
        model: r.model,
        state: stateOf(r, t),
        ok: Number(r.ok_count),
        fail: Number(r.fail_count),
        successRate: Number(r.ok_count) + Number(r.fail_count) ? Number(r.ok_count) / (Number(r.ok_count) + Number(r.fail_count)) : null,
        latencyMs: r.latency_ms == null ? null : Number(r.latency_ms),
        lastOk: r.last_ok ? Number(r.last_ok) : null,
        lastFail: r.last_fail ? Number(r.last_fail) : null,
        lastError: r.last_error || null,
        lastKind: r.last_kind || null,
        cooldownUntil: Number(r.cooldown_until) > t ? Number(r.cooldown_until) : null,
      }))
      .sort((a, b) => (b.lastOk || b.lastFail || 0) - (a.lastOk || a.lastFail || 0));
    const keyState = k.disabled ? "paused" : k.status === "invalid" ? "down" : stateOf(keyLevel, t) === "down" ? "down" : null;
    const best = models.find((m) => m.model === k.default_model) || models[0];
    const state = keyState || best?.state || (k.status === "ok" ? "unknown" : k.status === "error" ? "flaky" : "unknown");
    return {
      keyId: k.id,
      label: k.label,
      vendor: v?.id || k.provider,
      vendorLabel: v?.label || k.provider,
      free: !!(k.free_tier || v?.freeTier),
      subscription: !!v?.subscription,
      defaultModel: k.default_model,
      state,
      detail: k.status === "invalid" ? k.status_detail : keyLevel && Number(keyLevel.cooldown_until) > t ? keyLevel.last_error : best?.state === "cooling" || best?.state === "down" ? best.lastError : null,
      cooldownUntil: keyLevel && Number(keyLevel.cooldown_until) > t ? Number(keyLevel.cooldown_until) : best?.cooldownUntil || null,
      models,
    };
  });
}

module.exports = { record, cooling, wrapTurn, probe, probeAll, board, cooldownFor };
