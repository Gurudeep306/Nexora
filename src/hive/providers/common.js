// Shared provider plumbing: error type, SSE reader, rate-limit header parsing.
class ProviderError extends Error {
  constructor(message, { status = 0, kind = "server", retryable = false, retryAt = null } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // auth | rate | quota | bad_request | server | network | aborted
    this.retryable = retryable;
    this.retryAt = retryAt; // ms epoch when the provider says it can be used again (or null)
  }
}

// Providers that answer a bad key with 400 (Gemini) or a 404 for an unknown model.
const BAD_KEY = /api key not valid|invalid api key|incorrect api key|invalid x-api-key|api_key_invalid|unauthorized|invalid authentication|authentication failed/i;
const NO_MODEL = /model.{0,60}(not found|does not exist|not supported|unknown|is not available|(is )?no longer (available|supported)|not available to new users|decommissioned|deprecated|retired|has been (removed|shut down))|no such model|invalid model|model_not_found/i;

// A 403 about one model (gated, not on this tier, no access) is that model's problem, not the key's.
const MODEL_ACCESS = /(model|deployment).{0,80}(access|permission|allowed|tier|plan|gated|not enabled|unavailable|restricted|subscribe|upgrade)|(access|permission|allowed|tier|plan|gated).{0,80}model|not available (on|for|in) (your|the free|this)|requires? (a )?(paid|pro|higher)/i;

function classify(status, message = "") {
  if ((status === 403 || status === 401) && !BAD_KEY.test(message) && MODEL_ACCESS.test(message)) return { kind: "model", retryable: false };
  // A 404 is "model not found" only when it says so; otherwise it's usually a wrong base URL.
  if (status === 404) return NO_MODEL.test(message) || /model/i.test(message) ? { kind: "model", retryable: false } : { kind: "bad_request", retryable: false };
  if (status === 401 || status === 403 || (status === 400 && BAD_KEY.test(message))) return { kind: "auth", retryable: false };
  if ((status === 404 || status === 400) && NO_MODEL.test(message)) return { kind: "model", retryable: false };
  if (status === 429) {
    // Daily / monthly caps on free tiers are limits until the reset, not short rate limits.
    const quota = /quota|billing|credit|insufficient/i.test(message) || PER_DAY.test(message);
    return { kind: quota ? "quota" : "rate", retryable: !quota };
  }
  if (status === 402) return { kind: "quota", retryable: false };
  if (status >= 500 || status === 408 || status === 409) return { kind: "server", retryable: true };
  return { kind: "bad_request", retryable: false };
}

const PER_DAY = /per[ -]?day|per[ -]?month|daily|monthly|\bRPD\b|\bTPD\b|free-models-per-day|day limit|for today/i;

/** When the provider says the key can be used again: Retry-After, or its reset headers. */
function retryAtFrom(headers, kind, now = Date.now()) {
  const h = (n) => headers?.get?.(n);
  const ra = h("retry-after");
  if (ra) {
    const s = Number(ra);
    if (Number.isFinite(s)) return now + s * 1000;
    const d = Date.parse(ra);
    if (Number.isFinite(d)) return d;
  }
  for (const n of ["x-ratelimit-reset-requests", "x-ratelimit-reset-tokens", "x-ratelimit-reset", "ratelimit-reset", "anthropic-ratelimit-requests-reset", "anthropic-ratelimit-tokens-reset"]) {
    const v = h(n);
    if (!v) continue;
    const num = Number(v);
    if (Number.isFinite(num)) return num > 1e12 ? num : num > 1e9 ? num * 1000 : now + num * 1000; // epoch ms, epoch s, or seconds
    const d = Date.parse(v);
    if (Number.isFinite(d)) return d;
    const m = String(v).match(/^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?(?:(\d+)ms)?$/); // "1m30s", "6ms"
    if (m && m[0]) return now + ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000 + (+m[4] || 0);
  }
  // A daily cap with no header: assume it resets at midnight UTC.
  if (kind === "quota") {
    const d = new Date(now);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  }
  return null;
}

async function failFromResponse(res, label) {
  let msg = `${label} ${res.status}`;
  try {
    const body = await res.text();
    const j = JSON.parse(body);
    const e = j?.error ?? j?.[0]?.error;
    // Messages can be nested objects (Mistral: {"object":"error","message":{"detail":[{"msg":…}]}}).
    const str = (v) => (typeof v === "string" ? v : v == null ? "" : Array.isArray(v?.detail) ? v.detail.map((d) => d?.msg || JSON.stringify(d)).join("; ") : typeof v?.message !== "undefined" ? str(v.message) : typeof v?.detail === "string" ? v.detail : JSON.stringify(v).slice(0, 300));
    msg = str(e) || str(j?.message) || j?.detail?.[0]?.msg || (typeof j?.detail === "string" ? j.detail : null) || msg;
    if (msg === `${label} ${res.status}` && body) msg = `${label} ${res.status}: ${body.slice(0, 300)}`;
  } catch {}
  const c = classify(res.status, msg);
  throw new ProviderError(msg, { status: res.status, ...c, retryAt: c.kind === "rate" || c.kind === "quota" ? retryAtFrom(res.headers, c.kind) : null });
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

/**
 * Timeouts for one model call, on top of the caller's own stop signal:
 * nothing back in 60s, 90s of silence mid-stream, or 10 minutes in all.
 * Free endpoints often accept the connection and then stall; without these
 * an agent, the Judge or the planner would wait forever.
 * Use: const tm = callTimeouts(signal); fetch(..., { signal: tm.signal });
 *      tm.kick() on every chunk; tm.done() at the end; tm.check() in catch.
 */
function callTimeouts(outer, { firstByteMs = 60_000, idleMs = 90_000, totalMs = 600_000 } = {}) {
  const ctl = new AbortController();
  let fired = null;
  let idle = null;
  const fire = (why) => {
    if (fired || ctl.signal.aborted) return;
    fired = why;
    ctl.abort();
  };
  const onOuter = () => ctl.abort();
  if (outer) {
    if (outer.aborted) ctl.abort();
    else outer.addEventListener("abort", onOuter, { once: true });
  }
  idle = setTimeout(() => fire(`No reply within ${Math.round(firstByteMs / 1000)}s`), firstByteMs);
  const total = setTimeout(() => fire(`The call took longer than ${Math.round(totalMs / 60000)} minutes`), totalMs);
  return {
    signal: ctl.signal,
    kick() {
      clearTimeout(idle);
      idle = setTimeout(() => fire(`The reply stalled for ${Math.round(idleMs / 1000)}s`), idleMs);
    },
    done() {
      clearTimeout(idle);
      clearTimeout(total);
      outer?.removeEventListener?.("abort", onOuter);
    },
    /** Throw a retryable network error if one of our timeouts (not the caller) stopped the call. */
    check() {
      if (fired) throw new ProviderError(`${fired} — the provider stopped answering`, { kind: "network", retryable: true });
    },
  };
}

module.exports = { ProviderError, classify, failFromResponse, sse, rateLimitFrom, retryAtFrom, callTimeouts };
