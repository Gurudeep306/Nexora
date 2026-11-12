// Shared provider plumbing: error type, SSE reader, rate-limit header parsing.
class ProviderError extends Error {
  constructor(message, { status = 0, kind = "server", retryable = false } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // auth | rate | quota | bad_request | server | network | aborted
    this.retryable = retryable;
  }
}

function classify(status, message = "") {
  if (status === 401 || status === 403) return { kind: "auth", retryable: false };
  if (status === 429) {
    const quota = /quota|billing|credit|insufficient/i.test(message);
    return { kind: quota ? "quota" : "rate", retryable: !quota };
  }
  if (status === 402) return { kind: "quota", retryable: false };
  if (status >= 500 || status === 408 || status === 409) return { kind: "server", retryable: true };
  return { kind: "bad_request", retryable: false };
}

async function failFromResponse(res, label) {
  let msg = `${label} ${res.status}`;
  try {
    const body = await res.text();
    const j = JSON.parse(body);
    msg = j?.error?.message || j?.message || j?.[0]?.error?.message || msg;
  } catch {}
  throw new ProviderError(msg, { status: res.status, ...classify(res.status, msg) });
}

/** Yield `data:` payloads of an SSE response body. */
async function* sse(body) {
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i).replace(/^\r?\n\r?\n/, "");
      const data = block
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data) yield data;
    }
  }
  if (buf.trim().startsWith("data:")) yield buf.trim().slice(5).trim();
}

/** Provider rate-limit headers → { tokensRemaining, tokensLimit, requestsRemaining, requestsLimit, resetAt }. */
function rateLimitFrom(headers, provider) {
  if (!headers?.get) return null;
  const n = (h) => {
    const v = headers.get(h);
    return v == null || v === "" ? null : Number(v);
  };
  let out;
  if (provider === "anthropic") {
    out = {
      tokensRemaining: n("anthropic-ratelimit-tokens-remaining") ?? n("anthropic-ratelimit-input-tokens-remaining"),
      tokensLimit: n("anthropic-ratelimit-tokens-limit") ?? n("anthropic-ratelimit-input-tokens-limit"),
      requestsRemaining: n("anthropic-ratelimit-requests-remaining"),
      requestsLimit: n("anthropic-ratelimit-requests-limit"),
      resetAt: headers.get("anthropic-ratelimit-tokens-reset") || headers.get("anthropic-ratelimit-input-tokens-reset") || null,
    };
  } else {
    const reset = headers.get("x-ratelimit-reset-tokens");
    out = {
      tokensRemaining: n("x-ratelimit-remaining-tokens"),
      tokensLimit: n("x-ratelimit-limit-tokens"),
      requestsRemaining: n("x-ratelimit-remaining-requests"),
      requestsLimit: n("x-ratelimit-limit-requests"),
      resetAt: reset ? new Date(Date.now() + parseDuration(reset)).toISOString() : null,
    };
  }
  return Object.values(out).some((v) => v != null) ? out : null;
}

function parseDuration(s) {
  // "6m0s", "1.2s", "350ms"
  let ms = 0;
  for (const [, v, u] of String(s).matchAll(/([\d.]+)(ms|h|m|s)/g)) {
    ms += Number(v) * (u === "h" ? 3600e3 : u === "m" ? 60e3 : u === "s" ? 1e3 : 1);
  }
  return ms;
}

module.exports = { ProviderError, classify, failFromResponse, sse, rateLimitFrom };
