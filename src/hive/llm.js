// One-off model calls for Hive's own reasoning (the Judge, the prompt refiner,
// the Pipeline Architect, planning): routed like everything else, with
// failover to the next candidate, usage recorded, and JSON extraction.
const keys = require("./keys");
const router = require("./router");
const { providerOf } = require("./providers");

/** Pull the first JSON object/array out of a model reply. */
function extractJson(text) {
  const s = String(text || "");
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : s;
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error("The model didn't return JSON");
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(body.slice(start, i + 1));
  }
  throw new Error("The model's JSON was cut off");
}

/**
 * ask({ kind, prompt, system, json, username, preference, exclude, spec })
 * spec (optional) forces a provider/key/model; otherwise the router picks.
 * Returns { text, data?, model, provider, note }.
 */
async function ask({ kind = "writing", prompt, system = "", json = false, username = "hive", preference = "quality", excludeVendors = [], spec = null, attachments = [], maxTries = 3, projectId = "", freeOnly = false }) {
  const tried = [];
  let lastErr = null;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    let key;
    let provider;
    let model;
    let note = null;
    if (spec && spec.provider && spec.provider !== "auto" && attempt === 0) {
      key = await keys.pickKey(spec.provider, { prefer: spec.keyId || "auto" });
      provider = spec.provider;
      model = spec.model || key?.default_model;
      if (!key) throw new Error(await keys.explainNoKey(spec.provider));
    } else {
      const pool = async (free) => (await router.candidates({ kind, needTools: false, chat: true, freeOnly: free, exclude: { keys: tried } })).filter((c) => !excludeVendors.includes(c.vendor));
      // freeOnly: Hive's housekeeping (summaries, condensing) prefers free models, falling back to any.
      let list = await pool(freeOnly);
      if (!list.length && freeOnly) list = await pool(false);
      if (!list.length) break;
      const { ranked } = router.rank(list, kind, preference);
      const c = ranked[0];
      key = c.key;
      provider = c.vendor;
      model = c.model;
      note = `${c.card.name} on ${c.vendorLabel}`;
    }
    const v = providerOf(provider);
    try {
      const res = await v.impl.turn({
        secret: keys.secretOf(key),
        keyRow: key,
        baseUrl: key.base_url || v.baseUrl,
        official: !!v.official,
        vision: !!v.caps.vision,
        model,
        effort: provider === "anthropic" ? "high" : null,
        system: system || "You are a precise senior engineer and product thinker.",
        messages: [{ role: "user", text: prompt, attachments }],
        tools: [],
        cache: true,
      });
      await keys.recordUsage(key.id, username, { input: res.usage.input, output: res.usage.output, cacheRead: res.usage.cacheRead || 0, costMicros: res.costMicros || 0 }, res.rateLimit, { projectId, vendor: provider, model: res.servedModel || model });
      const out = { text: res.text, model: res.servedModel || model, provider, note };
      if (json) out.data = extractJson(res.text);
      return out;
    } catch (e) {
      lastErr = e;
      tried.push(key.id);
      if (spec && attempt === 0) spec = null; // fall back to the router
    }
  }
  throw lastErr || new Error("No model is available — connect one in Keys");
}

module.exports = { ask, extractJson };
