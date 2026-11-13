// Provider catalogue for Hive.
//
// A "vendor" (Claude, OpenAI, DeepSeek, Grok, …) is what staff pick and what
// keys belong to. Each vendor speaks one of three wire protocols ("impl"):
// the Anthropic SDK, OpenAI-style chat completions, or Gemini. Capabilities
// drive what the UI offers (images in, PDFs in, image generation, tool use).
const anthropic = require("./anthropic");
const openai = require("./openai");
const gemini = require("./gemini");
const cli = require("./cli");

const IMPLS = { anthropic, openai, gemini, cli };

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
  { id: "groq", label: "Groq", vendor: "Groq", impl: "openai", hue: 20, baseUrl: "https://api.groq.com/openai/v1", keyHint: "gsk_…", docs: "https://console.groq.com/keys", suggested: ["moonshotai/kimi-k2-instruct-0905", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"], caps: caps() },
  { id: "together", label: "Together", vendor: "Together AI", impl: "openai", hue: 210, baseUrl: "https://api.together.xyz/v1", keyHint: "API key", docs: "https://api.together.ai/settings/api-keys", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8", "deepseek-ai/DeepSeek-V3"], imageModel: "black-forest-labs/FLUX.1-schnell", caps: caps({ images: true }) },
  { id: "fireworks", label: "Fireworks", vendor: "Fireworks AI", impl: "openai", hue: 15, baseUrl: "https://api.fireworks.ai/inference/v1", keyHint: "fw_…", docs: "https://fireworks.ai/account/api-keys", suggested: ["accounts/fireworks/models/qwen3-coder-480b-a35b-instruct"], caps: caps() },
  { id: "cerebras", label: "Cerebras", vendor: "Cerebras", impl: "openai", hue: 30, baseUrl: "https://api.cerebras.ai/v1", keyHint: "csk-…", docs: "https://cloud.cerebras.ai", suggested: ["zai-glm-4.7", "gpt-oss-120b", "qwen-3-coder-480b"], caps: caps() },
  { id: "moonshot", label: "Kimi", vendor: "Moonshot AI", impl: "openai", hue: 200, baseUrl: "https://api.moonshot.ai/v1", keyHint: "sk-…", docs: "https://platform.moonshot.ai", suggested: ["kimi-k2-0905-preview"], caps: caps() },
  { id: "qwen", label: "Qwen", vendor: "Alibaba Cloud", impl: "openai", hue: 290, baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", keyHint: "sk-…", docs: "https://dashscope.console.aliyun.com", suggested: ["qwen3-coder-plus", "qwen-max"], caps: caps({ vision: true }) },
  { id: "zhipu", label: "GLM", vendor: "Zhipu AI", impl: "openai", hue: 245, baseUrl: "https://open.bigmodel.cn/api/paas/v4", keyHint: "API key", docs: "https://open.bigmodel.cn", suggested: ["glm-4.7-flash", "glm-4.6"], caps: caps() },
  { id: "perplexity", label: "Perplexity", vendor: "Perplexity", impl: "openai", hue: 185, baseUrl: "https://api.perplexity.ai", keyHint: "pplx-…", docs: "https://www.perplexity.ai/settings/api", suggested: ["sonar-pro", "sonar"], caps: caps({ tools: false }) },
  // Free and open-model hosts (see catalog.FREE_SOURCES for limits and sign-up).
  { id: "github", label: "GitHub Models", vendor: "GitHub", impl: "openai", hue: 220, chroma: 0.03, baseUrl: "https://models.github.ai/inference", modelsUrl: "https://models.github.ai/catalog/models", keyHint: "github_pat_… (Models: read)", docs: "https://github.com/settings/personal-access-tokens/new", suggested: ["openai/gpt-4.1", "deepseek/deepseek-v3-0324", "meta/llama-4-maverick-17b-128e-instruct-fp8"], freeTier: true, caps: caps({ vision: true }) },
  { id: "nvidia", label: "NVIDIA NIM", vendor: "NVIDIA", impl: "openai", hue: 135, baseUrl: "https://integrate.api.nvidia.com/v1", keyHint: "nvapi-…", docs: "https://build.nvidia.com", suggested: ["z-ai/glm-5.2", "deepseek-ai/deepseek-v4-pro", "moonshotai/kimi-k2-instruct", "qwen/qwen3-coder-480b-a35b-instruct"], freeTier: true, caps: caps() },
  { id: "sambanova", label: "SambaNova", vendor: "SambaNova", impl: "openai", hue: 25, baseUrl: "https://api.sambanova.ai/v1", keyHint: "API key", docs: "https://cloud.sambanova.ai/apis", suggested: ["DeepSeek-V3.2", "MiniMax-M2.7", "DeepSeek-V3.1"], freeTier: true, caps: caps() },
  { id: "huggingface", label: "Hugging Face", vendor: "Hugging Face", impl: "openai", hue: 55, baseUrl: "https://router.huggingface.co/v1", keyHint: "hf_…", docs: "https://huggingface.co/settings/tokens", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "deepseek-ai/DeepSeek-V3-0324"], freeTier: true, caps: caps() },
  { id: "cloudflare", label: "Workers AI", vendor: "Cloudflare", impl: "openai", hue: 35, keyHint: "API token", baseUrlRequired: true, baseUrlHint: "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1", docs: "https://dash.cloudflare.com/profile/api-tokens", suggested: ["@cf/openai/gpt-oss-120b", "@cf/meta/llama-4-scout-17b-16e-instruct"], freeTier: true, caps: caps() },
  { id: "ollama", label: "Ollama", vendor: "Your own GPU", impl: "openai", hue: 0, chroma: 0, keyHint: "any text (Ollama ignores it)", baseUrlRequired: true, baseUrlHint: "http://YOUR-GPU-HOST:11434/v1", docs: "https://ollama.com/download", suggested: ["qwen3-coder", "gpt-oss:20b"], freeTier: true, caps: caps() },
  // Subscription agents: Claude Code and Codex running on a connected machine
  // under your own Claude / ChatGPT plan. The "key" is a connection to a machine.
  { id: "claude_code", label: "Claude Code", vendor: "Anthropic · your Claude plan", impl: "cli", cli: "claude", hue: 30, keyHint: "Optional: token from `claude setup-token`", docs: "https://docs.claude.com/en/docs/claude-code", suggested: ["default", "opus", "sonnet", "haiku"], subscription: true, needsMachine: true, caps: caps({ vision: true, agentOnly: false }) },
  { id: "codex", label: "Codex", vendor: "OpenAI · your ChatGPT plan", impl: "cli", cli: "codex", hue: 160, keyHint: "Not needed — sign in on the machine", docs: "https://developers.openai.com/codex", suggested: ["default"], subscription: true, needsMachine: true, caps: caps({ vision: false }) },
  // ── More hosts of open and frontier models (all OpenAI-compatible) ──
  { id: "siliconflow", label: "SiliconFlow", vendor: "SiliconFlow", impl: "openai", hue: 265, baseUrl: "https://api.siliconflow.com/v1", keyHint: "sk-…", docs: "https://cloud.siliconflow.com/account/ak", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "deepseek-ai/DeepSeek-V3", "Qwen/Qwen3-8B"], freeTier: true, caps: caps({ vision: true }) },
  { id: "chutes", label: "Chutes", vendor: "Chutes (decentralised)", impl: "openai", hue: 140, baseUrl: "https://llm.chutes.ai/v1", keyHint: "cpk_…", docs: "https://chutes.ai/app/api", suggested: ["deepseek-ai/DeepSeek-V3-0324", "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8", "zai-org/GLM-4.5-Air"], freeTier: true, caps: caps() },
  { id: "zai", label: "Z.ai (GLM)", vendor: "Zhipu · international", impl: "openai", hue: 245, baseUrl: "https://api.z.ai/api/paas/v4", keyHint: "API key", docs: "https://z.ai/manage-apikey/apikey-list", suggested: ["glm-4.6", "glm-4.5-flash"], freeTier: true, caps: caps() },
  { id: "codestral", label: "Codestral", vendor: "Mistral · free code endpoint", impl: "openai", hue: 40, baseUrl: "https://codestral.mistral.ai/v1", keyHint: "Codestral key (separate from the Mistral key)", docs: "https://console.mistral.ai/codestral", suggested: ["codestral-latest"], freeTier: true, caps: caps() },
  { id: "modelscope", label: "ModelScope", vendor: "Alibaba ModelScope", impl: "openai", hue: 290, baseUrl: "https://api-inference.modelscope.cn/v1", keyHint: "ms-…", docs: "https://modelscope.cn/my/myaccesstoken", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "deepseek-ai/DeepSeek-V3.1", "Qwen/Qwen3-235B-A22B"], freeTier: true, caps: caps() },
  { id: "ovh", label: "OVHcloud AI", vendor: "OVHcloud AI Endpoints", impl: "openai", hue: 225, baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", keyHint: "token (or any text for the anonymous free tier)", docs: "https://endpoints.ai.cloud.ovh.net", suggested: ["Qwen3-32B", "Meta-Llama-3_3-70B-Instruct", "Mistral-Small-3.2-24B-Instruct-2506"], freeTier: true, caps: caps() },
  { id: "cohere", label: "Cohere", vendor: "Cohere", impl: "openai", hue: 320, baseUrl: "https://api.cohere.ai/compatibility/v1", keyHint: "trial key", docs: "https://dashboard.cohere.com/api-keys", suggested: ["command-a-03-2025"], freeTier: true, caps: caps() },
  { id: "pollinations", label: "Pollinations", vendor: "Pollinations · free, no sign-up", impl: "openai", hue: 100, baseUrl: "https://text.pollinations.ai/openai", keyHint: "any text — no key needed", docs: "https://pollinations.ai", suggested: ["openai", "mistral", "qwen-coder"], freeTier: true, caps: caps({ tools: false }) },
  { id: "llm7", label: "LLM7", vendor: "LLM7 · free, no sign-up", impl: "openai", hue: 180, baseUrl: "https://api.llm7.io/v1", keyHint: "any text — no key needed", docs: "https://llm7.io", suggested: [], freeTier: true, caps: caps({ tools: false }) },
  { id: "vercel", label: "Vercel AI Gateway", vendor: "Vercel · monthly free credit", impl: "openai", hue: 0, chroma: 0.01, baseUrl: "https://ai-gateway.vercel.sh/v1", keyHint: "AI Gateway API key", docs: "https://vercel.com/docs/ai-gateway", suggested: ["openai/gpt-5", "google/gemini-2.5-flash", "xai/grok-4", "moonshotai/kimi-k2"], freeTier: true, caps: caps({ vision: true }) },
  { id: "deepinfra", label: "DeepInfra", vendor: "DeepInfra", impl: "openai", hue: 215, baseUrl: "https://api.deepinfra.com/v1/openai", keyHint: "API key", docs: "https://deepinfra.com/dash/api_keys", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "deepseek-ai/DeepSeek-V3.1", "moonshotai/Kimi-K2-Instruct"], caps: caps() },
  { id: "hyperbolic", label: "Hyperbolic", vendor: "Hyperbolic", impl: "openai", hue: 200, baseUrl: "https://api.hyperbolic.xyz/v1", keyHint: "API key", docs: "https://app.hyperbolic.xyz/settings", suggested: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen3-Coder-480B-A35B-Instruct"], caps: caps() },
  { id: "nebius", label: "Nebius AI Studio", vendor: "Nebius", impl: "openai", hue: 160, baseUrl: "https://api.studio.nebius.com/v1", keyHint: "API key", docs: "https://studio.nebius.com/settings/api-keys", suggested: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "deepseek-ai/DeepSeek-V3-0324", "moonshotai/Kimi-K2-Instruct"], caps: caps() },
  { id: "novita", label: "Novita", vendor: "Novita AI", impl: "openai", hue: 150, baseUrl: "https://api.novita.ai/v3/openai", keyHint: "sk_…", docs: "https://novita.ai/settings/key-management", suggested: ["deepseek/deepseek-v3-0324", "qwen/qwen3-coder-480b-a35b-instruct"], caps: caps() },
  { id: "scaleway", label: "Scaleway", vendor: "Scaleway (EU)", impl: "openai", hue: 270, baseUrl: "https://api.scaleway.ai/v1", keyHint: "secret key", docs: "https://console.scaleway.com/iam/api-keys", suggested: ["qwen3-coder-30b-a3b-instruct", "llama-3.3-70b-instruct", "mistral-small-3.2-24b-instruct-2506"], caps: caps() },
  { id: "featherless", label: "Featherless", vendor: "Featherless (open models)", impl: "openai", hue: 30, baseUrl: "https://api.featherless.ai/v1", keyHint: "API key", docs: "https://featherless.ai/account/api-keys", suggested: ["Qwen/Qwen3-32B"], caps: caps() },
  { id: "minimax", label: "MiniMax", vendor: "MiniMax", impl: "openai", hue: 350, baseUrl: "https://api.minimax.io/v1", keyHint: "API key", docs: "https://www.minimax.io/platform", suggested: ["MiniMax-M2"], caps: caps() },
  { id: "upstage", label: "Upstage Solar", vendor: "Upstage", impl: "openai", hue: 60, baseUrl: "https://api.upstage.ai/v1", keyHint: "up_…", docs: "https://console.upstage.ai/api-keys", suggested: ["solar-pro2"], caps: caps() },
  // ── Free gateways found in Nov 2026 research ──
  { id: "ollama_cloud", label: "Ollama Cloud", vendor: "Ollama · free tier", impl: "openai", hue: 0, chroma: 0.01, baseUrl: "https://ollama.com/v1", keyHint: "API key from ollama.com/settings/keys", docs: "https://ollama.com/settings/keys", suggested: ["gpt-oss:120b", "deepseek-v4-pro", "kimi-k2", "qwen3-coder:480b"], freeTier: true, caps: caps() },
  { id: "opencode_zen", label: "OpenCode Zen", vendor: "OpenCode · free models", impl: "openai", hue: 210, baseUrl: "https://opencode.ai/zen/v1", keyHint: "OpenCode API key", docs: "https://opencode.ai/auth", suggested: ["deepseek-v4-flash-free", "qwen3.6-plus-free", "mimo-v2.5-free"], freeTier: true, caps: caps() },
  { id: "kilo", label: "Kilo Gateway", vendor: "Kilo Code · free models", impl: "openai", hue: 120, baseUrl: "https://api.kilo.ai/api/gateway", keyHint: "Kilo API key", docs: "https://app.kilo.ai/profile", suggested: ["nvidia/nemotron-3-ultra-550b-a55b:free"], freeTier: true, caps: caps() },
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
  // Adapters learn which vendor they talk to (quirks differ per API).
  // Every call reports to the health board, so failing models are routed around.
  const impl = { ...v.implModule, turn: require("../health").wrapTurn(v.id, (args) => v.implModule.turn({ vendor: v.id, ...args })) };
  return { ...v, impl, suggested: v.suggested };
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
      freeTier: !!v.freeTier,
      subscription: !!v.subscription,
      needsMachine: !!v.needsMachine,
      baseUrlHint: v.baseUrlHint || null,
    })),
    prices: anthropic.PRICES,
  };
}

module.exports = { VENDORS, vendorOf, providerOf, keyVendor, catalogue };
