/*
  Speech to text through the chain (src/voice/stt.js): the most accurate
  service first; a service near any of its free limits, or failing, is
  skipped and the next one answers; when all are full the browser's own
  recognition is used; nothing is ever charged.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-stt-'));
process.env.DB_PATH = path.join(tmp, 'stt.db');
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'stt-test-secret-stt-test-secret-0123456789';
delete process.env.GROQ_API_KEY;

const db = require('../src/db');
const { seal } = require('../src/hive/vault');
const stt = require('../src/voice/stt');

const clip = (seconds) => {
  const b = stt.testClip();
  const n = Math.round(16000 * seconds);
  const out = Buffer.alloc(44 + n * 2);
  b.copy(out, 0, 0, 44);
  out.writeUInt32LE(36 + n * 2, 4);
  out.writeUInt32LE(n * 2, 40);
  return out;
};

const cfg = (providers, studentDailySeconds = 600) => async () => ({ providers: providers.map(stt.sanitizeProvider), studentDailySeconds });

test('a clip is a 16 kHz mono WAV of sensible length', async () => {
  assert.equal(Math.round(stt.wavSeconds(clip(2)) * 10) / 10, 2);
  assert.equal(stt.wavSeconds(Buffer.from('not audio at all, not at all, not at all, not at all')), null);
  await db.run('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT)');
  const r = await stt.transcribe({ audio: Buffer.from('nope'), fetchConfig: cfg([]) });
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
  const empty = await stt.transcribe({ audio: clip(0.1), fetchConfig: cfg([]) });
  assert.deepEqual([empty.ok, empty.text], [true, ''], 'too short to be speech: nothing is sent');
});

test('the first service answers; a failing one rests and the next answers', async (t) => {
  stt._cooling.clear();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    if (String(url).includes('sarvam')) return new Response('{"error":"down"}', { status: 503 });
    if (String(url).includes('groq')) return new Response(JSON.stringify({ text: 'mid ko update karo', segments: [{ avg_logprob: -0.1, no_speech_prob: 0.01, compression_ratio: 1.2 }] }), { status: 200 });
    return new Response('{}', { status: 500 });
  });
  const providers = [
    { id: 'sarvam', kind: 'sarvam', key: seal('k1') },
    { id: 'groq', kind: 'groq', key: seal('k2') },
  ];
  const r = await stt.transcribe({ audio: clip(2), lang: 'en-IN', hints: ['low', 'high'], username: 'asha', fetchConfig: cfg(providers) });
  assert.equal(r.ok, true);
  assert.equal(r.provider, 'groq');
  assert.equal(r.text, 'mid ko update karo');
  assert.ok(r.confidence > 0.8);
  assert.equal(r.tried[0].error, 503);
  // Sarvam now rests: the next clip goes straight to Groq.
  calls.length = 0;
  const r2 = await stt.transcribe({ audio: clip(2), username: 'asha', fetchConfig: cfg(providers) });
  assert.equal(r2.provider, 'groq');
  assert.ok(!calls.some((u) => u.includes('sarvam')), 'the failing service is skipped while it rests');
});

test('a service near its free limit is skipped before the limit; all full means the browser answers', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ transcript: 'BFS queue' }), { status: 200 }));
  // Google: 60 s a month here; 85% is 51 s. Use 50 s, then a 2 s clip must go elsewhere.
  const providers = [
    { id: 'g', kind: 'google', key: seal('k'), limits: { perMinute: 100, perMonthSeconds: 60 } },
    { id: 's', kind: 'sarvam', key: seal('k'), limits: { perMinute: 100, creditSeconds: 10 } },
  ];
  await db.run("INSERT INTO voice_stt_usage(provider, period, requests, seconds) VALUES('g', ?, 1, 50)", [`M:${new Date().toISOString().slice(0, 7)}`]);
  const r = await stt.transcribe({ audio: clip(2), fetchConfig: cfg(providers) });
  assert.equal(r.provider, 's', 'Google is near its monthly free minutes, so Sarvam answers');
  assert.match(r.tried[0].skipped, /audio this month/);
  // Sarvam's credit (10 s, 85% = 8.5 s): after a few clips it is full too.
  // 2 s used; three more clips reach 8 s (under 8.5); the next would pass it.
  for (let i = 0; i < 3; i++) assert.equal((await stt.transcribe({ audio: clip(2), fetchConfig: cfg(providers) })).provider, 's');
  const last = await stt.transcribe({ audio: clip(2), fetchConfig: cfg(providers) });
  assert.equal(last.ok, false);
  assert.equal(last.fallback, 'browser', 'never charged: the browser recognition takes over');
});

test('a student over the fair daily share uses the browser; keys and limits are checked', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async () => new Response('{"text":"hi"}', { status: 200 }));
  const providers = [{ id: 'q', kind: 'groq', key: seal('k') }];
  const r = await stt.transcribe({ audio: clip(5), username: 'heavy', fetchConfig: cfg(providers, 4) });
  assert.equal(r.fallback, 'browser');
  assert.match(r.reason, /daily share/);
  const nokey = await stt.transcribe({ audio: clip(1), fetchConfig: cfg([{ id: 'd', kind: 'deepgram' }]) });
  assert.equal(nokey.tried[0].skipped, 'no key');
});

test('a refused key rests for a day; rate limits rest as long as asked', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async (url) => (String(url).includes('elevenlabs') ? new Response('{}', { status: 401 }) : new Response('{}', { status: 429, headers: { 'retry-after': '120' } })));
  const providers = [
    { id: 'e', kind: 'elevenlabs', key: seal('k') },
    { id: 'q', kind: 'groq', key: seal('k') },
  ];
  const r = await stt.transcribe({ audio: clip(1), fetchConfig: cfg(providers) });
  assert.equal(r.fallback, 'browser');
  const e = stt._cooling.get('e');
  const q = stt._cooling.get('q');
  assert.ok(e.until - Date.now() > 23 * 3600e3 && e.why === 'key refused');
  assert.ok(q.until - Date.now() >= 119e3 && q.why === 'rate limited');
});

test('vocabulary hints: the CS glossary plus the page, inside Whisper\'s prompt size', () => {
  const h = stt.hintsFrom(['lowIndex', 'pivot', 'x'.repeat(80)]);
  assert.ok(h.includes('BFS') && h.includes('lowIndex') && h.includes('pivot'));
  assert.ok(!h.some((w) => w.length > 40));
  const p = stt.promptFrom(h, 'en-IN');
  assert.ok(p.length <= 800 && /mid ko update karo/.test(p));
  assert.equal(stt.DEFAULT_ORDER[0], 'sarvam');
});

test('auto order: the accuracy order first, then real results move a service down', async (t) => {
  stt._cooling.clear();
  const providers = [
    { id: 'groq', kind: 'groq', key: seal('k') },
    { id: 'sarvam', kind: 'sarvam', key: seal('k') },
  ].map(stt.sanitizeProvider);
  const auto = async () => ({ providers, studentDailySeconds: 600, autoOrder: true });
  assert.deepEqual((await stt.ordered(await auto())).map((p) => p.id), ['sarvam', 'groq'], 'no results yet: Sarvam (best for Indian speech) first');
  // Sarvam keeps failing; Groq answers well and fast.
  for (let i = 0; i < 30; i++) {
    await db.run("INSERT INTO voice_stt_stats(provider, day, ok, fail, ms, conf, conf_n) VALUES('sarvam', ?, 0, 1, 0, 0, 0) ON CONFLICT(provider, day) DO UPDATE SET fail=fail+1", [new Date().toISOString().slice(0, 10)]).catch(async () => {
      await stt.ordered(await auto());
    });
  }
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ text: 'ok', segments: [{ avg_logprob: -0.05, no_speech_prob: 0, compression_ratio: 1 }] }), { status: 200 }));
  for (let i = 0; i < 25; i++) await stt.transcribe({ audio: clip(1), fetchConfig: async () => ({ providers: [providers[0]], studentDailySeconds: 9999 }) });
  assert.deepEqual((await stt.ordered(await auto())).map((p) => p.id), ['groq', 'sarvam'], 'measured results now lead');
  // Manual order is kept exactly when auto is off.
  assert.deepEqual((await stt.ordered({ providers, autoOrder: false })).map((p) => p.id), ['groq', 'sarvam']);
});

test('one entry per service: a second key for the same provider is not kept', async () => {
  await db.run('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT)');
  const view = await stt.adminSave({ providers: [
    { id: 'groq', kind: 'groq' },
    { id: 'groq-2', kind: 'groq', newKey: 'second' },
    { id: 'mine', kind: 'openai_compatible', url: 'https://a.example/v1' },
    { id: 'mine-2', kind: 'openai_compatible', url: 'https://b.example/v1' },
  ] }, 'owner');
  assert.deepEqual(view.providers.map((p) => p.id), ['groq', 'mine', 'mine-2']);
});

test('more keys for one service: each from a different person, used in turn by its own limits', async (t) => {
  stt._cooling.clear();
  await db.run('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT)');
  // A second key needs a name and the account owner's agreement; two keys under one name are refused.
  await assert.rejects(() => stt.adminSave({ providers: [{ id: 'deepgram', kind: 'deepgram', extraKeys: [{ owner: 'Ravi', newKey: 'k2' }] }] }, 'o'), /Confirm/);
  await assert.rejects(() => stt.adminSave({ providers: [{ id: 'deepgram', kind: 'deepgram', extraKeys: [{ owner: 'Ravi', newKey: 'k2', consent: true }, { owner: 'ravi ', newKey: 'k3', consent: true }] }] }, 'o'), /different person/);
  const view = await stt.adminSave({ providers: [{ id: 'deepgram', kind: 'deepgram', newKey: 'main', limits: { perMinute: 100, creditSeconds: 10 }, extraKeys: [{ owner: 'Ravi', newKey: 'k2', consent: true }] }] }, 'o');
  const dg = view.providers[0];
  assert.equal(dg.extraKeys.length, 1);
  assert.equal(dg.extraKeys[0].owner, 'Ravi');
  assert.ok(!JSON.stringify(view).includes('k2'), 'keys never come back');
  // The main key's credit runs low (85% of 10 s), then Ravi's key answers.
  const used = [];
  t.mock.method(globalThis, 'fetch', async (_u, init) => {
    used.push(init.headers.Authorization);
    return new Response(JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: 'ok', confidence: 0.9 }] }] } }), { status: 200 });
  });
  const cfg = await stt.loadConfig();
  for (let i = 0; i < 6; i++) await stt.transcribe({ audio: clip(2), fetchConfig: async () => cfg });
  assert.deepEqual(used, ['Token main', 'Token main', 'Token main', 'Token main', 'Token k2', 'Token k2']);
});
