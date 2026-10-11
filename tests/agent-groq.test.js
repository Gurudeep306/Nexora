// The Groq client: SSE parsing, retries, timeouts, model-specific options.
// Uses an injected fetch — never the network, never a real key.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGroqClient, AiError } = require('../src/ai/groq');

const enc = new TextEncoder();
/** A streaming Response whose body arrives in exactly these chunks. */
function sseResponse(chunks, init = {}) {
  const body = new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' }, ...init });
}
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const reply = (content, usage = { total_tokens: 7 }) => json({ choices: [{ message: { content } }], usage });
const noSleep = async () => {};

test('chatStream joins SSE events that are split across reads', async () => {
  const ev = (o) => `data: ${JSON.stringify(o)}\n\n`;
  const full =
    ev({ choices: [{ delta: { content: 'Hel' } }] }) +
    ev({ choices: [{ delta: { content: 'lo, ' } }] }) +
    ev({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'get_', arguments: '{"a"' } }] } }] }) +
    ev({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'user_stats', arguments: ':1}' } }] } }] }) +
    ev({ choices: [{ delta: { content: 'world' }, finish_reason: 'stop' }] }) +
    ev({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } }) +
    'data: [DONE]\n\n';
  // Cut the stream at awkward places: mid-line, mid-JSON, mid-"data:".
  const cuts = [5, 17, 40, 41, 90, 133, 200, 260, full.length - 3];
  const chunks = [];
  let at = 0;
  for (const c of cuts) {
    chunks.push(full.slice(at, c));
    at = c;
  }
  chunks.push(full.slice(at));

  const client = createGroqClient({ apiKey: 'test-key', fetchImpl: async () => sseResponse(chunks), sleep: noSleep });
  const deltas = [];
  let done;
  for await (const e of client.chatStream({ messages: [{ role: 'user', content: 'hi' }] })) {
    if (e.type === 'delta') deltas.push(e.content);
    else done = e;
  }
  assert.equal(deltas.join(''), 'Hello, world');
  assert.equal(done.content, 'Hello, world');
  assert.equal(done.usage.total_tokens, 7);
  assert.equal(done.toolCalls.length, 1);
  assert.equal(done.toolCalls[0].id, 'c1');
  assert.equal(done.toolCalls[0].function.name, 'get_user_stats');
  assert.equal(done.toolCalls[0].function.arguments, '{"a":1}');
});

test('429 is retried, honouring retry-after, then succeeds', async () => {
  let calls = 0;
  const waits = [];
  const client = createGroqClient({
    apiKey: 'test-key',
    sleep: async (ms) => waits.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return json({ error: { message: 'slow down' } }, 429, { 'retry-after': '2' });
      return reply('ok');
    },
  });
  const out = await client.chat({ messages: [{ role: 'user', content: 'x' }] });
  assert.equal(out.content, 'ok');
  assert.equal(calls, 3);
  assert.deepEqual(waits, [2000, 2000]);
});

test('after retries are exhausted the fallback model is tried once', async () => {
  const models = [];
  const client = createGroqClient({
    apiKey: 'test-key',
    sleep: noSleep,
    fetchImpl: async (_url, init) => {
      const { model } = JSON.parse(init.body);
      models.push(model);
      return model === 'fallback-m' ? reply('from fallback') : json({}, 503);
    },
  });
  const out = await client.chat({ model: 'main-m', fallbackModel: 'fallback-m', messages: [] });
  assert.equal(out.content, 'from fallback');
  assert.deepEqual(models, ['main-m', 'main-m', 'main-m', 'main-m', 'fallback-m']);
});

test('persistent 429 surfaces as a 429 AiError and trips the circuit breaker', async () => {
  let calls = 0;
  const client = createGroqClient({
    apiKey: 'test-key',
    sleep: noSleep,
    maxRetries: 0,
    breakerThreshold: 2,
    fetchImpl: async () => {
      calls += 1;
      return json({}, 429);
    },
  });
  const opts = { model: 'm', fallbackModel: null, messages: [] };
  await assert.rejects(client.chat(opts), (e) => e instanceof AiError && e.status === 429);
  await assert.rejects(client.chat(opts), (e) => e.status === 429);
  const before = calls;
  await assert.rejects(client.chat(opts), (e) => e.code === 'busy');
  assert.equal(calls, before, 'breaker open: no request sent');
});

test('a hung request is aborted by the timeout', async () => {
  const client = createGroqClient({
    apiKey: 'test-key',
    sleep: noSleep,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      }),
  });
  // AbortSignal.timeout's timer is unref'd; on Node 22 nothing else keeps the
  // test's event loop alive while the hung fetch waits for it.
  const keepAlive = setInterval(() => {}, 1000);
  const t0 = Date.now();
  try {
    await assert.rejects(
      client.chat({ messages: [], timeoutMs: 50, fallbackModel: null }),
      (e) => e instanceof AiError && e.status === 504,
    );
  } finally {
    clearInterval(keepAlive);
  }
  assert.ok(Date.now() - t0 < 2000);
});

test('reasoning_effort is only sent to gpt-oss models; JSON mode and stream options', async () => {
  const bodies = [];
  const client = createGroqClient({
    apiKey: 'test-key',
    sleep: noSleep,
    fetchImpl: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return reply('{}');
    },
  });
  await client.chat({ model: 'openai/gpt-oss-120b', messages: [], reasoningEffort: 'medium', json: true });
  await client.chat({ model: 'llama-3.1-8b-instant', messages: [], reasoningEffort: 'medium' });
  assert.equal(bodies[0].reasoning_effort, 'medium');
  assert.deepEqual(bodies[0].response_format, { type: 'json_object' });
  assert.equal('reasoning_effort' in bodies[1], false);
  assert.equal('response_format' in bodies[1], false);
});

test('the API key goes only in the Authorization header and never into errors', async () => {
  const secret = 'gsk_super_secret_value';
  let auth;
  const client = createGroqClient({
    apiKey: secret,
    sleep: noSleep,
    fetchImpl: async (_url, init) => {
      auth = init.headers.Authorization;
      assert.ok(!init.body.includes(secret));
      return json({ error: { message: 'bad request' } }, 401);
    },
  });
  await assert.rejects(client.chat({ messages: [] }), (e) => {
    assert.ok(!String(e.message).includes(secret));
    assert.equal(e.status, 503);
    return true;
  });
  assert.equal(auth, `Bearer ${secret}`);
});

test('no key → 503 "AI is not configured" without any request', async () => {
  let called = false;
  const client = createGroqClient({ apiKey: '', fetchImpl: async () => ((called = true), reply('x')) });
  await assert.rejects(client.chat({ messages: [] }), (e) => e.status === 503 && e.message === 'AI is not configured');
  assert.equal(called, false);
});
