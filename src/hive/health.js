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

/* ── verify every model on a key ───────────────────────────────────────
 * A provider's /models list is not a promise: free keys list paid-only,
 * gated and retired models next to the ones that answer. This sends each
 * listed chat model a tiny "reply OK" and keeps only what really answered:
 * working models go first, refused ones are dropped (and stay dropped),
 * slow or rate-limited ones are kept but marked untested.
 */
const verifying = new Map(); // keyId → { done, total, startedAt }
const DEFINITE = new Set(["model", "bad_request"]);
const PER_VENDOR_CAP = { openrouter: 16, github: 30, mistral: 90, codestral: 10 }; // OpenRouter free keys get ~50 requests a day
// Vendors whose free tiers allow about one request a second: test one model at a time, spaced out.
const PER_VENDOR_PACE = { mistral: 1300, codestral: 1300, cohere: 1000 };

function verifyOrder(models, vendor, catalog) {
  const { CARDS, baseId, quality } = catalog;
  const scored = models.map((m, i) => {
    const card = CARDS.find((c) => c.match.test(baseId(m)));
    return { m, i, q: card ? quality(card, "coding") : -1 };
  });
  return scored.sort((a, b) => b.q - a.q || a.i - b.i).map((x) => x.m);
}

async function verifyKey(keyId, { limit = 40, retest = false, timeoutMs = 30_000 } = {}) {
  if (verifying.has(keyId)) return { running: true, ...verifying.get(keyId) };
  const keys = require("./keys");
  const { providerOf, keyVendor } = require("./providers");
  const { isChatModel } = require("./models");
  const catalog = require("./catalog");
  const row = await keys.keyRow(keyId);
  if (!row) throw Object.assign(new Error("Key not found"), { status: 404 });
  const v = providerOf(keyVendor(row));
  if (v.subscription) return probe(keyId);
  const prev = JSON.parse(row.verified_json || "null") || { ok: [], failed: {}, untested: [] };
  const blocked = JSON.parse(row.blocked_models || "[]");
  let pool = JSON.parse(row.models_json || "[]").filter(isChatModel);
  if (retest) pool = [...new Set([...pool, ...blocked.filter(isChatModel)])];
  // Recently proven by real work: no need to spend a request on it.
  const proven = new Set((await all("SELECT model FROM hive_health WHERE key_id=? AND ok_count>0 AND consecutive_fails=0 AND last_ok>?", [keyId, Date.now() - 3 * 86_400_000])).map((r) => r.model));
  const cap = PER_VENDOR_CAP[v.id] ?? limit;
  const order = verifyOrder(pool, v.id, catalog);
  const todo = order.filter((m) => !proven.has(m)).slice(0, cap);
  const state = { done: 0, total: todo.length, startedAt: Date.now() };
  verifying.set(keyId, state);
  const ok = new Set([...proven].filter((m) => pool.includes(m)));
  const failed = {};
  const untested = [];
  let stop = null;
  try {
    const testOne = async (model) => {
      if (stop) {
        untested.push(model);
        return;
      }
      let tries = 0;
      for (;;) {
        try {
          await v.impl.turn({ secret: keys.secretOf(row), keyRow: row, baseUrl: row.base_url || v.baseUrl, official: !!v.official, vision: false, model, system: "Reply with exactly: OK", messages: [{ role: "user", text: "OK?" }], tools: [], maxTokens: 8, signal: AbortSignal.timeout(timeoutMs) });
          ok.add(model); // the wrapped turn() already recorded the success and its latency
        } catch (e) {
          const kind = e.kind || (e.name === "TimeoutError" || /abort|timeout/i.test(e.message) ? "timeout" : "server");
          if (kind === "rate" && tries++ < 1) {
            await new Promise((r) => setTimeout(r, 20_000).unref?.());
            continue;
          }
          if (kind === "rate" || kind === "quota") {
            stop = kind; // the key is out of requests for now: test the rest later
            untested.push(model);
          } else if (kind === "auth" && !ok.size && state.done >= 2) {
            stop = "auth";
            failed[model] = e.message.slice(0, 200);
          } else if (DEFINITE.has(kind) || kind === "auth") failed[model] = String(e.message || kind).slice(0, 200);
          else untested.push(model); // slow or a server hiccup: not proof it is broken
        }
        break;
      }
      state.done++;
    };
    const pace = PER_VENDOR_PACE[v.id] || 0;
    if (pace) {
      // Free tiers with ~1 request a second: one model at a time with a gap, so the test isn't cut short.
      for (const [n, model] of todo.entries()) {
        if (n) await new Promise((r) => setTimeout(r, pace).unref?.());
        await testOne(model);
      }
    } else {
      let i = 0;
      const worker = async () => {
        while (i < todo.length) await testOne(todo[i++]);
      };
      await Promise.all([worker(), worker()]);
    }
  } finally {
    verifying.delete(keyId);
  }
  // Models beyond the cap keep their place after the tested ones.
  const rest = order.filter((m) => !todo.includes(m) && !proven.has(m));
  const okList = order.filter((m) => ok.has(m));
  const untestedList = [...new Set([...untested, ...rest])].filter((m) => !ok.has(m) && !failed[m]);
  const refused = Object.keys(failed);
  const fresh = await keys.keyRow(keyId);
  const allBlocked = [...new Set([...JSON.parse(fresh.blocked_models || "[]").filter((m) => !ok.has(m)), ...refused])].slice(-400);
  const models = [...okList, ...untestedList];
  const def = fresh.default_pinned && ok.has(fresh.default_model) ? fresh.default_model : okList[0] || (models.includes(fresh.default_model) ? fresh.default_model : models[0] || null);
  const verified = { at: Date.now(), ok: okList, failed, untested: untestedList.length, stoppedBy: stop };
  await run("UPDATE hive_keys SET models_json=?, blocked_models=?, default_model=?, verified_json=?, updated_at=? WHERE id=?", [JSON.stringify(models), JSON.stringify(allBlocked), def, JSON.stringify(verified), now(), keyId]);
  // A key where nothing answered is flagged, so it stops being offered.
  if (!okList.length && refused.length && !untestedList.length) await run("UPDATE hive_keys SET status='error', status_detail=? WHERE id=?", ["None of its models answered — " + Object.values(failed)[0], keyId]);
  try {
    require("./hub").emit("health", { keyId, verified: true });
  } catch {
    /* tests */
  }
  return { ok: okList.length, failed: refused.length, untested: untestedList.length, working: okList, defaultModel: def, stoppedBy: stop, prev: prev.ok?.length ?? null };
}

/** Verify every free key (or every key), a few at a time. */
async function verifyAll({ includePaid = false, olderThanMs = 0 } = {}) {
  const { vendorOf, keyVendor } = require("./providers");
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
  const todo = rows.filter((r) => {
    try {
      const v = vendorOf(keyVendor(r));
      if (v.subscription) return false;
      const ver = JSON.parse(r.verified_json || "null");
      // Every key, paid included, is tested once (a test is a few tokens per model);
      // a test cut short by a rate limit is finished an hour later.
      if (!ver?.at) return true;
      if ((ver.stoppedBy === "rate" || ver.stoppedBy === "quota") && Date.now() - ver.at > 60 * 60_000) return true;
      if (!(includePaid || r.free_tier || v.freeTier)) return false;
      return Date.now() - ver.at >= olderThanMs;
    } catch {
      return false;
    }
  });
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, todo.length) }, async () => {
      while (i < todo.length) {
        const r = todo[i++];
        out.push({ keyId: r.id, ...(await verifyKey(r.id).catch((e) => ({ error: e.message }))) });
      }
    }),
  );
  return out;
}

const verifyProgress = () => Object.fromEntries([...verifying].map(([k, s]) => [k, { done: s.done, total: s.total }]));

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
      verified: verifiedOf(k),
      verifying: verifying.has(k.id) ? { done: verifying.get(k.id).done, total: verifying.get(k.id).total } : null,
    };
  });
}

function verifiedOf(row) {
  try {
    const v = JSON.parse(row.verified_json || "null");
    if (!v) return null;
    return { at: v.at, ok: v.ok || [], failed: Object.entries(v.failed || {}).map(([model, error]) => ({ model, error })), untested: v.untested || 0, stoppedBy: v.stoppedBy || null };
  } catch {
    return null;
  }
}

module.exports = { record, cooling, wrapTurn, probe, probeAll, verifyKey, verifyAll, verifyProgress, verifiedOf, board, cooldownFor };
