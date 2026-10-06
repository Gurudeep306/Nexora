/**
 * Kronos-1 client.
 *
 * Talks to the local model server (ai-engine/serve_api.py, llama.cpp, 127.0.0.1).
 * Everything returned comes from the model. There is NO fallback text generator:
 * if the model server is unavailable the call fails with { ok:false, error }.
 */

const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.KRONOS_PORT || '8000';
const KRONOS_LOCAL_URL = process.env.KRONOS_MODEL_URL || `http://127.0.0.1:${PORT}`;
const KRONOS_SECRET = process.env.KRONOS_SECRET || 'kronos-sovereign-intelligence-2026';
const REQUEST_TIMEOUT_MS = Number(process.env.KRONOS_TIMEOUT_MS || 240000);

let daemonProc = null;
let startingPromise = null;

async function health() {
  try {
    const r = await fetch(`${KRONOS_LOCAL_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Start the model server if it is not already running, and wait until it is ready. */
async function ensureDaemon() {
  let h = await health();
  if (h && h.status === 'ready') return h;
  if (h && h.status === 'unavailable') return h; // running but model failed to load

  if (!startingPromise) {
    startingPromise = (async () => {
      if (!daemonProc) {
        const script = path.resolve(__dirname, '../ai-engine/start_kronos.sh');
        daemonProc = spawn('bash', [script], {
          env: { ...process.env, PORT, KRONOS_SECRET },
          stdio: 'ignore',
          detached: false,
        });
        daemonProc.on('exit', () => { daemonProc = null; });
        process.on('exit', () => { try { daemonProc && daemonProc.kill(); } catch {} });
      }
      for (let i = 0; i < 120; i++) {
        const cur = await health();
        if (cur) return cur;
        await new Promise((r) => setTimeout(r, 500));
      }
      return null;
    })().finally(() => { startingPromise = null; });
  }
  return startingPromise;
}

async function kronosChat(_apiKey, messages, opts = {}) {
  const h = await ensureDaemon();
  if (!h || h.status !== 'ready') {
    return {
      ok: false,
      status: 503,
      error: `Kronos model is not running${h && h.error ? `: ${h.error}` : ''}. Start it with: npm run model:serve`,
    };
  }
  try {
    const body = {
      model: 'kronos-1',
      messages,
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.3,
    };
    if (opts.stop) body.stop = opts.stop;
    if (opts.responseFormat) body.response_format = opts.responseFormat;

    const res = await fetch(`${KRONOS_LOCAL_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexora-Secret': KRONOS_SECRET,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error || `model server ${res.status}` };
    const content = data.choices?.[0]?.message?.content || '';
    if (!content.trim()) return { ok: false, status: 502, error: 'model returned an empty reply' };
    return { ok: true, content, provider: 'kronos-local' };
  } catch (e) {
    return { ok: false, status: 504, error: `Kronos request failed: ${e.message}` };
  }
}

async function kronosComplete(_apiKey, prompt, opts = {}) {
  return kronosChat(_apiKey, [{ role: 'user', content: prompt }], {
    maxTokens: opts.maxTokens || 120,
    temperature: opts.temperature ?? 0.1,
    stop: opts.stop,
  });
}

module.exports = { kronosChat, kronosComplete, ensureDaemon, health, KRONOS_LOCAL_URL, KRONOS_SECRET };
