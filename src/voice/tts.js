/*
  S8 — natural voice for spoken answers (docs/voice/STEP1_EARS_DESIGN.md §S8).

  Azure Speech neural voices (en-IN, hi-IN), using the same Azure Speech
  entry as the ears (Admin → Voice recognition: key and region). One sentence
  per request, so the browser can start speaking the first sentence while the
  next is made.

  Zero spend:
  - Azure's free (F0) tier gives 500,000 neural characters a month and is
    never billed. A paid (S0) resource would bill, so we stop at 85% of the
    free allowance whatever the resource is (the monthly cap can be lowered in
    Admin, never removed or raised above the free allowance).
  - A fair daily share per student, like the ears.
  - Repeated sentences come from a small in-memory cache and cost nothing.
  When natural voice isn't available, the browser speaks with its own voice.

  Nothing a student says is sent here; only the site's own answer text.
*/
const crypto = require("crypto");
const express = require("express");
const { get, run } = require("../db");
const { open } = require("../hive/vault");

const KEY = "voice_tts";
const SAFE = 0.85;
const FREE_MONTHLY_CHARS = 500000; // Azure neural TTS, free (F0) tier
const MAX_CHARS = 400; // one sentence or two
const VOICES = {
  "en-IN": [
    { id: "en-IN-NeerjaNeural", label: "Neerja (English, India)", gender: "female" },
    { id: "en-IN-PrabhatNeural", label: "Prabhat (English, India)", gender: "male" },
  ],
  "hi-IN": [
    { id: "hi-IN-SwaraNeural", label: "Swara (Hindi)", gender: "female" },
    { id: "hi-IN-MadhurNeural", label: "Madhur (Hindi)", gender: "male" },
  ],
};
const ALL_VOICES = new Set(Object.values(VOICES).flat().map((v) => v.id));

/* ── settings ── */

async function loadTtsConfig() {
  const row = await get("SELECT value FROM site_settings WHERE key=?", [KEY]).catch(() => null);
  let v = {};
  try {
    v = row ? JSON.parse(row.value) || {} : {};
  } catch {
    v = {};
  }
  return sanitizeTts(v);
}

function sanitizeTts(v = {}) {
  const cap = Math.round(Number(v.monthlyChars));
  return {
    enabled: v.enabled !== false,
    // Never above the free allowance: the cap can only be lowered.
    monthlyChars: Number.isFinite(cap) && cap > 0 ? Math.min(cap, FREE_MONTHLY_CHARS) : FREE_MONTHLY_CHARS,
    studentDailyChars: Math.max(200, Math.min(50000, Math.round(Number(v.studentDailyChars)) || 4000)),
  };
}

async function saveTtsConfig(v, by) {
  const cfg = sanitizeTts(v);
  await run(
    "INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
    [KEY, JSON.stringify(cfg), by || "admin", new Date().toISOString()],
  );
  return cfg;
}

/** The Azure Speech entry of the ears (key and region), when it is on and has a key. */
async function azureLink(loadSttConfig) {
  const cfg = await loadSttConfig().catch(() => ({ providers: [] }));
  const p = cfg.providers.find((x) => x.kind === "azure" && x.enabled && x.key && x.region);
  if (!p) return null;
  let key = "";
  try {
    key = open(p.key);
  } catch {
    key = "";
  }
  return key ? { key, region: p.region } : null;
}

/* ── usage ── */

let tableReady = null;
function ready() {
  tableReady ||= run("CREATE TABLE IF NOT EXISTS voice_tts_usage (who TEXT NOT NULL, period TEXT NOT NULL, chars INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (who, period))").catch((e) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}
const month = (now) => `M:${now.toISOString().slice(0, 7)}`;
const day = (now) => `d:${now.toISOString().slice(0, 10)}`;

async function used(who, period) {
  await ready();
  const r = await get("SELECT chars FROM voice_tts_usage WHERE who=? AND period=?", [who, period]);
  return Number(r?.chars || 0);
}
async function addUse(who, period, chars) {
  await ready();
  await run("INSERT INTO voice_tts_usage(who, period, chars) VALUES(?,?,?) ON CONFLICT(who, period) DO UPDATE SET chars=chars+excluded.chars", [who, period, chars]);
}

/* ── speaking ── */

const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function ssml(text, voice, lang) {
  return `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}">${xml(text)}</voice></speak>`;
}

/** Text fit to speak: no markup, squeezed spaces, at most MAX_CHARS. */
function speakable(text) {
  return String(text || "")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

function pickVoice(lang, voice) {
  const list = VOICES[lang] || VOICES["en-IN"];
  return list.some((v) => v.id === voice) ? voice : list[0].id;
}

/* A small cache: the same sentence in the same voice costs nothing twice. */
const cache = new Map(); // hash → Buffer
let cacheBytes = 0;
const CACHE_BYTES = 24 * 1024 * 1024;
function cacheGet(k) {
  const v = cache.get(k);
  if (!v) return null;
  cache.delete(k);
  cache.set(k, v);
  return v;
}
function cachePut(k, buf) {
  if (buf.length > 2 * 1024 * 1024) return;
  cache.set(k, buf);
  cacheBytes += buf.length;
  for (const [old, b] of cache) {
    if (cacheBytes <= CACHE_BYTES) break;
    cache.delete(old);
    cacheBytes -= b.length;
  }
}

/**
 * Make speech for one sentence. Returns { ok: true, audio: Buffer, cached }
 * or { ok: false, fallback: "browser", reason }.
 */
async function synthesize({ text, lang = "en-IN", voice = "", username = "", loadSttConfig, now = new Date(), fetchImpl = globalThis.fetch }) {
  const t = speakable(text);
  if (!t) return { ok: false, fallback: "browser", reason: "nothing to say" };
  const l = VOICES[lang] ? lang : "en-IN";
  const v = pickVoice(l, voice);
  const cfg = await loadTtsConfig();
  if (!cfg.enabled) return { ok: false, fallback: "browser", reason: "natural voice is off" };
  const hash = crypto.createHash("sha256").update(`${v}\n${t}`).digest("hex");
  const hit = cacheGet(hash);
  if (hit) return { ok: true, audio: hit, cached: true, voice: v };
  const link = await azureLink(loadSttConfig);
  if (!link) return { ok: false, fallback: "browser", reason: "no Azure Speech key" };
  // 85% of the month's free characters, for the whole site.
  if ((await used("site", month(now))) + t.length > cfg.monthlyChars * SAFE) return { ok: false, fallback: "browser", reason: "monthly free voice used" };
  if (username && (await used(`user:${username}`, day(now))) + t.length > cfg.studentDailyChars) return { ok: false, fallback: "browser", reason: "daily share used" };
  let r;
  try {
    r = await fetchImpl(`https://${link.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": link.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "nexoraguru",
      },
      body: ssml(t, v, l),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, fallback: "browser", reason: "no answer" };
  }
  if (!r.ok) return { ok: false, fallback: "browser", reason: r.status === 429 ? "rate limited" : r.status === 401 || r.status === 403 ? "key refused" : `error ${r.status}` };
  const audio = Buffer.from(await r.arrayBuffer());
  if (!audio.length) return { ok: false, fallback: "browser", reason: "empty audio" };
  await addUse("site", month(now), t.length);
  if (username) await addUse(`user:${username}`, day(now), t.length);
  cachePut(hash, audio);
  return { ok: true, audio, cached: false, voice: v };
}

async function adminTtsView(loadSttConfig, now = new Date()) {
  const cfg = await loadTtsConfig();
  const link = await azureLink(loadSttConfig);
  return { ...cfg, freeMonthlyChars: FREE_MONTHLY_CHARS, stopAt: Math.floor(cfg.monthlyChars * SAFE), usedThisMonth: await used("site", month(now)), linked: !!link, voices: VOICES };
}

function createTtsRouter({ requireAuthenticatedUser, isTrustedOrigin, loadSttConfig = require("./stt").loadConfig }) {
  const rateLimit = require("express-rate-limit");
  const { requirePerm } = require("../authz/permissions");
  const router = express.Router();
  const trusted = (req, res, next) => (isTrustedOrigin && !isTrustedOrigin(req) ? res.status(403).json({ ok: false, error: "Untrusted origin" }) : next());
  // A long answer is a few sentences; 90 a minute is generous for one student.
  const limiter = rateLimit({ windowMs: 60e3, max: 90, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.sessionUser?.username || req.ip });
  router.get("/api/voice/tts/status", requireAuthenticatedUser, async (_req, res) => {
    const cfg = await loadTtsConfig().catch(() => ({ enabled: false }));
    const link = cfg.enabled ? await azureLink(loadSttConfig).catch(() => null) : null;
    res.json({ ok: true, available: !!link, voices: link ? VOICES : {} });
  });
  router.post("/api/voice/tts", trusted, requireAuthenticatedUser, limiter, express.json({ limit: "8kb" }), async (req, res) => {
    try {
      const lang = req.body?.lang === "hi-IN" ? "hi-IN" : "en-IN";
      const voice = ALL_VOICES.has(String(req.body?.voice || "")) ? String(req.body.voice) : "";
      const r = await synthesize({ text: req.body?.text, lang, voice, username: req.sessionUser.username, loadSttConfig });
      if (!r.ok) return res.status(503).json({ ok: false, fallback: "browser", reason: r.reason });
      res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Voice": r.voice });
      res.send(r.audio);
    } catch {
      res.status(503).json({ ok: false, fallback: "browser" });
    }
  });
  router.get("/api/admin/voice-tts", requirePerm("ai.manage"), async (_req, res) => res.json({ ok: true, ...(await adminTtsView(loadSttConfig)) }));
  router.put("/api/admin/voice-tts", trusted, requirePerm("ai.manage"), express.json({ limit: "4kb" }), async (req, res) => {
    await saveTtsConfig(req.body || {}, req.sessionUser.username);
    res.json({ ok: true, ...(await adminTtsView(loadSttConfig)) });
  });
  return router;
}

module.exports = { createTtsRouter, synthesize, sanitizeTts, speakable, ssml, VOICES, FREE_MONTHLY_CHARS, SAFE, _cache: cache };
