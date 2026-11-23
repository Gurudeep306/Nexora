/*
  Natural voice for spoken answers (docs/voice/STEP1_EARS_DESIGN.md §S8,
  docs/voice/VIRTUAL_TEACHER.md §3), one sentence per request so the browser
  starts speaking the first sentence while the next is made.

  1. Our own voice server (deploy/voice-server): HeadTTS (MIT) running
     Kokoro (Apache-2.0) on the free Oracle server. Indian voices (Kokoro's
     Hindi voices) that speak English with an Indian accent and Hindi (written
     as sounds by ./hindi-ipa.js, so no GPL phonemizer is involved). Free for
     commercial use, never billed. It also returns the exact mouth shapes
     (visemes) and word times, so the virtual teacher's lips match.
  2. Azure Speech's free (F0) tier, only when an admin turns it on for a
     non-commercial site: Microsoft's terms give commercial rights to the
     paid tier only. Capped below the free allowance; never billed.
  When neither can speak, the browser's own voice does.

  A fair daily share per student; repeated sentences come from a small cache.
  Nothing a student says is sent here; only the site's own answer text.
*/
const crypto = require("crypto");
const express = require("express");
const { get, run } = require("../db");
const { open, seal, last4 } = require("../hive/vault");
const { toVoiceInput, hasDevanagari } = require("./hindi-ipa");

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
/* Our own voice server's voices: Kokoro's Indian voices. Each speaks English (Indian accent) and Hindi. */
const OWN_VOICES = [
  { id: "hf_alpha", label: "Alpha (Indian woman)", gender: "female" },
  { id: "hf_beta", label: "Beta (Indian woman)", gender: "female" },
  { id: "hm_omega", label: "Omega (Indian man)", gender: "male" },
  { id: "hm_psi", label: "Psi (Indian man)", gender: "male" },
];
const OWN_IDS = new Set(OWN_VOICES.map((v) => v.id));
const ALL_VOICES = new Set([...Object.values(VOICES).flat().map((v) => v.id), ...OWN_IDS]);
const VISEMES = new Set(["sil", "PP", "FF", "TH", "DD", "kk", "CH", "SS", "nn", "RR", "aa", "E", "I", "O", "U"]);

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

/** The voice server's address: https only (http only for this machine), no path, no query. */
function cleanUrl(u) {
  try {
    const x = new URL(String(u || "").trim());
    const local = x.hostname === "127.0.0.1" || x.hostname === "localhost";
    if (x.protocol !== "https:" && !(local && x.protocol === "http:")) return "";
    return `${x.protocol}//${x.host}`;
  } catch {
    return "";
  }
}

function sanitizeTts(v = {}) {
  const cap = Math.round(Number(v.monthlyChars));
  return {
    enabled: v.enabled !== false,
    ownUrl: cleanUrl(v.ownUrl),
    ownKey: typeof v.ownKey === "string" ? v.ownKey : "", // sealed
    // Azure's free tier: only for a non-commercial site (its terms), off unless an admin says so.
    azureFree: v.azureFree === true,
    // Never above the free allowance: the cap can only be lowered.
    monthlyChars: Number.isFinite(cap) && cap > 0 ? Math.min(cap, FREE_MONTHLY_CHARS) : FREE_MONTHLY_CHARS,
    studentDailyChars: Math.max(200, Math.min(50000, Math.round(Number(v.studentDailyChars)) || 4000)),
  };
}

async function saveTtsConfig(v, by) {
  const prev = await loadTtsConfig();
  const next = { ...prev, ...v, ownKey: prev.ownKey };
  if (typeof v.newOwnKey === "string" && v.newOwnKey.trim()) next.ownKey = seal(v.newOwnKey.trim());
  if (v.clearOwnKey === true) next.ownKey = "";
  const cfg = sanitizeTts(next);
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

/** Our own voice server, when an address and password are set. */
function ownLink(cfg) {
  if (!cfg.ownUrl || !cfg.ownKey) return null;
  let key = "";
  try {
    key = open(cfg.ownKey);
  } catch {
    key = "";
  }
  return key ? { url: cfg.ownUrl, key } : null;
}

const nums = (a, n) => Array.isArray(a) && a.length === n && a.every((x) => Number.isFinite(x) && x >= 0 && x < 600000);

/** The voice server's answer, checked: WAV audio plus word and mouth-shape timings. */
function readOwn(j) {
  if (!j || typeof j.audio !== "string" || !j.audio) return null;
  const audio = Buffer.from(j.audio, "base64");
  if (audio.length < 44 || audio.toString("ascii", 0, 4) !== "RIFF") return null;
  const timing = {};
  const w = Array.isArray(j.words) ? j.words.length : 0;
  if (w && j.words.every((x) => typeof x === "string") && nums(j.wtimes, w) && nums(j.wdurations, w)) {
    Object.assign(timing, { words: j.words.map((x) => x.slice(0, 80)), wtimes: j.wtimes, wdurations: j.wdurations });
  }
  const n = Array.isArray(j.visemes) ? j.visemes.length : 0;
  if (n && j.visemes.every((x) => VISEMES.has(x)) && nums(j.vtimes, n) && nums(j.vdurations, n)) {
    Object.assign(timing, { visemes: j.visemes, vtimes: j.vtimes, vdurations: j.vdurations });
  }
  return { audio, timing: timing.words || timing.visemes ? timing : null };
}

async function ownSay(link, text, voice, fetchImpl) {
  let r;
  try {
    r = await fetchImpl(`${link.url}/voice/v1/synthesize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${link.key}`, "Content-Type": "application/json", "User-Agent": "nexoraguru" },
      // Plain text gets word-by-word times; Hindi goes as sounds (one timed piece per Hindi run).
      body: JSON.stringify({ input: hasDevanagari(text) ? toVoiceInput(text) : text, voice, language: "en-us", speed: 1, audioEncoding: "wav" }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, reason: "voice server didn't answer" };
  }
  if (!r.ok) return { ok: false, reason: r.status === 401 || r.status === 403 ? "voice server password refused" : `voice server error ${r.status}` };
  const got = readOwn(await r.json().catch(() => null));
  return got ? { ok: true, ...got } : { ok: false, reason: "voice server sent no audio" };
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
const cache = new Map(); // hash → { engine, voice, mime, audio: Buffer, timing }
let cacheBytes = 0;
const CACHE_BYTES = 24 * 1024 * 1024;
function cacheGet(k) {
  const v = cache.get(k);
  if (!v) return null;
  cache.delete(k);
  cache.set(k, v);
  return v;
}
function cachePut(k, entry) {
  const size = entry.audio.length;
  if (size > 2 * 1024 * 1024) return;
  cache.set(k, entry);
  cacheBytes += size;
  for (const [old, e] of cache) {
    if (cacheBytes <= CACHE_BYTES) break;
    cache.delete(old);
    cacheBytes -= e.audio.length;
  }
}

/** The voice to use on our own server: the one asked for, else a woman's voice. */
function pickOwnVoice(voice) {
  return OWN_IDS.has(voice) ? voice : "hf_alpha";
}

/**
 * Make speech for one sentence. Returns
 * { ok: true, engine, voice, mime, audio: Buffer, timing, cached }
 * or { ok: false, fallback: "browser", reason }.
 */
async function synthesize({ text, lang = "en-IN", voice = "", username = "", loadSttConfig, now = new Date(), fetchImpl = globalThis.fetch }) {
  const t = speakable(text);
  if (!t) return { ok: false, fallback: "browser", reason: "nothing to say" };
  const l = VOICES[lang] ? lang : "en-IN";
  const cfg = await loadTtsConfig();
  if (!cfg.enabled) return { ok: false, fallback: "browser", reason: "natural voice is off" };
  const own = ownLink(cfg);
  const azure = !own && cfg.azureFree ? await azureLink(loadSttConfig) : null;
  if (!own && !azure) return { ok: false, fallback: "browser", reason: cfg.azureFree ? "no Azure Speech key" : "no voice server set up" };
  const engine = own ? "own" : "azure";
  const v = own ? pickOwnVoice(voice) : pickVoice(l, voice);
  const hash = crypto.createHash("sha256").update(`${engine}\n${v}\n${t}`).digest("hex");
  const hit = cacheGet(hash);
  if (hit) return { ok: true, ...hit, cached: true };
  if (username && (await used(`user:${username}`, day(now))) + t.length > cfg.studentDailyChars) return { ok: false, fallback: "browser", reason: "daily share used" };

  let out;
  if (own) {
    const r = await ownSay(own, t, v, fetchImpl);
    if (!r.ok) return { ok: false, fallback: "browser", reason: r.reason };
    out = { engine, voice: v, mime: "audio/wav", audio: r.audio, timing: r.timing };
  } else {
    // 85% of the month's free characters, for the whole site.
    if ((await used("site", month(now))) + t.length > cfg.monthlyChars * SAFE) return { ok: false, fallback: "browser", reason: "monthly free voice used" };
    let r;
    try {
      r = await fetchImpl(`https://${azure.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azure.key,
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
    out = { engine, voice: v, mime: "audio/mpeg", audio, timing: null };
  }
  if (username) await addUse(`user:${username}`, day(now), t.length);
  cachePut(hash, out);
  return { ok: true, ...out, cached: false };
}

async function adminTtsView(loadSttConfig, now = new Date()) {
  const cfg = await loadTtsConfig();
  const link = await azureLink(loadSttConfig);
  const { ownKey, ...rest } = cfg;
  let hint = "";
  try {
    hint = ownKey ? last4(open(ownKey)) : "";
  } catch {
    hint = "";
  }
  return {
    ...rest,
    ownKeySet: !!ownKey,
    ownKeyHint: hint,
    own: !!ownLink(cfg),
    freeMonthlyChars: FREE_MONTHLY_CHARS,
    stopAt: Math.floor(cfg.monthlyChars * SAFE),
    usedThisMonth: await used("site", month(now)),
    linked: !!link,
    voices: VOICES,
    ownVoices: OWN_VOICES,
  };
}

/** What the browser may use: our own voices, or Azure's when it is on. */
async function statusView(loadSttConfig) {
  const cfg = await loadTtsConfig().catch(() => ({ enabled: false }));
  if (!cfg.enabled) return { available: false, engine: null, voices: {} };
  if (ownLink(cfg)) return { available: true, engine: "own", voices: { "en-IN": OWN_VOICES, "hi-IN": OWN_VOICES } };
  const link = cfg.azureFree ? await azureLink(loadSttConfig).catch(() => null) : null;
  return link ? { available: true, engine: "azure", voices: VOICES } : { available: false, engine: null, voices: {} };
}

function createTtsRouter({ requireAuthenticatedUser, isTrustedOrigin, loadSttConfig = require("./stt").loadConfig }) {
  const rateLimit = require("express-rate-limit");
  const { requirePerm } = require("../authz/permissions");
  const router = express.Router();
  const trusted = (req, res, next) => (isTrustedOrigin && !isTrustedOrigin(req) ? res.status(403).json({ ok: false, error: "Untrusted origin" }) : next());
  // A long answer is a few sentences; 90 a minute is generous for one student.
  const limiter = rateLimit({ windowMs: 60e3, max: 90, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.sessionUser?.username || req.ip });
  router.get("/api/voice/tts/status", requireAuthenticatedUser, async (_req, res) => {
    res.json({ ok: true, ...(await statusView(loadSttConfig)) });
  });
  router.post("/api/voice/tts", trusted, requireAuthenticatedUser, limiter, express.json({ limit: "8kb" }), async (req, res) => {
    try {
      const lang = req.body?.lang === "hi-IN" ? "hi-IN" : "en-IN";
      const voice = ALL_VOICES.has(String(req.body?.voice || "")) ? String(req.body.voice) : "";
      const r = await synthesize({ text: req.body?.text, lang, voice, username: req.sessionUser.username, loadSttConfig });
      if (!r.ok) return res.status(503).json({ ok: false, fallback: "browser", reason: r.reason });
      res.set("Cache-Control", "private, max-age=86400");
      res.json({ ok: true, engine: r.engine, voice: r.voice, mime: r.mime, audio: r.audio.toString("base64"), timing: r.timing });
    } catch {
      res.status(503).json({ ok: false, fallback: "browser" });
    }
  });
  router.get("/api/admin/voice-tts", requirePerm("ai.manage"), async (_req, res) => res.json({ ok: true, ...(await adminTtsView(loadSttConfig)) }));
  router.put("/api/admin/voice-tts", trusted, requirePerm("ai.manage"), express.json({ limit: "4kb" }), async (req, res) => {
    await saveTtsConfig(req.body || {}, req.sessionUser.username);
    res.json({ ok: true, ...(await adminTtsView(loadSttConfig)) });
  });
  // Hindi written as sounds, for the in-browser voice (HeadTTS speaks English only on its own). No AI, no service.
  router.post("/api/voice/phonetic", requireAuthenticatedUser, limiter, express.json({ limit: "8kb" }), (req, res) => {
    const text = speakable(req.body?.text);
    res.json({ ok: true, input: text && hasDevanagari(text) ? toVoiceInput(text) : text });
  });
  // Say one test sentence with the current settings (not counted against any student).
  router.post("/api/admin/voice-tts/test", trusted, requirePerm("ai.manage"), express.json({ limit: "4kb" }), async (req, res) => {
    const t0 = Date.now();
    const text = String(req.body?.text || "").slice(0, 200) || "Namaste! Main aapki NexoraGuru teacher hoon.";
    const r = await synthesize({ text, lang: req.body?.lang === "hi-IN" ? "hi-IN" : "en-IN", voice: String(req.body?.voice || ""), loadSttConfig });
    if (!r.ok) return res.json({ ok: false, reason: r.reason, ms: Date.now() - t0 });
    res.json({ ok: true, engine: r.engine, voice: r.voice, ms: Date.now() - t0, cached: r.cached, mime: r.mime, audio: r.audio.toString("base64"), visemes: r.timing?.visemes?.length || 0 });
  });
  return router;
}

module.exports = { createTtsRouter, synthesize, sanitizeTts, saveTtsConfig, loadTtsConfig, statusView, readOwn, cleanUrl, speakable, ssml, VOICES, OWN_VOICES, FREE_MONTHLY_CHARS, SAFE, _cache: cache };
