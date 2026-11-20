// Live settings, chosen in Admin → Live (one JSON row 'live_config' in
// site_settings). Secrets are sealed with AES-256-GCM (src/hive/vault.js) and
// never leave the server: the admin API shows only their last four characters.
//
//   provider    'auto' | 'direct' | 'cloudflare' | 'livekit'
//               auto = both: Cloudflare first, LiveKit when Cloudflare's
//               monthly limit is reached or it is failing, else direct.
//   cloudflare  { appId, secret (sealed), last4, test }   Cloudflare Realtime SFU
//   livekit     { url, key, secret (sealed), last4, test } LiveKit (Cloud or own server)
//   maxPeople   devices per room through a video server (2–200)
//   monthlyGb   stop using Cloudflare this month after this many GB (estimated
//               from what devices report); new rooms go to LiveKit, else direct
//   recording, calls, tablets  switches for those parts of Live
//
// LIVEKIT_* environment variables still work when nothing is set here.
const crypto = require("crypto");
const { all, run, onWrite } = require("../db");
const { seal, open, last4 } = require("../hive/vault");

const KEY = "live_config";
const TTL_MS = 30_000;
const PROVIDERS = new Set(["auto", "direct", "cloudflare", "livekit"]);
// CF_REALTIME_API only for tests (a stand-in server); everyone else uses Cloudflare.
const CF_API = process.env.CF_REALTIME_API || "https://rtc.live.cloudflare.com/v1";

let cache = null;
onWrite(/site_settings/i, () => {
  cache = null;
});

const DEFAULTS = { provider: "auto", cloudflare: null, livekit: null, maxPeople: 50, monthlyGb: 900, recording: true, calls: true, tablets: true };

function normalize(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : d);
  return {
    provider: PROVIDERS.has(c.provider) ? c.provider : "auto",
    cloudflare: c.cloudflare && typeof c.cloudflare === "object" ? c.cloudflare : null,
    livekit: c.livekit && typeof c.livekit === "object" ? c.livekit : null,
    maxPeople: num(c.maxPeople, 2, 200, DEFAULTS.maxPeople),
    monthlyGb: num(c.monthlyGb, 0, 100000, DEFAULTS.monthlyGb),
    recording: c.recording !== false,
    calls: c.calls !== false,
    tablets: c.tablets !== false,
  };
}

async function loadConfig() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.config;
  const rows = await all("SELECT value FROM site_settings WHERE key = ?", [KEY]).catch(() => []);
  let config = normalize({});
  try {
    if (rows[0]) config = normalize(JSON.parse(rows[0].value));
  } catch {
    /* corrupt: defaults */
  }
  cache = { at: Date.now(), config };
  return config;
}

/** The last loaded settings, without touching the database. */
const peekConfig = () => cache?.config || normalize({});

async function saveConfig(config, by) {
  const value = JSON.stringify(normalize(config));
  await run(
    `INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [KEY, value, by || null, Date.now()],
  );
  cache = { at: Date.now(), config: normalize(JSON.parse(value)) };
  return cache.config;
}

/** Cloudflare app id and secret, or null. */
function cloudflare(c = peekConfig()) {
  const cf = c.cloudflare;
  if (!cf?.appId || !cf?.secret) return null;
  const secret = open(cf.secret);
  return secret ? { appId: cf.appId, secret } : null;
}

/** LiveKit settings from Admin, else from the environment, or null. */
function livekit(c = peekConfig()) {
  const lk = c.livekit;
  if (lk?.url && lk?.key && lk?.secret) {
    const secret = open(lk.secret);
    if (secret) return { url: lk.url, key: lk.key, secret, http: lk.url.replace(/^ws(s?):\/\//, "http$1://").replace(/\/+$/, "") };
  }
  const url = (process.env.LIVEKIT_URL || "").trim();
  const key = (process.env.LIVEKIT_API_KEY || "").trim();
  const secret = (process.env.LIVEKIT_API_SECRET || "").trim();
  if (!url || !key || !secret) return null;
  return { url, key, secret, http: url.replace(/^ws(s?):\/\//, "http$1://").replace(/\/+$/, "") };
}

/* ── usage: bytes devices received through the video server, per month ── */
const month = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);
let pending = 0;
let usageCache = { month: "", bytes: 0, at: 0 };
let tablesReady = null;
function ensureUsage() {
  if (!tablesReady) tablesReady = run("CREATE TABLE IF NOT EXISTS live_usage (month TEXT PRIMARY KEY, bytes INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)").catch(() => (tablesReady = null));
  return tablesReady;
}
function addUsage(bytes) {
  if (Number.isFinite(bytes) && bytes > 0) {
    pending += bytes;
    usageCache.bytes += bytes;
  }
}
async function flushUsage() {
  if (!pending) return;
  const n = pending;
  pending = 0;
  await ensureUsage();
  await run(
    `INSERT INTO live_usage(month, bytes, updated_at) VALUES(?,?,?)
     ON CONFLICT(month) DO UPDATE SET bytes = bytes + excluded.bytes, updated_at = excluded.updated_at`,
    [month(), n, Date.now()],
  ).catch(() => (pending += n));
}
setInterval(() => void flushUsage(), 60_000).unref?.();

async function usage() {
  const m = month();
  if (usageCache.month === m && Date.now() - usageCache.at < 60_000) return usageCache.bytes;
  await ensureUsage();
  const row = await all("SELECT bytes FROM live_usage WHERE month = ?", [m]).catch(() => []);
  usageCache = { month: m, bytes: Number(row[0]?.bytes || 0) + pending, at: Date.now() };
  return usageCache.bytes;
}
async function history() {
  await ensureUsage();
  return (await all("SELECT month, bytes FROM live_usage ORDER BY month DESC LIMIT 12").catch(() => [])).map((r) => ({ month: r.month, bytes: Number(r.bytes) }));
}

/**
 * How a new room's media travels: 'cf', 'sfu' (LiveKit) or 'mesh' (direct).
 * Over the month's limit, the video server is not used for new rooms.
 */
async function chooseTransport() {
  const c = await loadConfig();
  // The monthly limit is Cloudflare's (its free 1,000 GB); LiveKit has its own.
  const over = c.monthlyGb > 0 && (await usage()) >= c.monthlyGb * 1e9;
  const cf = cloudflare(c) && !over && c.cloudflare?.test?.ok !== false;
  const lk = livekit(c) && c.livekit?.test?.ok !== false;
  if (c.provider === "direct") return { kind: "mesh", over };
  if (c.provider === "cloudflare") return cf ? { kind: "cf" } : { kind: "mesh", over };
  if (c.provider === "livekit") return lk ? { kind: "sfu" } : { kind: "mesh", over };
  // Automatic: both together. Cloudflare first (most free traffic); when its
  // monthly limit is reached or its last test failed, LiveKit; then direct.
  return cf ? { kind: "cf" } : lk ? { kind: "sfu", over } : { kind: "mesh", over };
}

/* ── Cloudflare Realtime calls (server side; the browser never sees the secret) ── */
async function cfCall(cf, path, method = "POST", body) {
  const r = await fetch(`${CF_API}/apps/${encodeURIComponent(cf.appId)}${path}`, {
    method,
    headers: { authorization: `Bearer ${cf.secret}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await r.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { errorCode: `HTTP ${r.status}`, errorDescription: text.slice(0, 200) };
  }
  if (!r.ok && !json.errorCode) json.errorCode = `HTTP ${r.status}`;
  return json;
}

/** Try the keys: Cloudflare opens a (throwaway) session; LiveKit lists rooms. */
async function testCloudflare(appId, secret) {
  const t0 = Date.now();
  try {
    const j = await cfCall({ appId, secret }, "/sessions/new", "POST");
    if (j.sessionId) return { ok: true, ms: Date.now() - t0, error: null };
    return { ok: false, ms: Date.now() - t0, error: j.errorDescription || j.errorCode || "Cloudflare did not answer as expected" };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.message };
  }
}
async function testLivekit(lk) {
  const t0 = Date.now();
  const { signJwt } = require("./media");
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ iss: lk.key, nbf: now - 10, exp: now + 60, video: { roomList: true } }, lk.secret);
  try {
    const r = await fetch(`${lk.http}/twirp/livekit.RoomService/ListRooms`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? { ok: true, ms: Date.now() - t0, error: null } : { ok: false, ms: Date.now() - t0, error: `LiveKit answered ${r.status}${r.status === 401 ? ": the key or secret is wrong" : ""}` };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.message };
  }
}

const newSecret = (s) => ({ secret: seal(String(s).trim()), last4: last4(s) });
const rid = () => crypto.randomBytes(4).toString("hex");

module.exports = {
  PROVIDERS,
  loadConfig,
  peekConfig,
  saveConfig,
  cloudflare,
  livekit,
  chooseTransport,
  cfCall,
  testCloudflare,
  testLivekit,
  addUsage,
  usage,
  history,
  newSecret,
  rid,
};
