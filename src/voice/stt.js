/*
  Ears for the whole site: speech to text through a chain of services, most
  accurate first, chosen for Indian speech (Hindi, Hinglish, Indian English
  and other Indian languages). Admin → AI models → Voice recognition sets the
  order, the keys and each service's free limits.

  docs/voice/STEP1_EARS_DESIGN.md §S4 and §S7.

  - The chain is walked in order. A service is skipped when it is off, has no
    key, is cooling down after an error, or has used 85% of any of its limits
    (per minute, hour, day, month, or a one-time free credit). So a limit is
    never hit and nothing is ever charged: when every service is full, the
    student's own browser recognition is used instead.
  - Usage is counted here (requests and audio seconds) in the `voice_stt_usage`
    table, so it survives restarts.
  - Keys are sealed at rest (src/hive/vault) and never sent back to a browser.
  - Audio is never stored.
*/
const { all, get, run } = require("../db");
const { seal, open } = require("../hive/vault");
const { normalise } = require("./normalise");

const KEY = "voice_stt";
const SAFE = 0.85; // switch before a limit, not after errors
const UNSURE_BELOW = 0.6; // S6: a service's own confidence under this is unsure

const trimmed = (s) => String(s || "").trim();
/** Same words, ignoring case, punctuation and spacing (S6's agreement check). */
function sameWords(a, b) {
  const norm = (s) => trimmed(s).toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}+\-*/=<>!&|[\]]+/gu, " ").trim();
  return norm(a) === norm(b);
}

/*
  The services we support, in the default order for Indian speech. The order
  comes from published comparisons (an independent Hindi benchmark put Google
  first; Sarvam, an Indian company, leads on Hinglish and code-mixed speech in
  its own and others' tests). It is a starting point only: measure on our own
  clips (scripts/voice, §S9) and reorder in Admin.

  `limits` are the free allowances as published when this was written; check
  each provider's console and adjust in Admin. `credit` means a one-time free
  credit that does not refill: we stop at the seconds it covers.
*/
const KINDS = {
  sarvam: {
    label: "Sarvam AI (Saaras / Saarika)",
    why: "Built in India for 22 Indian languages and Hinglish (code-mixed) speech.",
    models: ["saaras:v3", "saarika:v2.5"],
    defaultModel: "saaras:v3",
    // ₹1,000 free credit at ₹30 per hour of audio ≈ 33 hours, once.
    limits: { perMinute: 60, creditSeconds: 30 * 3600 },
    signup: "https://dashboard.sarvam.ai",
  },
  google: {
    label: "Google Cloud Speech-to-Text",
    why: "Lowest Hindi error in an independent 2026 benchmark; en-IN, hi-IN and many Indian languages.",
    models: ["latest_long", "default", "latest_short"],
    defaultModel: "latest_short",
    // 60 free minutes a month.
    limits: { perMinute: 60, perMonthSeconds: 60 * 60 },
    signup: "https://console.cloud.google.com/apis/library/speech.googleapis.com",
  },
  elevenlabs: {
    label: "ElevenLabs Scribe",
    why: "99 languages including Hindi and other Indian languages; strong on noisy audio.",
    models: ["scribe_v1"],
    defaultModel: "scribe_v1",
    // The free plan's monthly credits; adjust to your plan.
    limits: { perMinute: 10, perMonthSeconds: 2 * 3600 },
    signup: "https://elevenlabs.io/app/settings/api-keys",
  },
  groq: {
    label: "Groq Whisper",
    why: "Very fast open Whisper; good Hinglish in Roman letters; free daily allowance.",
    models: ["whisper-large-v3", "whisper-large-v3-turbo"],
    defaultModel: "whisper-large-v3-turbo",
    limits: { perMinute: 20, perDay: 2000, perHourSeconds: 7200, perDaySeconds: 28800 },
    signup: "https://console.groq.com/keys",
  },
  deepgram: {
    label: "Deepgram Nova-3",
    why: "Fast, supports Hindi and multilingual (code-switching) speech; one-time $200 credit.",
    models: ["nova-3", "nova-2"],
    defaultModel: "nova-3",
    // About $200 at roughly $0.0043–0.0077 a minute ≈ 400+ hours; we stop well before.
    limits: { perMinute: 60, creditSeconds: 300 * 3600 },
    signup: "https://console.deepgram.com",
  },
  azure: {
    label: "Microsoft Azure Speech",
    why: "en-IN, hi-IN and other Indian locales; 5 free hours a month.",
    models: ["default"],
    defaultModel: "default",
    limits: { perMinute: 20, perMonthSeconds: 5 * 3600 },
    needsRegion: true,
    signup: "https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices",
  },
  openai_compatible: {
    label: "Whisper-compatible server (own or other)",
    why: "Any /audio/transcriptions endpoint: a self-hosted IndicConformer or Whisper, Cloudflare, OpenRouter…",
    models: [],
    defaultModel: "whisper-1",
    limits: { perMinute: 30 },
    needsUrl: true,
  },
};

const DEFAULT_ORDER = ["sarvam", "google", "elevenlabs", "groq", "deepgram", "azure"];

/* ── settings ── */

let tableReady = null;
function ready() {
  if (!tableReady) {
    tableReady = run(`CREATE TABLE IF NOT EXISTS voice_stt_usage (
      provider TEXT NOT NULL,
      period TEXT NOT NULL,
      requests INTEGER NOT NULL DEFAULT 0,
      seconds REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (provider, period)
    )`).catch((e) => {
      tableReady = null;
      throw e;
    });
  }
  return tableReady;
}

function clampLimits(kind, raw) {
  const base = KINDS[kind]?.limits || {};
  const out = {};
  for (const k of ["perMinute", "perDay", "perHourSeconds", "perDaySeconds", "perMonthSeconds", "creditSeconds"]) {
    const v = raw && raw[k] !== undefined ? raw[k] : base[k];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = Math.min(n, 1e9);
  }
  // Zero-spend: a service with a free allowance always keeps a long-period cap
  // (day, month or one-time credit), so it can never run into paid use.
  const caps = ["perDaySeconds", "perMonthSeconds", "creditSeconds"];
  if (kind !== "openai_compatible" && !caps.some((k) => out[k] !== undefined)) {
    for (const k of caps) if (base[k] !== undefined) out[k] = base[k];
  }
  return out;
}

function sanitizeProvider(p) {
  const kind = KINDS[p?.kind] ? p.kind : null;
  if (!kind) return null;
  const id = /^[a-z0-9_-]{1,40}$/.test(String(p.id || "")) ? String(p.id) : kind;
  return {
    id,
    kind,
    label: String(p.label || KINDS[kind].label).slice(0, 80),
    enabled: p.enabled !== false,
    model: String(p.model || KINDS[kind].defaultModel).slice(0, 60),
    region: String(p.region || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40),
    url: String(p.url || "").slice(0, 300),
    key: typeof p.key === "string" ? p.key : "", // sealed
    // More keys for the same service, each from a different person's own
    // account (AGENTS.md: one person's several free accounts break the terms;
    // each staff member may add their own key).
    extraKeys: Array.isArray(p.extraKeys)
      ? p.extraKeys
          .slice(0, 10)
          .map((k) => ({ id: /^[a-z0-9]{1,12}$/.test(String(k?.id || "")) ? String(k.id) : "", owner: String(k?.owner || "").replace(/\s+/g, " ").trim().slice(0, 40), key: typeof k?.key === "string" ? k.key : "" }))
          .filter((k) => k.id && k.owner)
      : [],
    limits: clampLimits(kind, p.limits),
  };
}

async function loadConfig() {
  const row = await get("SELECT value FROM site_settings WHERE key=?", [KEY]).catch(() => null);
  let v = null;
  try {
    v = row ? JSON.parse(row.value) : null;
  } catch {
    v = null;
  }
  const providers = Array.isArray(v?.providers) ? v.providers.map(sanitizeProvider).filter(Boolean) : [];
  return { providers, studentDailySeconds: Number(v?.studentDailySeconds) > 0 ? Number(v.studentDailySeconds) : 600, autoOrder: v?.autoOrder !== false };
}

async function saveConfig(cfg, by) {
  await run(
    "INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
    [KEY, JSON.stringify(cfg), by || "admin", new Date().toISOString()],
  );
}

/** The Groq key from Admin → AI models or the environment, so Groq works without a second entry. */
async function groqFallbackKey() {
  try {
    const settings = require("../ai/settings");
    const c = await settings.loadConfig();
    const g = (c?.providers || []).find((p) => p.enabled !== false && p.kind === "groq" && p.key);
    if (g) return settings.providerKeyFor(g);
  } catch {
    /* fall through */
  }
  return process.env.GROQ_API_KEY || "";
}

function keyOf(p) {
  if (!p.key) return "";
  try {
    return open(p.key);
  } catch {
    return "";
  }
}

/* ── auto order: how each service has really done (docs §S7) ── */

let statsReady = null;
function statsTable() {
  if (!statsReady) {
    statsReady = run(`CREATE TABLE IF NOT EXISTS voice_stt_stats (
      provider TEXT NOT NULL,
      day TEXT NOT NULL,
      ok INTEGER NOT NULL DEFAULT 0,
      fail INTEGER NOT NULL DEFAULT 0,
      ms REAL NOT NULL DEFAULT 0,
      conf REAL NOT NULL DEFAULT 0,
      conf_n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (provider, day)
    )`).catch((e) => {
      statsReady = null;
      throw e;
    });
  }
  return statsReady;
}

async function addStat(id, { ok, ms = 0, confidence = null }, now = new Date()) {
  await statsTable();
  const day = now.toISOString().slice(0, 10);
  const c = typeof confidence === "number" && confidence >= 0 && confidence <= 1 ? confidence : null;
  await run(
    `INSERT INTO voice_stt_stats(provider, day, ok, fail, ms, conf, conf_n) VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(provider, day) DO UPDATE SET ok=ok+excluded.ok, fail=fail+excluded.fail, ms=ms+excluded.ms, conf=conf+excluded.conf, conf_n=conf_n+excluded.conf_n`,
    [id, day, ok ? 1 : 0, ok ? 0 : 1, ok ? ms : 0, c ?? 0, c === null ? 0 : 1],
  );
}

/** The last 14 days for each service: answers, failures, speed, confidence. */
async function statsOf(ids, now = new Date()) {
  await statsTable();
  const since = new Date(now.getTime() - 14 * 86400e3).toISOString().slice(0, 10);
  const rows = ids.length
    ? await all(`SELECT provider, SUM(ok) ok, SUM(fail) fail, SUM(ms) ms, SUM(conf) conf, SUM(conf_n) conf_n FROM voice_stt_stats WHERE day >= ? AND provider IN (${ids.map(() => "?").join(",")}) GROUP BY provider`, [since, ...ids]).catch(() => [])
    : [];
  return new Map(rows.map((r) => [r.provider, { ok: Number(r.ok) || 0, fail: Number(r.fail) || 0, ms: Number(r.ms) || 0, conf: Number(r.conf) || 0, confN: Number(r.conf_n) || 0 }]));
}

/*
  The auto order. Accuracy can't be measured live (we don't know what was
  really said), so it starts from the published accuracy order for Indian
  speech and then lets real results move services: how often each answered
  without an error, the confidence it reports, and its speed. A service needs
  20 answers before its own results count fully; until then the prior holds.
  Our own accuracy test clips (§S9) will replace the prior when recorded.
*/
function autoScore(p, st) {
  const rank = DEFAULT_ORDER.indexOf(p.kind);
  const prior = rank < 0 ? 0.55 : 1 - rank * 0.07;
  if (!st || st.ok + st.fail === 0) return prior;
  const n = st.ok + st.fail;
  const weight = Math.min(1, n / 20);
  const reliability = (st.ok + 1) / (n + 2);
  const conf = st.confN ? st.conf / st.confN : 0.85;
  const avgMs = st.ok ? st.ms / st.ok : 3000;
  const speed = avgMs <= 800 ? 1 : Math.max(0.4, 800 / avgMs);
  const measured = reliability * 0.5 + conf * 0.35 + speed * 0.15;
  return prior * (1 - weight * 0.5) + measured * (weight * 0.5);
}

async function ordered(cfg, now = new Date()) {
  if (!cfg.autoOrder) return cfg.providers;
  const stats = await statsOf(cfg.providers.map((p) => p.id), now);
  return [...cfg.providers]
    .map((p, i) => ({ p, i, s: autoScore(p, stats.get(p.id)) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}

/* ── usage and limits ── */

function periods(now = new Date()) {
  const iso = now.toISOString();
  return {
    minute: `m:${iso.slice(0, 16)}`,
    hour: `h:${iso.slice(0, 13)}`,
    day: `d:${iso.slice(0, 10)}`,
    month: `M:${iso.slice(0, 7)}`,
    ever: "ever",
  };
}

async function usageOf(id, now = new Date()) {
  await ready();
  const p = periods(now);
  const rows = await all("SELECT period, requests, seconds FROM voice_stt_usage WHERE provider=? AND period IN (?,?,?,?,?)", [id, p.minute, p.hour, p.day, p.month, p.ever]);
  const at = (k) => rows.find((r) => r.period === p[k]) || { requests: 0, seconds: 0 };
  return { minute: at("minute"), hour: at("hour"), day: at("day"), month: at("month"), ever: at("ever") };
}

async function addUsage(id, seconds, now = new Date()) {
  await ready();
  const p = periods(now);
  for (const period of Object.values(p)) {
    await run(
      "INSERT INTO voice_stt_usage(provider, period, requests, seconds) VALUES(?,?,1,?) ON CONFLICT(provider, period) DO UPDATE SET requests=requests+1, seconds=seconds+excluded.seconds",
      [id, period, seconds],
    );
  }
  // Old minute and hour rows are not needed after a day.
  if (Math.random() < 0.02) await pruneUsage(now).catch(() => {});
}

/*
  Drop minute and hour rows older than two days. GLOB, not LIKE: LIKE ignores
  case, so 'm:%' would also match the monthly rows ('M:2026-11'), and each kind
  of row is compared with a cut-off of its own kind; otherwise every hour row
  ('h:…' sorts before 'm:…') and every month row would be deleted, silently
  resetting the free-limit counters.
*/
async function pruneUsage(now = new Date()) {
  await ready();
  const cut = new Date(now.getTime() - 2 * 86400e3).toISOString();
  await run("DELETE FROM voice_stt_usage WHERE (period GLOB 'm:*' AND period < ?) OR (period GLOB 'h:*' AND period < ?)", [`m:${cut.slice(0, 16)}`, `h:${cut.slice(0, 13)}`]);
}

/** Why a service can't take a clip of `seconds` now, or null when it can. */
function overLimit(limits, use, seconds) {
  const checks = [
    ["perMinute", use.minute.requests + 1, "requests this minute"],
    ["perDay", use.day.requests + 1, "requests today"],
    ["perHourSeconds", use.hour.seconds + seconds, "audio this hour"],
    ["perDaySeconds", use.day.seconds + seconds, "audio today"],
    ["perMonthSeconds", use.month.seconds + seconds, "audio this month"],
    ["creditSeconds", use.ever.seconds + seconds, "its free credit"],
  ];
  for (const [k, value, what] of checks) {
    if (limits[k] !== undefined && value > limits[k] * SAFE) return `near the limit on ${what}`;
  }
  return null;
}

/* Errors: a service that fails rests for a while; out of credit rests a day. */
const cooling = new Map(); // id → { until, why }
function rest(id, ms, why) {
  cooling.set(id, { until: Date.now() + ms, why });
}

/* ── the services ── */

const LANG = {
  // our setting → each service's code
  "en-IN": { sarvam: "en-IN", google: "en-IN", whisper: "en", eleven: "eng", deepgram: "en-IN", azure: "en-IN" },
  "hi-IN": { sarvam: "hi-IN", google: "hi-IN", whisper: "hi", eleven: "hin", deepgram: "hi", azure: "hi-IN" },
};
const langFor = (lang, k) => (LANG[lang] || LANG["en-IN"])[k];

async function call(url, init, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const text = await r.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 300) };
    }
    if (!r.ok) {
      const err = new Error(`HTTP ${r.status}`);
      err.status = r.status;
      err.retryAfter = Number(r.headers.get("retry-after")) || 0;
      throw err;
    }
    return body;
  } finally {
    clearTimeout(t);
  }
}

function wavForm(audio) {
  return new Blob([audio], { type: "audio/wav" });
}

const ADAPTERS = {
  async sarvam(p, key, { audio, lang }) {
    const fd = new FormData();
    fd.append("file", wavForm(audio), "clip.wav");
    fd.append("model", p.model);
    fd.append("language_code", langFor(lang, "sarvam"));
    const b = await call("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: fd });
    return { text: b.transcript || "" };
  },
  async google(p, key, { audio, lang, phrases }) {
    const body = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: langFor(lang, "google"),
        alternativeLanguageCodes: lang === "hi-IN" ? ["en-IN"] : ["hi-IN"],
        enableAutomaticPunctuation: true,
        model: p.model,
        speechContexts: phrases.length ? [{ phrases: phrases.slice(0, 500), boost: 10 }] : undefined,
      },
      audio: { content: Buffer.from(audio.subarray(44)).toString("base64") },
    };
    const b = await call(`https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const alts = (b.results || []).map((r) => r.alternatives?.[0]).filter(Boolean);
    const conf = alts.length ? alts.reduce((a, x) => a + (x.confidence ?? 0.8), 0) / alts.length : 0;
    return { text: alts.map((a) => a.transcript).join(" ").trim(), confidence: conf };
  },
  async elevenlabs(p, key, { audio, lang }) {
    const fd = new FormData();
    fd.append("file", wavForm(audio), "clip.wav");
    fd.append("model_id", p.model);
    fd.append("language_code", langFor(lang, "eleven"));
    fd.append("tag_audio_events", "false");
    const b = await call("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd });
    return { text: b.text || "", confidence: typeof b.language_probability === "number" ? b.language_probability : undefined };
  },
  async groq(p, key, { audio, lang, prompt }) {
    return whisperLike("https://api.groq.com/openai/v1/audio/transcriptions", p.model, key, { audio, lang, prompt });
  },
  async openai_compatible(p, key, { audio, lang, prompt }) {
    const base = p.url.replace(/\/+$/, "");
    const url = /\/audio\/transcriptions$/.test(base) ? base : `${base}/audio/transcriptions`;
    return whisperLike(url, p.model, key, { audio, lang, prompt });
  },
  async deepgram(p, key, { audio, lang, phrases }) {
    const q = new URLSearchParams({ model: p.model, smart_format: "true", punctuate: "true" });
    // Nova-3 hears Hindi–English mixing with "multi".
    q.set("language", lang === "hi-IN" ? "multi" : "en-IN");
    if (p.model.startsWith("nova-3")) for (const w of phrases.slice(0, 50)) q.append("keyterm", w);
    const b = await call(`https://api.deepgram.com/v1/listen?${q}`, { method: "POST", headers: { Authorization: `Token ${key}`, "content-type": "audio/wav" }, body: audio });
    const alt = b?.results?.channels?.[0]?.alternatives?.[0];
    return { text: alt?.transcript || "", confidence: alt?.confidence };
  },
  async azure(p, key, { audio, lang }) {
    const region = p.region || "centralindia";
    const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${langFor(lang, "azure")}&format=detailed`;
    const b = await call(url, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "content-type": "audio/wav; codecs=audio/pcm; samplerate=16000" }, body: audio });
    const best = b?.NBest?.[0];
    return { text: best?.Display || b?.DisplayText || "", confidence: best?.Confidence };
  },
};

async function whisperLike(url, model, key, { audio, lang, prompt }) {
  const fd = new FormData();
  fd.append("file", wavForm(audio), "clip.wav");
  fd.append("model", model);
  fd.append("language", langFor(lang, "whisper"));
  fd.append("temperature", "0");
  fd.append("response_format", "verbose_json");
  if (prompt) fd.append("prompt", prompt);
  const b = await call(url, { method: "POST", headers: key ? { Authorization: `Bearer ${key}` } : {}, body: fd });
  const segs = Array.isArray(b.segments) ? b.segments : [];
  // Whisper's own doubt signals (docs §S6): low log-probability, likely silence, or repeats.
  const unsure = segs.some((s) => s.avg_logprob < -0.8 || s.no_speech_prob > 0.5 || s.compression_ratio > 2.4);
  const lp = segs.length ? segs.reduce((a, s) => a + (s.avg_logprob ?? 0), 0) / segs.length : -0.3;
  return { text: (b.text || "").trim(), confidence: unsure ? 0.4 : Math.max(0, Math.min(1, 1 + lp)), unsure };
}

/* ── vocabulary hints (docs §S4) ── */

const GLOSSARY = [
  "array", "queue", "stack", "BFS", "DFS", "binary search", "linked list", "pointer", "recursion", "DP", "dynamic programming",
  "mid", "low", "high", "i plus plus", "n minus one", "O of n log n", "hash map", "heap", "graph", "node", "edge", "vertex",
  "GATE", "Dijkstra", "Kruskal", "Prim", "sorting", "merge sort", "quick sort", "time complexity", "submit", "run",
];

function hintsFrom(extra) {
  const words = [...GLOSSARY, ...(Array.isArray(extra) ? extra : [])]
    .map((w) => String(w).replace(/[^\p{L}\p{N} +\-_.]/gu, "").trim())
    .filter((w) => w && w.length <= 40);
  return [...new Set(words)].slice(0, 200);
}

function promptFrom(phrases, lang) {
  const sample = lang === "hi-IN" ? "मिड को अपडेट करो, low बराबर mid प्लस एक।" : "mid ko update karo, low equals mid plus one.";
  let p = `${phrases.join(", ")}. ${sample}`;
  // Whisper reads at most 224 tokens of prompt; ~4 characters a token.
  if (p.length > 800) p = p.slice(p.length - 800);
  return p;
}

/* ── audio checks ── */

/** Seconds in a 16-bit mono WAV, or null when it isn't one. */
function wavSeconds(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  const rate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const ch = buf.readUInt16LE(22);
  if (!rate || bits !== 16 || ch !== 1) return null;
  return (buf.length - 44) / (rate * 2);
}

/* ── the chain ── */

/** A service's keys: the main one (its usage under the service's own id), then each person's. */
async function slotsOf(p) {
  let main = keyOf(p);
  if (!main && p.kind === "groq") main = await groqFallbackKey();
  const out = [{ id: p.id, owner: "", key: main }];
  for (const k of p.extraKeys || []) {
    let key = "";
    try {
      key = k.key ? open(k.key) : "";
    } catch {
      key = "";
    }
    out.push({ id: `${p.id}~${k.id}`, owner: k.owner, key });
  }
  return out;
}

/**
 * Transcribe one clip. Walks the chain; returns { ok, text (normalised, S5),
 * raw, code and unplaced (mode "code"), changes, confidence, unsure (S6),
 * alternatives (two services disagreed), provider, tried } or
 * { ok: false, fallback: 'browser', tried }.
 *
 * S6: an unsure answer (the service's own doubt signals, a confidence under
 * 0.6, or words a code page can't place) is checked once with the next
 * service. The same words: trusted. Different words: both are returned for the
 * student to pick. No second service: the answer comes back marked unsure.
 */
async function transcribe({ audio, lang = "en-IN", hints = [], mode = "text", username = "", fetchConfig = loadConfig, now = new Date() }) {
  const seconds = wavSeconds(audio);
  if (seconds === null) return { ok: false, error: "That isn't a 16 kHz mono WAV clip.", status: 400 };
  if (seconds < 0.3) return { ok: true, text: "", provider: null, tried: [] };
  if (seconds > 60) return { ok: false, error: "Clips are at most 60 seconds.", status: 400 };
  const cfg = await fetchConfig();
  // Fair share: a soft daily budget of server ears per student.
  if (username) {
    const mine = await usageOf(`user:${username}`, now);
    if (mine.day.seconds + seconds > cfg.studentDailySeconds) return { ok: false, fallback: "browser", reason: "daily share used", tried: [] };
  }
  const phrases = hintsFrom(hints);
  const prompt = promptFrom(phrases, lang);
  const tried = [];
  // S6: an unsure answer is checked once with the next service (not another key of the same one).
  let held = null;
  const list = await ordered(cfg, now);
  services: for (const p of list) {
    if (!p.enabled) continue;
    if (held && held.provider === p.id) continue;
    // The service's keys in turn: the main key, then each person's own key.
    const slots = await slotsOf(p);
    if (!slots.some((x) => x.key) && p.kind !== "openai_compatible") {
      tried.push({ id: p.id, skipped: "no key" });
      continue;
    }
    for (const slot of slots) {
      if (!slot.key && p.kind !== "openai_compatible") continue;
      const cool = cooling.get(slot.id);
      if (cool && cool.until > Date.now()) {
        tried.push({ id: slot.id, skipped: cool.why });
        continue;
      }
      // Each person's account has its own free limits.
      const why = overLimit(p.limits, await usageOf(slot.id, now), seconds);
      if (why) {
        tried.push({ id: slot.id, skipped: why });
        continue;
      }
      const t0 = Date.now();
      try {
        const r = await ADAPTERS[p.kind](p, slot.key, { audio, lang, phrases, prompt });
        await addUsage(slot.id, seconds, now);
        if (username) await addUsage(`user:${username}`, seconds, now);
        const raw = String(r.text || "").trim();
        // S5: clean the text and fix names (src/voice/normalise.js).
        const n = normalise(raw, { mode, hints, lang });
        // Hindi written in Urdu script: a wrong answer for us; try the next service.
        if (n.retryHindi) {
          tried.push({ id: slot.id, skipped: "answered in Urdu script" });
          continue;
        }
        tried.push({ id: slot.id, ms: Date.now() - t0 });
        await addStat(p.id, { ok: true, ms: Date.now() - t0, confidence: r.confidence ?? null }, now).catch(() => {});
        const conf = typeof r.confidence === "number" ? r.confidence : null;
        const unsure = !!r.unsure || (conf !== null && conf < UNSURE_BELOW) || (mode === "code" && (n.unplaced || []).length > 0);
        const answer = { ok: true, text: n.text, raw, ...(n.code !== undefined ? { code: n.code, unplaced: n.unplaced } : {}), changes: n.changes, confidence: conf, provider: p.id, ms: Date.now() - t0, unsure, tried };
        if (held) {
          // The second opinion: the same words means we can trust it.
          if (sameWords(held.text, answer.text)) return { ...answer, unsure: false, agreed: [held.provider, p.id] };
          return { ...held, unsure: true, alternatives: [held.text, answer.text], tried };
        }
        if (!unsure || !trimmed(raw)) return answer;
        held = answer;
        continue services;
      } catch (e) {
        const s = e.status || 0;
        // Out of credit or a bad key: rest a day. Rate-limited: rest as told. Down or slow: 3 minutes.
        if (s === 401 || s === 402 || s === 403) rest(slot.id, 24 * 3600e3, s === 402 ? "out of credit" : "key refused");
        else if (s === 429) rest(slot.id, Math.max(60e3, (e.retryAfter || 0) * 1000), "rate limited");
        else rest(slot.id, 3 * 60e3, s ? `error ${s}` : "no answer");
        tried.push({ id: slot.id, error: s || "timeout" });
        await addStat(p.id, { ok: false }, now).catch(() => {});
      }
    }
  }
  // No second opinion was possible: give the one answer, marked unsure.
  if (held) return { ...held, tried };
  return { ok: false, fallback: "browser", tried };
}

/**
 * S9 (measuring): one clip through one named service, with the same free caps,
 * usage counting and normaliser as the chain. Used by scripts/voice/asr-eval.js.
 * Returns { ok, text, raw, code?, unsure, ms } or { ok: false, why }.
 */
async function transcribeWith(providerId, { audio, lang = "en-IN", hints = [], mode = "text", fetchConfig = loadConfig, now = new Date() }) {
  const seconds = wavSeconds(audio);
  if (seconds === null || seconds > 60) return { ok: false, why: "not a 16 kHz mono WAV clip of at most 60 s" };
  const cfg = await fetchConfig();
  const p = cfg.providers.find((x) => x.id === providerId);
  if (!p) return { ok: false, why: "no such service" };
  const phrases = hintsFrom(hints);
  const prompt = promptFrom(phrases, lang);
  for (const slot of await slotsOf(p)) {
    if (!slot.key && p.kind !== "openai_compatible") continue;
    const why = overLimit(p.limits, await usageOf(slot.id, now), seconds);
    if (why) return { ok: false, why };
    const t0 = Date.now();
    try {
      const r = await ADAPTERS[p.kind](p, slot.key, { audio, lang, phrases, prompt });
      await addUsage(slot.id, seconds, now);
      const raw = String(r.text || "").trim();
      const n = normalise(raw, { mode, hints, lang });
      const conf = typeof r.confidence === "number" ? r.confidence : null;
      return { ok: true, text: n.text, raw, ...(n.code !== undefined ? { code: n.code } : {}), unsure: !!r.unsure || (conf !== null && conf < UNSURE_BELOW), ms: Date.now() - t0 };
    } catch (e) {
      return { ok: false, why: e.status ? `error ${e.status}` : "no answer" };
    }
  }
  return { ok: false, why: "no key" };
}

/* ── admin view ── */

async function adminView() {
  const cfg = await loadConfig();
  const providers = [];
  for (const p of cfg.providers) {
    const use = await usageOf(p.id).catch(() => null);
    const cool = cooling.get(p.id);
    providers.push({
      ...p,
      key: undefined,
      hasKey: !!p.key || (p.kind === "groq" && !!(await groqFallbackKey())),
      keyFromAi: !p.key && p.kind === "groq",
      cooling: cool && cool.until > Date.now() ? cool.why : null,
      usage: use && { minute: use.minute, hour: use.hour, day: use.day, month: use.month, ever: use.ever },
      extraKeys: await Promise.all(
        (p.extraKeys || []).map(async (k) => {
          const sid = `${p.id}~${k.id}`;
          const u = await usageOf(sid).catch(() => null);
          const c = cooling.get(sid);
          return { id: k.id, owner: k.owner, hasKey: !!k.key, cooling: c && c.until > Date.now() ? c.why : null, usage: u && { day: u.day, month: u.month, ever: u.ever } };
        }),
      ),
    });
  }
  const stats = await statsOf(cfg.providers.map((p) => p.id)).catch(() => new Map());
  for (const p of providers) {
    const st = stats.get(p.id);
    p.stats = st ? { answers: st.ok, failures: st.fail, avgMs: st.ok ? Math.round(st.ms / st.ok) : null, confidence: st.confN ? Math.round((st.conf / st.confN) * 100) / 100 : null } : null;
    p.score = Math.round(autoScore(p, st) * 100);
  }
  const effective = (await ordered(cfg)).map((p) => p.id);
  return {
    providers,
    autoOrder: cfg.autoOrder,
    effectiveOrder: effective,
    studentDailySeconds: cfg.studentDailySeconds,
    kinds: Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, { label: v.label, why: v.why, models: v.models, defaultModel: v.defaultModel, limits: v.limits, needsRegion: !!v.needsRegion, needsUrl: !!v.needsUrl, signup: v.signup || null }])),
    defaultOrder: DEFAULT_ORDER,
  };
}

/** Save the order, switches, models, limits and (only when given) new keys. */
async function adminSave(body, by) {
  const cur = await loadConfig();
  const incoming = Array.isArray(body?.providers) ? body.providers.slice(0, 20) : [];
  const providers = [];
  const seen = new Set();
  for (const raw of incoming) {
    const p = sanitizeProvider({ ...raw, key: "" });
    if (!p || seen.has(p.id)) continue;
    // One entry per service; more keys go inside it (extraKeys), each from a
    // different person's own account. Different servers of the
    // Whisper-compatible kind are different services, so that kind may repeat.
    if (p.kind !== "openai_compatible" && providers.some((x) => x.kind === p.kind)) continue;
    seen.add(p.id);
    const old = cur.providers.find((x) => x.id === p.id);
    if (typeof raw.newKey === "string" && raw.newKey.trim()) p.key = seal(raw.newKey.trim());
    else if (raw.removeKey) p.key = "";
    else p.key = old?.key || "";
    // Each extra key: a different person's own account, with their agreement.
    const extras = [];
    const owners = new Set();
    for (const k of Array.isArray(raw.extraKeys) ? raw.extraKeys.slice(0, 10) : []) {
      const owner = String(k?.owner || "").replace(/\s+/g, " ").trim().slice(0, 40);
      const prev = (old?.extraKeys || []).find((x) => x.id === k?.id);
      const fresh = typeof k?.newKey === "string" && k.newKey.trim();
      if (!owner) throw Object.assign(new Error("Each extra key needs the name of the person whose account it is."), { status: 400 });
      const norm = owner.toLowerCase();
      if (owners.has(norm)) throw Object.assign(new Error(`Two keys for ${p.label} are marked as ${owner}'s. Each key must be from a different person's own account.`), { status: 400 });
      owners.add(norm);
      if (!prev && !fresh) continue;
      if (fresh && !prev && k.consent !== true) throw Object.assign(new Error(`Confirm that ${owner}'s key is from their own account and they agreed.`), { status: 400 });
      const id = prev?.id || (/^[a-z0-9]{1,12}$/.test(String(k?.id || "")) ? String(k.id) : Math.random().toString(36).slice(2, 10));
      extras.push({ id, owner, key: fresh ? seal(fresh) : prev.key });
    }
    p.extraKeys = extras;
    if (p.kind === "openai_compatible" && p.url && !/^https:\/\//.test(p.url)) {
      const e = new Error("The server address must start with https://");
      e.status = 400;
      throw e;
    }
    providers.push(p);
  }
  const studentDailySeconds = Math.max(60, Math.min(24 * 3600, Number(body?.studentDailySeconds) || cur.studentDailySeconds));
  const autoOrder = typeof body?.autoOrder === "boolean" ? body.autoOrder : cur.autoOrder;
  await saveConfig({ providers, studentDailySeconds, autoOrder }, by);
  for (const p of providers) {
    cooling.delete(p.id);
    for (const k of p.extraKeys) cooling.delete(`${p.id}~${k.id}`);
  }
  return adminView();
}

/** A one-second test clip (a quiet tone) through one service: does the key work? */
function testClip() {
  const rate = 16000;
  const n = rate;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 800), 44 + i * 2);
  return buf;
}

async function adminTest(id, keyId) {
  const cfg = await loadConfig();
  const p = cfg.providers.find((x) => x.id === id);
  if (!p) return { ok: false, error: "No such service." };
  const slots = await slotsOf(p);
  const slot = keyId ? slots.find((x) => x.id === `${p.id}~${keyId}`) : slots[0];
  if (!slot) return { ok: false, error: "No such key." };
  if (!slot.key && p.kind !== "openai_compatible") return { ok: false, error: "Add a key first." };
  const t0 = Date.now();
  try {
    await ADAPTERS[p.kind](p, slot.key, { audio: testClip(), lang: "en-IN", phrases: [], prompt: "" });
    await addUsage(slot.id, 1);
    cooling.delete(slot.id);
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: e.status === 401 || e.status === 403 ? "The key was refused." : e.status === 402 ? "Out of credit." : e.status === 429 ? "Rate limited right now; try in a minute." : `It didn't answer (${e.status || "timeout"}).` };
  }
}

/* ── routes ── */

function createSttRouter({ requireAuthenticatedUser, isTrustedOrigin }) {
  const express = require("express");
  const rateLimit = require("express-rate-limit");
  const { requirePerm } = require("../authz/permissions");
  const router = express.Router();
  const trusted = (req, res, next) => (isTrustedOrigin && !isTrustedOrigin(req) ? res.status(403).json({ ok: false, error: "Untrusted origin" }) : next());
  const limiter = rateLimit({ windowMs: 60e3, max: 40, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.sessionUser?.username || req.ip });

  // Is there any server ear at all? (The mic records audio only then.)
  router.get("/api/voice/stt/status", requireAuthenticatedUser, async (_req, res) => {
    const cfg = await loadConfig().catch(() => ({ providers: [] }));
    res.json({ ok: true, available: cfg.providers.some((p) => p.enabled) });
  });

  router.post(
    "/api/voice/stt",
    trusted,
    requireAuthenticatedUser,
    limiter,
    express.raw({ type: ["audio/wav", "audio/x-wav", "application/octet-stream"], limit: "3mb" }),
    async (req, res) => {
      try {
        const lang = req.query.lang === "hi-IN" ? "hi-IN" : "en-IN";
        const hints = String(req.query.hints || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 60);
        const mode = ["text", "command", "code"].includes(req.query.mode) ? req.query.mode : "text";
        const r = await transcribe({ audio: req.body, lang, hints, mode, username: req.sessionUser.username });
        if (r.status) return res.status(r.status).json({ ok: false, error: r.error });
        res.json(r);
      } catch {
        res.json({ ok: false, fallback: "browser" });
      }
    },
  );

  router.get("/api/admin/voice-stt", requirePerm("ai.manage"), async (_req, res) => res.json({ ok: true, ...(await adminView()) }));
  // S9: the sentences to record as test clips (docs/voice/tests/asr/clips.json).
  router.get("/api/admin/voice-stt/clips", requirePerm("ai.manage"), (_req, res) => {
    try {
      const file = require("path").join(__dirname, "..", "..", "docs", "voice", "tests", "asr", "clips.json");
      res.json({ ok: true, clips: JSON.parse(require("fs").readFileSync(file, "utf8")).clips });
    } catch {
      res.status(500).json({ ok: false, error: "The clip list is missing." });
    }
  });
  router.put("/api/admin/voice-stt", trusted, requirePerm("ai.manage"), express.json({ limit: "64kb" }), async (req, res) => {
    try {
      res.json({ ok: true, ...(await adminSave(req.body, req.sessionUser.username)) });
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.status ? e.message : "Couldn't save." });
    }
  });
  router.post("/api/admin/voice-stt/test", trusted, requirePerm("ai.manage"), express.json({ limit: "4kb" }), async (req, res) => {
    res.json(await adminTest(String(req.body?.id || ""), req.body?.keyId ? String(req.body.keyId) : undefined));
  });
  return router;
}

module.exports = { createSttRouter, transcribe, transcribeWith, pruneUsage, usageOf, sameWords, autoScore, ordered, overLimit, wavSeconds, hintsFrom, promptFrom, sanitizeProvider, KINDS, DEFAULT_ORDER, ADAPTERS, adminSave, adminView, loadConfig, testClip, _cooling: cooling };
