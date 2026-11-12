// Model intelligence: which of a key's models can chat, which to default to,
// and the radar — every model id each vendor offers, with when it first
// appeared, refreshed daily so new releases show up without a code change.
const { run, all, now } = require("./db");

// Ids that are not chat/coding models (audio, embeddings, image-only, safety…).
const NOT_CHAT = /(embed|whisper|tts|transcri|audio|speech|realtime|moderation|guard|rerank|dall-?e|image-|-image|imagen|veo|flux|stable-diffusion|sdxl|davinci|babbage|text-similarity|search-|-search|computer-use|aqa|playai|distil|bge-|e5-|nomic)/i;

const isChatModel = (id) => !!id && !NOT_CHAT.test(id);

/** Rough capability tier (lower = stronger) used to rank defaults. */
function strength(id) {
  const s = id.toLowerCase();
  let score = 50;
  if (/(opus|fable|mythos|-pro\b|pro-|gpt-5(?!.*(mini|nano))|o3(?!-mini)|grok-4(?!.*mini)|large|max|coder-plus|480b|405b|k2|r1|reasoner|v3)/.test(s)) score -= 25;
  if (/(sonnet|flash(?!-lite)|70b|120b|medium|plus|turbo)/.test(s)) score -= 12;
  if (/(mini|nano|haiku|lite|small|instant|\b(1|3|7|8|9|12|20)b\b)/.test(s)) score += 15;
  if (/(preview|exp|experimental|beta)/.test(s)) score += 1;
  // Newer versions first: a model family's version number (not a size like 70b).
  const v = s.replace(/\d+b\b/g, "").match(/(\d+(?:[.-]\d)?)(?!\d)/);
  if (v) score -= Math.min(15, 3 * (parseFloat(v[1].replace("-", ".")) || 0));
  if (/\d{4}-?\d{2}-?\d{2}|\d{4}$/.test(s)) score += 2; // dated snapshots after aliases
  return score;
}

/** The model a key should use when nobody picked one. */
function pickDefault(models, suggested = []) {
  const chat = (models || []).filter(isChatModel);
  for (const s of suggested) if (chat.includes(s)) return s;
  if (!chat.length) return suggested[0] || models?.[0] || null;
  return [...chat].sort((a, b) => strength(a) - strength(b) || a.localeCompare(b))[0];
}

/** Record a vendor's current model list; returns the ids seen for the first time. */
async function observe(vendor, models) {
  const t = now();
  const known = new Set((await all("SELECT model FROM hive_models WHERE vendor=?", [vendor])).map((r) => r.model));
  const fresh = [];
  for (const m of models.slice(0, 600)) {
    if (known.has(m)) continue;
    fresh.push(m);
    await run("INSERT INTO hive_models(vendor, model, first_seen, last_seen) VALUES(?,?,?,?) ON CONFLICT(vendor, model) DO NOTHING", [vendor, m, known.size ? t : 0, t]);
  }
  if (models.length) {
    await run(`UPDATE hive_models SET last_seen=? WHERE vendor=? AND model IN (${models.slice(0, 600).map(() => "?").join(",")})`, [t, vendor, ...models.slice(0, 600)]);
  }
  // The first sighting of a vendor is the baseline, not "new".
  return known.size ? fresh : [];
}

/** Models that appeared in the last `days` days (first_seen 0 = baseline). */
async function recent(days = 30) {
  const since = now() - days * 86400e3;
  return all("SELECT vendor, model, first_seen, last_seen FROM hive_models WHERE first_seen >= ? AND first_seen > 0 ORDER BY first_seen DESC LIMIT 200", [since]);
}

// What's new across the market: OpenRouter's public catalogue lists models
// from every lab with release dates and prices (no key needed). Cached 6 h.
let market = { at: 0, models: [] };
async function marketFeed({ force = false } = {}) {
  if (!force && Date.now() - market.at < 6 * 3600e3 && market.models.length) return market;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { "User-Agent": "NexoraHive/1.0" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const j = await res.json();
    const models = (j.data || [])
      .filter((m) => m?.id && m.created)
      .sort((a, b) => b.created - a.created)
      .slice(0, 80)
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        lab: String(m.id).split("/")[0],
        created: m.created * 1000,
        context: m.context_length || null,
        input: m.pricing?.prompt != null ? Number(m.pricing.prompt) * 1e6 : null,
        output: m.pricing?.completion != null ? Number(m.pricing.completion) * 1e6 : null,
        modalities: m.architecture?.input_modalities || null,
        description: String(m.description || "").slice(0, 280),
      }));
    market = { at: Date.now(), models, error: null };
  } catch (e) {
    market = { ...market, at: Date.now() - 5 * 3600e3, error: e.message }; // retry in ~1 h
  }
  return market;
}

module.exports = { marketFeed, isChatModel, pickDefault, strength, observe, recent, NOT_CHAT };
