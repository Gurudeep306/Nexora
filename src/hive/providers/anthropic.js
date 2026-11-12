// Claude through the official Anthropic SDK: streaming manual tool loop turn,
// adaptive thinking + effort on current models, server-side refusal fallbacks
// where the model supports them, automatic prompt caching.
const Anthropic = require("@anthropic-ai/sdk").default;
const { ProviderError, classify, rateLimitFrom } = require("./common");

// Models that take adaptive thinking and output_config.effort.
const ADAPTIVE = /^claude-(opus-(5|4-[6-9])|sonnet-(5|4-6)|haiku-5|fable|mythos)/;
// Models that accept the server-side `fallbacks` parameter.
const FALLBACKS = /^claude-(fable-5-[12]|mythos-5-[12]|opus-5(-5)?$|sonnet-5-5)/;
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

// $ per million tokens (input, output) — first-party list prices, for estimates.
const PRICES = {
  "claude-fable-5-2": [8, 40],
  "claude-fable-5-1": [10, 50],
  "claude-fable-5": [10, 50],
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-opus-4-7": [5, 25],
  "claude-opus-4-6": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-haiku-4-5": [1, 5],
};

const SUGGESTED = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"];

function client(secret, baseUrl) {
  return new Anthropic({ apiKey: secret, baseURL: baseUrl || undefined, maxRetries: 2, timeout: 10 * 60 * 1000 });
}

function toAnthropicMessages(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.text });
    else if (m.role === "assistant") {
      // Replay the exact content blocks (thinking/fallback blocks included).
      if (m.raw?.provider === "anthropic" && Array.isArray(m.raw.content)) out.push({ role: "assistant", content: m.raw.content });
      else {
        const content = [];
        if (m.text) content.push({ type: "text", text: m.text });
        for (const c of m.toolCalls || []) content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input || {} });
        out.push({ role: "assistant", content: content.length ? content : [{ type: "text", text: "(no output)" }] });
      }
    } else if (m.role === "tool") {
      out.push({
        role: "user",
        content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.content, ...(r.isError ? { is_error: true } : {}) })),
      });
    }
  }
  return out;
}

async function turn({ secret, baseUrl, model, system, messages, tools, effort, signal, onText, onThinking }) {
  const c = client(secret, baseUrl);
  const params = {
    model,
    max_tokens: 64000,
    system,
    messages: toAnthropicMessages(messages),
    tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema, eager_input_streaming: true })),
    cache_control: { type: "ephemeral" },
  };
  if (ADAPTIVE.test(model)) {
    params.thinking = { type: "adaptive", display: "summarized" };
    params.output_config = { effort: EFFORTS.has(effort) ? effort : "high" };
  }
  const betas = [];
  if (FALLBACKS.test(model)) {
    betas.push("server-side-fallback-2026-07-01");
    params.fallbacks = "default";
  }
  if (betas.length) params.betas = betas;

  let stream;
  let message;
  try {
    stream = c.beta.messages.stream(params, { signal });
    stream.on("text", (d) => onText?.(d));
    stream.on("thinking", (d) => onThinking?.(d));
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError || signal?.aborted) throw new ProviderError("Stopped", { kind: "aborted" });
    if (err instanceof Anthropic.APIError && err.status) {
      throw new ProviderError(err.message, { status: err.status, ...classify(err.status, err.message) });
    }
    if (err instanceof Anthropic.APIConnectionError) throw new ProviderError(err.message, { kind: "network", retryable: true });
    // Eager input streaming: a tool input that could not be parsed at all.
    throw new ProviderError(`Could not read the model's response: ${err.message}`, { kind: "server", retryable: true });
  }

  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const toolCalls = message.content.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, name: b.name, input: b.input }));
  const u = message.usage || {};
  const input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  let stop = "end";
  if (message.stop_reason === "tool_use" && toolCalls.length) stop = "tool";
  else if (message.stop_reason === "max_tokens") stop = toolCalls.length ? "max_tokens" : "end";
  else if (message.stop_reason === "refusal") stop = "refusal";
  else if (message.stop_reason === "pause_turn") stop = "pause";
  const servedModel = message.model || model;
  const price = PRICES[servedModel] || PRICES[model];
  const costMicros = price
    ? Math.round(
        ((u.input_tokens || 0) * price[0] +
          (u.cache_creation_input_tokens || 0) * price[0] * 1.25 +
          (u.cache_read_input_tokens || 0) * price[0] * 0.1 +
          (u.output_tokens || 0) * price[1]),
      )
    : 0;
  return {
    text,
    toolCalls,
    raw: { provider: "anthropic", content: message.content },
    usage: { input, output: u.output_tokens || 0, cacheRead: u.cache_read_input_tokens || 0 },
    costMicros, // $ * 1e6 / 1e6 tokens → micros of a dollar
    stop,
    refusal: message.stop_reason === "refusal" ? message.stop_details || null : null,
    servedModel,
    rateLimit: rateLimitFrom(stream.response?.headers, "anthropic"),
  };
}

async function listModels({ secret, baseUrl }) {
  const c = client(secret, baseUrl);
  const ids = [];
  try {
    for await (const m of c.models.list({ limit: 100 })) ids.push(m.id);
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status) throw new ProviderError(err.message, { status: err.status, ...classify(err.status, err.message) });
    throw new ProviderError(err.message, { kind: "network" });
  }
  return ids;
}

module.exports = { id: "anthropic", turn, listModels, SUGGESTED, PRICES };
