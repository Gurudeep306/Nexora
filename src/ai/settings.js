// Which AI model the website uses — chosen in Admin → AI models.
//
// Stored as one JSON row ('ai_config') in site_settings:
//   providers: [{ id, kind, name, baseUrl, key (sealed), last4, enabled, models[], test }]
//   slots:     { main, fast, fallback }          → { provider, model }
//   features:  { tutor, coach, editor, … }       → { provider, model }   (optional overrides)
//   budget:    { dailyTokens }                    (per-user daily AI budget)
//
// Every provider is OpenAI-compatible (chat/completions + models), so one
// client serves them all. Keys are sealed with AES-256-GCM (src/hive/vault.js)
// and never leave the server: the API returns only the last four characters.
// When nothing is configured here, the GROQ_* environment variables apply
// exactly as before.
const crypto = require("crypto");
const { all, run, onWrite } = require("../db");
const { seal, open, last4 } = require("../hive/vault");

/** Providers an admin can pick from (all speak the OpenAI chat API). */
const PRESETS = [
  { kind: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", free: true },
  { kind: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", free: true },
  { kind: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyUrl: "https://aistudio.google.com/apikey", free: true },
  { kind: "cerebras", name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", keyUrl: "https://cloud.cerebras.ai", free: true },
  { kind: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys", free: true },
  { kind: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1", keyUrl: "https://api.together.ai/settings/api-keys", free: false },
  { kind: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", keyUrl: "https://platform.deepseek.com/api_keys", free: false },
  { kind: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys", free: false },
  { kind: "anthropic", name: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com/v1", keyUrl: "https://console.anthropic.com/settings/keys", free: false },
  // NexoraGuru's own model on a free server (deploy/coder-model): paste the URL and password its setup printed.
  { kind: "selfhosted", name: "Your own model (free server)", baseUrl: "", keyUrl: "https://github.com/Gurudeep306/Nexora/blob/main/deploy/coder-model/README.md", free: true },
  { kind: "custom", name: "Custom (OpenAI-compatible)", baseUrl: "", keyUrl: "", free: false },
];
const PRESET_BY_KIND = new Map(PRESETS.map((p) => [p.kind, p]));

/** The site's AI features, each mapped from the task modes in modes.js. */
const FEATURES = [
  { id: "tutor", name: "AI tutor chat", hint: "The assistant on every page, and one-shot explanations.", modes: ["chat", "tutor", "animate"] },
  { id: "coach", name: "Code coach, AI tests and analysis", hint: "Coach hints, AI-written tests, complexity and bug analysis.", modes: ["coach_insight", "coach_tests", "coach_explain", "coach_ask", "testgen_plan", "testgen_cases", "testgen_brute", "testgen_solution", "testgen_fix", "code_analysis"] },
  { id: "editor", name: "Editor help", hint: "Ghost completions and quick fixes in the code editor.", modes: ["complete", "fix"] },
  { id: "translate", name: "Translate", hint: "Problem statements in other languages.", modes: ["translate", "detect_lang"] },
  { id: "finder", name: "Problem finder", hint: "Natural-language problem search.", modes: ["find_problems_intent", "find_problems_rank"] },
  { id: "gate", name: "GATE reports", hint: "Narratives on test results.", modes: ["gate_narrative"] },
  { id: "studio", name: "Studio authoring", hint: "Drafting problems and lessons in the Studio.", modes: ["studio_author"] },
];
const FEATURE_OF_MODE = new Map(FEATURES.flatMap((f) => f.modes.map((m) => [m, f.id])));
const SLOTS = ["main", "fast", "fallback"];

const KEY = "ai_config";
const TTL_MS = 60_000;
let cache = null; // { at, config }
let generation = 0;
onWrite(/site_settings/i, () => {
  generation++;
  cache = null;
});

function emptyConfig() {
  return { providers: [], slots: {}, features: {}, budget: {} };
}

function normalize(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    providers: Array.isArray(c.providers) ? c.providers.filter((p) => p && typeof p.id === "string") : [],
    slots: c.slots && typeof c.slots === "object" ? c.slots : {},
    features: c.features && typeof c.features === "object" ? c.features : {},
    budget: c.budget && typeof c.budget === "object" ? c.budget : {},
  };
}

/** Load (and cache) the stored config. */
async function loadConfig() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.config;
  const gen = generation;
  const rows = await all("SELECT value FROM site_settings WHERE key = ?", [KEY]).catch(() => []);
  let config = emptyConfig();
  try {
    if (rows[0]) config = normalize(JSON.parse(rows[0].value));
  } catch {
    /* corrupt: behave as unconfigured */
  }
  if (gen === generation) cache = { at: Date.now(), config };
  return config;
}

/** The last loaded config, synchronously (never touches the database). */
function peekConfig() {
  return cache?.config || emptyConfig();
}

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

/** A provider as the admin API shows it: never the key. */
function publicProvider(p) {
  return {
    id: p.id,
    kind: p.kind,
    name: p.name,
    baseUrl: p.baseUrl,
    last4: p.last4 || "",
    hasKey: !!p.key,
    enabled: p.enabled !== false,
    models: Array.isArray(p.models) ? p.models.slice(0, 500) : [],
    test: p.test || null,
  };
}

function newProvider({ kind, name, baseUrl, apiKey }) {
  const preset = PRESET_BY_KIND.get(kind) || PRESET_BY_KIND.get("custom");
  const url = String(baseUrl || preset.baseUrl || "").trim().replace(/\/+$/, "");
  return {
    id: `p_${crypto.randomBytes(6).toString("hex")}`,
    kind: preset.kind,
    name: String(name || preset.name).trim().slice(0, 60) || preset.name,
    baseUrl: url,
    key: apiKey ? seal(String(apiKey).trim()) : "",
    last4: apiKey ? last4(apiKey) : "",
    enabled: true,
    models: [],
    test: null,
  };
}

function providerKey(p) {
  try {
    return p?.key ? open(p.key) : "";
  } catch {
    return "";
  }
}

/** Ask a provider for its model list. Resolves to { ok, models, ms, error }. */
async function testProvider(p, { fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const key = providerKey(p);
  if (!p.baseUrl) return { ok: false, models: [], ms: 0, error: "No base URL" };
  if (!key) return { ok: false, models: [], ms: 0, error: "No API key" };
  const started = Date.now();
  try {
    const res = await fetchImpl(`${p.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}`, "x-api-key": key, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? "The key was refused" : `The provider answered ${res.status}`;
      return { ok: false, models: [], ms, error: msg };
    }
    const j = await res.json().catch(() => ({}));
    const list = Array.isArray(j?.data) ? j.data : Array.isArray(j?.models) ? j.models : [];
    const models = [...new Set(list.map((m) => String(m?.id || m?.name || "").replace(/^models\//, "")).filter(Boolean))].sort();
    return { ok: true, models, ms, error: null };
  } catch (e) {
    return { ok: false, models: [], ms: Date.now() - started, error: e?.name === "TimeoutError" ? "Timed out" : "Could not reach the provider" };
  }
}

/** Send one tiny chat request to check a model really answers. */
async function tryModel(p, model, { fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
  const key = providerKey(p);
  if (!key || !p.baseUrl) return { ok: false, ms: 0, error: "Provider is missing its key or URL" };
  const started = Date.now();
  try {
    const res = await fetchImpl(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with the single word: ready" }], max_tokens: 16, temperature: 0 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    if (!res.ok) return { ok: false, ms, error: res.status === 401 || res.status === 403 ? "The key was refused" : `The provider answered ${res.status}` };
    const j = await res.json().catch(() => ({}));
    const reply = String(j?.choices?.[0]?.message?.content || "").trim().slice(0, 40);
    return { ok: true, ms, reply, error: null };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: e?.name === "TimeoutError" ? "Timed out" : "Could not reach the provider" };
  }
}

/** { apiKey, baseUrl, model } for an assignment, or null when it can't be used. */
function target(config, a) {
  if (!a || !a.provider || !a.model) return null;
  const p = config.providers.find((x) => x.id === a.provider);
  if (!p || p.enabled === false) return null;
  const apiKey = providerKey(p);
  if (!apiKey || !p.baseUrl) return null;
  return { apiKey, baseUrl: p.baseUrl, model: String(a.model), provider: p.id };
}

/**
 * What a call should use: the feature's own choice, else the slot (main/fast),
 * else null (the caller falls back to the environment). Sync: reads the cache.
 */
function resolve({ mode, slot = "main" } = {}) {
  const config = peekConfig();
  const feature = mode ? FEATURE_OF_MODE.get(mode) : null;
  const primary = (feature && target(config, config.features[feature])) || target(config, config.slots[slot]) || target(config, config.slots.main);
  if (!primary) return null;
  const fb = target(config, config.slots.fallback);
  return { ...primary, fallback: fb && fb.provider === primary.provider ? fb.model : null };
}

const configuredInAdmin = () => !!target(peekConfig(), peekConfig().slots.main);

function budgetTokens() {
  const n = Number(peekConfig().budget?.dailyTokens);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Warm the cache at boot and keep it fresh, so sync readers see admin changes.
function startRefresh() {
  loadConfig().catch(() => {});
  const t = setInterval(() => loadConfig().catch(() => {}), TTL_MS);
  t.unref?.();
}

module.exports = {
  providerKeyFor: providerKey,
  PRESETS,
  FEATURES,
  SLOTS,
  FEATURE_OF_MODE,
  loadConfig,
  peekConfig,
  saveConfig,
  publicProvider,
  newProvider,
  testProvider,
  tryModel,
  resolve,
  configuredInAdmin,
  budgetTokens,
  startRefresh,
  _reset: () => {
    cache = null;
  },
};
