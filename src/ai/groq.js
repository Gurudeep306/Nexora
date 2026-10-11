/* ========== Groq client (OpenAI-compatible chat completions) ==========
   The only model provider Nexora uses. Plain fetch — no SDK.

   - chat(): one-shot completion → { content, toolCalls, usage, model }
   - chatStream(): async generator over the SSE stream → events
       { type: 'delta', content } | { type: 'done', content, toolCalls, usage, model, finishReason }
   - Retries 429/5xx (up to 3) with exponential backoff + jitter, honouring
     retry-after; then tries the fallback model once.
   - A global circuit breaker fails fast for a short while after Groq keeps
     rate-limiting us, so a burst of users doesn't pile onto a 429 wall.
   The API key is never logged, echoed, or put into an error message. */

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

function models() {
  return {
    main: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    fast: process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant",
    fallback: process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile",
  };
}

/** An error that is safe to show to the user (`public`), with an HTTP status. */
class AiError extends Error {
  constructor(message, status = 502, code = "ai_error") {
    super(message);
    this.name = "AiError";
    this.status = status;
    this.code = code;
    this.public = true;
  }
}

const NOT_CONFIGURED = "AI is not configured";
const isConfigured = () => !!String(process.env.GROQ_API_KEY || "").trim();
const supportsReasoning = (model) => /gpt-oss/i.test(String(model || ""));
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function retryDelay(res, attempt, baseMs) {
  const ra = res?.headers?.get?.("retry-after");
  if (ra != null && ra !== "") {
    const secs = Number(ra);
    if (Number.isFinite(secs)) return Math.min(secs * 1000, 20000);
    const at = Date.parse(ra);
    if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), 20000);
  }
  const exp = baseMs * 2 ** attempt;
  return exp + Math.floor(Math.random() * baseMs);
}

/** Groq error text, trimmed. Groq's messages never contain the key, but cap it anyway. */
async function upstreamMessage(res) {
  try {
    const j = await res.json();
    return String(j?.error?.message || j?.error || "").slice(0, 200);
  } catch {
    return "";
  }
}

function abortError(signal) {
  const reason = signal?.reason;
  if (reason?.name === "TimeoutError") return new AiError("The AI took too long to answer — try again.", 504, "timeout");
  return new AiError("Request cancelled", 499, "aborted");
}

function createGroqClient({
  apiKey = process.env.GROQ_API_KEY,
  baseUrl = process.env.GROQ_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  maxRetries = 3,
  backoffMs = 500,
  breakerThreshold = 5,
  breakerCooldownMs = 30000,
} = {}) {
  const url = `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;
  const breaker = { strikes: 0, openUntil: 0 };

  function buildBody(opts, model, stream) {
    const body = {
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.3,
    };
    if (opts.stop) body.stop = opts.stop;
    if (opts.json) body.response_format = { type: "json_object" };
    if (opts.tools?.length) {
      body.tools = opts.tools;
      body.tool_choice = opts.toolChoice || "auto";
      body.parallel_tool_calls = true;
    }
    if (supportsReasoning(model)) body.reasoning_effort = opts.reasoningEffort || "low";
    if (stream) {
      body.stream = true;
      body.stream_options = { include_usage: true };
    }
    return body;
  }

  /** POST with retries; resolves to an ok Response or throws AiError. */
  async function post(opts, stream) {
    if (!String(apiKey || "").trim()) throw new AiError(NOT_CONFIGURED, 503, "not_configured");
    if (Date.now() < breaker.openUntil) throw new AiError("AI is busy right now — try again in a moment.", 429, "busy");

    const m = models();
    const primary = opts.model || m.main;
    const fallback = opts.fallbackModel === undefined ? m.fallback : opts.fallbackModel;
    const candidates = fallback && fallback !== primary ? [primary, fallback] : [primary];
    const timeoutMs = opts.timeoutMs ?? 60000;
    let lastStatus = 0;
    let lastMsg = "";

    for (const model of candidates) {
      const retries = model === primary ? maxRetries : 0;
      for (let attempt = 0; attempt <= retries; attempt++) {
        const signals = [AbortSignal.timeout(timeoutMs)];
        if (opts.signal) signals.push(opts.signal);
        const signal = AbortSignal.any(signals);
        let res;
        try {
          res = await fetchImpl(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(buildBody(opts, model, stream)),
            signal,
          });
        } catch (e) {
          if (signal.aborted) throw abortError(signal);
          lastStatus = 0;
          lastMsg = "could not reach the AI provider";
          if (attempt < retries) {
            await sleep(retryDelay(null, attempt, backoffMs));
            continue;
          }
          break;
        }
        if (res.ok) {
          breaker.strikes = 0;
          res._model = model;
          res._signal = signal;
          return res;
        }
        lastStatus = res.status;
        lastMsg = await upstreamMessage(res);
        if (res.status === 401 || res.status === 403) {
          throw new AiError("AI is misconfigured (the server's API key was rejected)", 503, "bad_key");
        }
        if (!RETRYABLE.has(res.status)) {
          throw new AiError(`AI request failed${lastMsg ? `: ${lastMsg}` : ""}`, res.status === 400 ? 400 : 502);
        }
        if (attempt < retries) {
          if (opts.signal?.aborted) throw abortError(opts.signal);
          await sleep(retryDelay(res, attempt, backoffMs));
        }
      }
    }

    if (lastStatus === 429) {
      breaker.strikes += 1;
      if (breaker.strikes >= breakerThreshold) {
        breaker.openUntil = Date.now() + breakerCooldownMs;
        breaker.strikes = 0;
      }
      throw new AiError("AI is busy right now — try again in a moment.", 429, "rate_limited");
    }
    throw new AiError("AI is unavailable right now — try again shortly.", 503, "unavailable");
  }

  async function chat(opts) {
    const res = await post(opts, false);
    let data;
    try {
      data = await res.json();
    } catch {
      if (res._signal?.aborted) throw abortError(res._signal);
      throw new AiError("AI returned an unreadable response", 502);
    }
    const msg = data?.choices?.[0]?.message || {};
    return {
      content: msg.content || "",
      toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls : [],
      usage: data?.usage || data?.x_groq?.usage || null,
      model: res._model,
      finishReason: data?.choices?.[0]?.finish_reason || null,
    };
  }

  /** Streams deltas; the final `done` event carries the full text and tool calls. */
  async function* chatStream(opts) {
    const res = await post(opts, true);
    const decoder = new TextDecoder();
    let buf = "";
    let content = "";
    let usage = null;
    let finishReason = null;
    const calls = []; // index → { id, type, function: { name, arguments } }
    let finished = false;

    const handle = (payload) => {
      let j;
      try {
        j = JSON.parse(payload);
      } catch {
        return null;
      }
      if (j.usage) usage = j.usage;
      if (j.x_groq?.usage) usage = j.x_groq.usage;
      const choice = j.choices?.[0];
      if (!choice) return null;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      const d = choice.delta || {};
      for (const tc of d.tool_calls || []) {
        const i = tc.index ?? calls.length;
        const slot = (calls[i] ||= { id: "", type: "function", function: { name: "", arguments: "" } });
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.function.name += tc.function.name;
        if (tc.function?.arguments) slot.function.arguments += tc.function.arguments;
      }
      if (d.content) {
        content += d.content;
        return d.content;
      }
      return null;
    };

    try {
      for await (const chunk of res.body) {
        buf += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, "");
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            finished = true;
            break;
          }
          const piece = handle(payload);
          if (piece) yield { type: "delta", content: piece };
        }
        if (finished) break;
      }
      if (!finished && buf.startsWith("data:")) {
        const payload = buf.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          const piece = handle(payload);
          if (piece) yield { type: "delta", content: piece };
        }
      }
    } catch (e) {
      if (res._signal?.aborted) throw abortError(res._signal);
      throw e instanceof AiError ? e : new AiError("The AI stream was interrupted", 502);
    }

    yield {
      type: "done",
      content,
      toolCalls: calls.filter(Boolean),
      usage,
      model: res._model,
      finishReason,
    };
  }

  return { chat, chatStream, _breaker: breaker };
}

let shared = null;
/** Process-wide client built from the environment (rebuilt if the env changes, e.g. in tests). */
function groq() {
  const key = `${process.env.GROQ_API_KEY || ""}|${process.env.GROQ_BASE_URL || ""}`;
  if (!shared || shared.key !== key) shared = { key, client: createGroqClient() };
  return shared.client;
}

module.exports = { createGroqClient, groq, models, AiError, isConfigured, supportsReasoning, NOT_CONFIGURED, DEFAULT_BASE_URL };
