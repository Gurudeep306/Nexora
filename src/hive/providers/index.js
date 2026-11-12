// Provider catalogue for Hive.
//
// A "vendor" (Claude, OpenAI, DeepSeek, Grok, …) is what staff pick and what
// keys belong to. Each vendor speaks one of three wire protocols ("impl"):
// the Anthropic SDK, OpenAI-style chat completions, or Gemini. Capabilities
// drive what the UI offers (images in, PDFs in, image generation, tool use).
const anthropic = require("./anthropic");
const openai = require("./openai");
const gemini = require("./gemini");

const IMPLS = { anthropic, openai, gemini };

const caps = (o) => ({ tools: true, vision: false, pdf: false, images: false, ...o });

// Order = the default handoff order when a vendor runs out of budget.
const VENDORS = [
  { id: "anthropic", label: "Claude", vendor: "Anthropic", impl: "anthropic", hue: 48, keyHint: "sk-ant-…", docs: "https://console.anthropic.com/settings/keys", suggested: anthropic.SUGGESTED, caps: caps({ vision: true, pdf: true }) },
  { id: "openai", label: "GPT", vendor: "OpenAI", impl: "openai", official: true, hue: 165, baseUrl: "https://api.openai.com/v1", keyHint: "sk-…", docs: "https://platform.openai.com/api-keys", suggested: openai.SUGGESTED, imageModel: "gpt-image-1", caps: caps({ vision: true, pdf: true, images: true }) },
  { id: "gemini", label: "Gemini", vendor: "Google", impl: "gemini", hue: 258, keyHint: "AIza…", docs: "https://aistudio.google.com/apikey", suggested: gemini.SUGGESTED, imageModel: "gemini-2.5-flash-image", caps: caps({ vision: true, pdf: true, images: true }) },
  { id: "deepseek", label: "DeepSeek", vendor: "DeepSeek", impl: "openai", hue: 230, baseUrl: "https://api.deepseek.com/v1", keyHint: "sk-…", docs: "https://platform.deepseek.com/api_keys", suggested: ["deepseek-chat", "deepseek-reasoner"], caps: caps() },
  { id: "xai", label: "Grok", vendor: "xAI", impl: "openai", hue: 0, chroma: 0.02, baseUrl: "https://api.x.ai/v1", keyHint: "xai-…", docs: "https://console.x.ai", suggested: ["grok-4", "grok-3-mini"], imageModel: "grok-2-image", caps: caps({ vision: true, images: true }) },
  { id: "mistral", label: "Mistral", vendor: "Mistral AI", impl: "openai", hue: 40, baseUrl: "https://api.mistral.ai/v1", keyHint: "API key", docs: "https://console.mistral.ai/api-keys", suggested: ["mistral-large-latest", "codestral-latest", "pixtral-large-latest"], caps: caps({ vision: true }) },
  { id: "openrouter", label: "OpenRouter", vendor: "OpenRouter", impl: "openai", hue: 275, baseUrl: "https://openrouter.ai/api/v1", keyHint: "sk-or-…", docs: "https://openrouter.ai/keys", suggested: ["anthropic/claude-sonnet-5-5", "openai/gpt-5", "google/gemini-2.5-pro", "deepseek/deepseek-chat"], caps: caps({ vision: true }) },
  { id: "groq", label: "Groq", vendor: "Groq", impl: "openai", hue: 20, baseUrl: "https://api.groq.com/openai/v1", keyHint: "gsk_…", docs: "https://console.groq.com/keys", suggested: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"], caps: caps() },
  { id: "together", label: "Together", vendor: "Together AI", impl: "openai", hue: 210, baseUrl: "https://api.together.xyz/v1", keyHint: "API key", docs: "https://api.together.ai/settings/api-keys", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8", "deepseek-ai/DeepSeek-V3"], imageModel: "black-forest-labs/FLUX.1-schnell", caps: caps({ images: true }) },
  { id: "fireworks", label: "Fireworks", vendor: "Fireworks AI", impl: "openai", hue: 15, baseUrl: "https://api.fireworks.ai/inference/v1", keyHint: "fw_…", docs: "https://fireworks.ai/account/api-keys", suggested: ["accounts/fireworks/models/qwen3-coder-480b-a35b-instruct"], caps: caps() },
  { id: "cerebras", label: "Cerebras", vendor: "Cerebras", impl: "openai", hue: 30, baseUrl: "https://api.cerebras.ai/v1", keyHint: "csk-…", docs: "https://cloud.cerebras.ai", suggested: ["qwen-3-coder-480b", "gpt-oss-120b"], caps: caps() },
  { id: "moonshot", label: "Kimi", vendor: "Moonshot AI", impl: "openai", hue: 200, baseUrl: "https://api.moonshot.ai/v1", keyHint: "sk-…", docs: "https://platform.moonshot.ai", suggested: ["kimi-k2-0905-preview"], caps: caps() },
  { id: "qwen", label: "Qwen", vendor: "Alibaba Cloud", impl: "openai", hue: 290, baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", keyHint: "sk-…", docs: "https://dashscope.console.aliyun.com", suggested: ["qwen3-coder-plus", "qwen-max"], caps: caps({ vision: true }) },
  { id: "zhipu", label: "GLM", vendor: "Zhipu AI", impl: "openai", hue: 245, baseUrl: "https://open.bigmodel.cn/api/paas/v4", keyHint: "API key", docs: "https://open.bigmodel.cn", suggested: ["glm-4.6"], caps: caps() },
  { id: "perplexity", label: "Perplexity", vendor: "Perplexity", impl: "openai", hue: 185, baseUrl: "https://api.perplexity.ai", keyHint: "pplx-…", docs: "https://www.perplexity.ai/settings/api", suggested: ["sonar-pro", "sonar"], caps: caps({ tools: false }) },
  { id: "custom", label: "Custom", vendor: "Any OpenAI-compatible API", impl: "openai", hue: 290, chroma: 0.04, keyHint: "API key", baseUrlRequired: true, suggested: [], caps: caps() },
];
const BY_ID = new Map(VENDORS.map((v) => [v.id, v]));
// Keys created before vendors existed.
BY_ID.set("openai_compat", BY_ID.get("custom"));

function vendorOf(id) {
  const v = BY_ID.get(id);
  if (!v) throw new Error(`Unknown provider: ${id}`);
  return { ...v, implModule: IMPLS[v.impl] };
}

/** Vendor id of a stored key row (its preset, or its legacy provider). */
const keyVendor = (row) => (row.preset && BY_ID.has(row.preset) ? row.preset : row.provider === "openai_compat" ? "custom" : row.provider);

/** Back-compat: the old providerOf() shape the runner uses. */
function providerOf(id) {
  const v = vendorOf(id);
  return { ...v, impl: v.implModule, suggested: v.suggested };
}

function catalogue() {
  return {
    providers: VENDORS.map((v) => ({
      id: v.id,
      label: v.label,
      vendor: v.vendor,
      impl: v.impl,
      hue: v.hue,
      chroma: v.chroma ?? null,
      suggested: v.suggested,
      keyHint: v.keyHint,
      docs: v.docs || null,
      baseUrl: v.baseUrl || null,
      baseUrlRequired: !!v.baseUrlRequired,
      caps: v.caps,
      imageModel: v.imageModel || null,
    })),
    prices: anthropic.PRICES,
  };
}

module.exports = { VENDORS, vendorOf, providerOf, keyVendor, catalogue };
