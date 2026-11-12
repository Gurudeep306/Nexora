// Provider catalogue for Hive. "openai_compat" covers any OpenAI-compatible
// endpoint; presets fill in the base URL for well-known ones.
const anthropic = require("./anthropic");
const openai = require("./openai");
const gemini = require("./gemini");

const PROVIDERS = {
  anthropic: { label: "Claude", vendor: "Anthropic", impl: anthropic, suggested: anthropic.SUGGESTED, keyHint: "sk-ant-…", docs: "https://console.anthropic.com/settings/keys" },
  openai: { label: "GPT", vendor: "OpenAI", impl: openai, suggested: openai.SUGGESTED, keyHint: "sk-…", docs: "https://platform.openai.com/api-keys", official: true },
  gemini: { label: "Gemini", vendor: "Google", impl: gemini, suggested: gemini.SUGGESTED, keyHint: "AIza…", docs: "https://aistudio.google.com/apikey" },
  openai_compat: { label: "Compatible", vendor: "OpenAI-compatible", impl: openai, suggested: [], keyHint: "API key", baseUrlRequired: true },
};

const COMPAT_PRESETS = [
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { id: "xai", label: "xAI Grok", baseUrl: "https://api.x.ai/v1" },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { id: "together", label: "Together", baseUrl: "https://api.together.xyz/v1" },
];

function providerOf(id) {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

function catalogue() {
  return {
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({
      id,
      label: p.label,
      vendor: p.vendor,
      suggested: p.suggested,
      keyHint: p.keyHint,
      docs: p.docs || null,
      baseUrlRequired: !!p.baseUrlRequired,
    })),
    compatPresets: COMPAT_PRESETS,
    prices: anthropic.PRICES,
  };
}

module.exports = { PROVIDERS, providerOf, catalogue };
