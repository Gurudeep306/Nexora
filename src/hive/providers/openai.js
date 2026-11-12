// OpenAI Chat Completions (streaming, function tools). Also serves every
// OpenAI-compatible API (OpenRouter, Groq, DeepSeek, xAI, Mistral, Together…)
// through `baseUrl`.
const { ProviderError, failFromResponse, sse, rateLimitFrom } = require("./common");

const DEFAULT_BASE = "https://api.openai.com/v1";
const SUGGESTED = ["gpt-5", "gpt-5-mini", "o4-mini", "gpt-4.1"];
const REASONING = /^(o\d|gpt-5)/;

function toOpenAiMessages(system, messages) {
  const out = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.text });
    else if (m.role === "assistant") {
      const msg = { role: "assistant", content: m.text || null };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input || {}) } }));
      }
      if (m.raw?.provider === "openai" && m.raw.reasoning_content) msg.reasoning_content = m.raw.reasoning_content;
      out.push(msg);
    } else if (m.role === "tool") {
      for (const r of m.results) out.push({ role: "tool", tool_call_id: r.id, content: r.content });
    }
  }
  return out;
}

async function turn({ secret, baseUrl, model, system, messages, tools, effort, signal, onText, onThinking, official }) {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const body = {
    model,
    messages: toOpenAiMessages(system, messages),
    tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.schema } })),
    stream: true,
    stream_options: { include_usage: true },
  };
  if (official && REASONING.test(model) && effort) {
    body.reasoning_effort = { low: "low", medium: "medium", high: "high", xhigh: "high", max: "high" }[effort] || "medium";
  }
  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw new ProviderError("Stopped", { kind: "aborted" });
    throw new ProviderError(e.message, { kind: "network", retryable: true });
  }
  if (!res.ok) await failFromResponse(res, "OpenAI");

  let text = "";
  let reasoning = "";
  const calls = new Map(); // index -> { id, name, args }
  let usage = null;
  let finish = null;
  try {
    for await (const data of sse(res.body)) {
      if (data === "[DONE]") break;
      let j;
      try {
        j = JSON.parse(data);
      } catch {
        continue;
      }
      if (j.error) throw new ProviderError(j.error.message || "Stream error", { kind: "server", retryable: true });
      if (j.usage) usage = j.usage;
      const ch = j.choices?.[0];
      if (!ch) continue;
      const d = ch.delta || {};
      if (d.content) {
        text += d.content;
        onText?.(d.content);
      }
      const r = d.reasoning_content || d.reasoning;
      if (typeof r === "string" && r) {
        reasoning += r;
        onThinking?.(r);
      }
      for (const tc of d.tool_calls || []) {
        const idx = tc.index ?? 0;
        const cur = calls.get(idx) || { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name += tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        calls.set(idx, cur);
      }
      if (ch.finish_reason) finish = ch.finish_reason;
    }
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (signal?.aborted) throw new ProviderError("Stopped", { kind: "aborted" });
    throw new ProviderError(e.message, { kind: "network", retryable: true });
  }

  const toolCalls = [...calls.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, c]) => {
      let input = {};
      let invalid = false;
      try {
        input = c.args ? JSON.parse(c.args) : {};
      } catch {
        invalid = true;
      }
      return { id: c.id || `call_${i}_${Date.now()}`, name: c.name, input, invalid, rawArgs: invalid ? c.args.slice(0, 2000) : undefined };
    });
  return {
    text,
    toolCalls,
    raw: { provider: "openai", reasoning_content: reasoning || undefined },
    usage: { input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0, cacheRead: usage?.prompt_tokens_details?.cached_tokens || 0 },
    costMicros: 0,
    stop: toolCalls.length ? (finish === "length" ? "max_tokens" : "tool") : finish === "content_filter" ? "refusal" : "end",
    servedModel: model,
    rateLimit: rateLimitFrom(res.headers, "openai"),
  };
}

async function listModels({ secret, baseUrl, official }) {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${secret}` } }).catch((e) => {
    throw new ProviderError(e.message, { kind: "network" });
  });
  if (!res.ok) await failFromResponse(res, "Models");
  const j = await res.json();
  let ids = (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean);
  if (official) ids = ids.filter((id) => /^(gpt|o\d|chatgpt|codex)/.test(id) && !/(audio|realtime|tts|transcribe|image|embedding|search|moderation|instruct|dall)/.test(id));
  return ids.sort();
}

module.exports = { id: "openai", turn, listModels, SUGGESTED, DEFAULT_BASE };
