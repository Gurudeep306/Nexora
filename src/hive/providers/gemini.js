// Google Gemini (generateContent over SSE, function declarations). Model turns
// are replayed with their original parts so thought signatures survive.
const crypto = require("crypto");
const { ProviderError, failFromResponse, sse } = require("./common");

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const SUGGESTED = ["gemini-2.5-pro", "gemini-2.5-flash"];

// Gemini accepts an OpenAPI subset: drop keywords it rejects.
function cleanSchema(s) {
  if (Array.isArray(s)) return s.map(cleanSchema);
  if (!s || typeof s !== "object") return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "additionalProperties" || k === "$schema" || k === "default") continue;
    out[k] = cleanSchema(v);
  }
  return out;
}

function toContents(messages) {
  const contents = [];
  const push = (role, parts) => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  };
  for (const m of messages) {
    if (m.role === "user") {
      const parts = [];
      for (const a of m.attachments || []) {
        if (a.mime.startsWith("image/") || a.mime === "application/pdf") parts.push({ inlineData: { mimeType: a.mime, data: a.data } });
        else if (a.text != null) parts.push({ text: `File: ${a.name}\n\n${a.text}` });
      }
      parts.push({ text: m.text || "(see attachments)" });
      push("user", parts);
    }
    else if (m.role === "assistant") {
      if (m.raw?.provider === "gemini" && m.raw.parts?.length) push("model", m.raw.parts);
      else {
        const parts = [];
        if (m.text) parts.push({ text: m.text });
        for (const c of m.toolCalls || []) parts.push({ functionCall: { name: c.name, args: c.input || {} } });
        push("model", parts.length ? parts : [{ text: "(no output)" }]);
      }
    } else if (m.role === "tool") {
      push(
        "user",
        m.results.map((r) => ({ functionResponse: { name: r.name, response: r.isError ? { error: r.content } : { result: r.content } } })),
      );
    }
  }
  return contents;
}

async function turn({ secret, model, system, messages, tools, signal, onText, onThinking, onToolInput }) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: toContents(messages),
    generationConfig: { thinkingConfig: { includeThoughts: true } },
  };
  if (tools.length) body.tools = [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: cleanSchema(t.schema) })) }];
  let res;
  try {
    res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "x-goog-api-key": secret, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw new ProviderError("Stopped", { kind: "aborted" });
    throw new ProviderError(e.message, { kind: "network", retryable: true });
  }
  if (!res.ok) await failFromResponse(res, "Gemini");
  const parts = [];
  let text = "";
  let usage = null;
  let finish = null;
  try {
    for await (const data of sse(res.body)) {
      let j;
      try {
        j = JSON.parse(data);
      } catch {
        continue;
      }
      if (j.usageMetadata) usage = j.usageMetadata;
      const cand = j.candidates?.[0];
      if (cand?.finishReason) finish = cand.finishReason;
      for (const p of cand?.content?.parts || []) {
        if (p.thought && p.text) {
          onThinking?.(p.text);
          parts.push(p);
          continue;
        }
        if (p.text) {
          text += p.text;
          onText?.(p.text);
          // Merge streamed text into one part (keep a signature if present).
          const last = parts[parts.length - 1];
          if (last && typeof last.text === "string" && !last.thought && !last.functionCall && !p.thoughtSignature) last.text += p.text;
          else parts.push({ ...p });
        } else {
          parts.push(p);
          if (p.functionCall && onToolInput) onToolInput({ id: `g${parts.length}`, name: p.functionCall.name, json: JSON.stringify(p.functionCall.args || {}) });
        }
      }
    }
  } catch (e) {
    if (signal?.aborted) throw new ProviderError("Stopped", { kind: "aborted" });
    throw new ProviderError(e.message, { kind: "network", retryable: true });
  }
  const toolCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => ({ id: p.functionCall.id || `gem_${crypto.randomBytes(6).toString("hex")}`, name: p.functionCall.name, input: p.functionCall.args || {} }));
  return {
    text,
    toolCalls,
    raw: { provider: "gemini", parts },
    usage: { input: usage?.promptTokenCount || 0, output: (usage?.candidatesTokenCount || 0) + (usage?.thoughtsTokenCount || 0), cacheRead: usage?.cachedContentTokenCount || 0 },
    costMicros: 0,
    stop: toolCalls.length ? "tool" : finish === "SAFETY" || finish === "PROHIBITED_CONTENT" ? "refusal" : finish === "MAX_TOKENS" ? "end" : "end",
    servedModel: model,
    rateLimit: null,
  };
}

async function listModels({ secret }) {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": secret } }).catch((e) => {
    throw new ProviderError(e.message, { kind: "network" });
  });
  if (!res.ok) await failFromResponse(res, "Gemini");
  const j = await res.json();
  return (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/.test(m.name))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort();
}

/** Image generation with a Gemini image model (returns inline image parts). */
async function generateImage({ secret, model, prompt }) {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": secret, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
  }).catch((e) => {
    throw new ProviderError(e.message, { kind: "network" });
  });
  if (!res.ok) await failFromResponse(res, "Gemini");
  const j = await res.json();
  const parts = j.candidates?.[0]?.content?.parts || [];
  const images = parts.filter((p) => p.inlineData?.data).map((p) => ({ mime: p.inlineData.mimeType || "image/png", data: p.inlineData.data }));
  if (!images.length) throw new ProviderError("The model returned no image", { kind: "server" });
  return { images, text: parts.filter((p) => p.text).map((p) => p.text).join("") };
}

module.exports = { id: "gemini", turn, listModels, generateImage, SUGGESTED };
