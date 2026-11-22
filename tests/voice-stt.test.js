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

test('S5: the chain returns normalised text, the raw text, and code on code pages', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ text: 'mit plus plus', segments: [{ avg_logprob: -0.1, no_speech_prob: 0.01, compression_ratio: 1.2 }] }), { status: 200 }));
  const providers = [{ id: 'groq-s5', kind: 'groq', key: seal('k2') }];
  const r = await stt.transcribe({ audio: clip(1), lang: 'en-IN', hints: ['mid'], mode: 'code', fetchConfig: cfg(providers) });
  assert.equal(r.ok, true);
  assert.equal(r.raw, 'mit plus plus');
  assert.equal(r.text, 'mid plus plus', 'a near-miss of the page name is fixed; words stay words');
  assert.equal(r.code, 'mid++');
  assert.deepEqual(r.unplaced, []);
  const plain = await stt.transcribe({ audio: clip(1), lang: 'en-IN', hints: ['mid'], mode: 'text', fetchConfig: cfg(providers) });
  assert.equal(plain.text, 'mit plus plus', 'plain text is never guessed at');
  assert.equal(plain.code, undefined);
});

test('S5: Hindi that comes back in Urdu script is a wrong answer; the next service answers', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('groq')) return new Response(JSON.stringify({ text: 'مڈ کو اپڈیٹ کرو', segments: [{ avg_logprob: -0.1, no_speech_prob: 0.01, compression_ratio: 1.2 }] }), { status: 200 });
    return new Response(JSON.stringify({ transcript: 'मिड को अपडेट करो', language_code: 'hi-IN' }), { status: 200 });
  });
  const providers = [
    { id: 'groq-s5', kind: 'groq', key: seal('k2') },
    { id: 'sarvam-s5', kind: 'sarvam', key: seal('k1') },
  ];
  const r = await stt.transcribe({ audio: clip(1), lang: 'hi-IN', fetchConfig: cfg(providers) });
  assert.equal(r.ok, true);
  assert.equal(r.provider, 'sarvam-s5');
  assert.equal(r.text, 'मिड को अपडेट करो');
  assert.equal(r.tried[0].skipped, 'answered in Urdu script');
});

test('cleaning old usage keeps the month, day and current hour (free limits never reset by accident)', async () => {
  const now = new Date('2026-11-22T21:30:00Z');
  const old = new Date('2026-11-18T10:05:00Z');
  const rows = [
    ['prune', 'm:2026-11-22T21:30'], ['prune', 'h:2026-11-22T21'], ['prune', 'd:2026-11-22'], ['prune', 'M:2026-11'], ['prune', 'ever'],
    ['prune', `m:${old.toISOString().slice(0, 16)}`], ['prune', `h:${old.toISOString().slice(0, 13)}`],
  ];
  for (const [p, period] of rows) await db.run('INSERT INTO voice_stt_usage(provider, period, requests, seconds) VALUES(?,?,1,30) ON CONFLICT(provider, period) DO NOTHING', [p, period]);
  await stt.pruneUsage(now);
  const left = (await db.all("SELECT period FROM voice_stt_usage WHERE provider='prune' ORDER BY period")).map((r) => r.period);
  assert.deepEqual(left.sort(), ['M:2026-11', 'd:2026-11-22', 'ever', 'h:2026-11-22T21', 'm:2026-11-22T21:30'].sort());
  const u = await stt.usageOf('prune', now);
  assert.equal(u.month.seconds, 30, 'the month still counts');
  assert.equal(u.hour.seconds, 30, 'the hour still counts');
});

const seg = (lp, ns = 0.01, cr = 1.2) => ({ avg_logprob: lp, no_speech_prob: ns, compression_ratio: cr });

test('S6: a sure answer is used at once; no second service is asked', async (t) => {
  stt._cooling.clear();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ text: 'submit karo', segments: [seg(-0.1)] }), { status: 200 });
  });
  const providers = [{ id: 'g6a', kind: 'groq', key: seal('k') }, { id: 'o6a', kind: 'openai_compatible', url: 'https://w.example/v1' }];
  const r = await stt.transcribe({ audio: clip(1), mode: 'command', fetchConfig: cfg(providers) });
  assert.equal(r.unsure, false);
  assert.equal(calls.length, 1);
});

test('S6: an unsure answer is checked with the next service; the same words are trusted', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('groq')) return new Response(JSON.stringify({ text: 'Submit karo.', segments: [seg(-1.2)] }), { status: 200 });
    return new Response(JSON.stringify({ text: 'submit karo', segments: [seg(-0.2)] }), { status: 200 });
  });
  const providers = [{ id: 'g6b', kind: 'groq', key: seal('k') }, { id: 'o6b', kind: 'openai_compatible', url: 'https://w.example/v1' }];
  const r = await stt.transcribe({ audio: clip(1), mode: 'command', fetchConfig: cfg(providers) });
  assert.equal(r.unsure, false);
  assert.deepEqual(r.agreed, ['g6b', 'o6b']);
});

test('S6: two services disagree: both texts come back for the student to pick', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('groq')) return new Response(JSON.stringify({ text: 'delete line twelve', segments: [seg(-1.1)] }), { status: 200 });
    return new Response(JSON.stringify({ text: 'delete line twenty', segments: [seg(-0.3)] }), { status: 200 });
  });
  const providers = [{ id: 'g6c', kind: 'groq', key: seal('k') }, { id: 'o6c', kind: 'openai_compatible', url: 'https://w.example/v1' }];
  const r = await stt.transcribe({ audio: clip(1), mode: 'command', fetchConfig: cfg(providers) });
  assert.equal(r.unsure, true);
  assert.equal(r.provider, 'g6c');
  assert.deepEqual(r.alternatives, ['delete line twelve', 'delete line twenty']);
});

test('S6: no second service: the answer comes back marked unsure; other keys of the same service are not a second opinion', async (t) => {
  stt._cooling.clear();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ text: 'end the test', segments: [seg(-0.2, 0.7)] }), { status: 200 });
  });
  const providers = [{ id: 'g6d', kind: 'groq', key: seal('k'), keys: [{ id: 'x', owner: 'Ravi', key: seal('k2'), consent: true }] }];
  const r = await stt.transcribe({ audio: clip(1), mode: 'command', fetchConfig: cfg(providers) });
  assert.equal(r.ok, true);
  assert.equal(r.unsure, true);
  assert.equal(r.alternatives, undefined);
  assert.equal(calls.length, 1);
});

test('S6: words a code page cannot place make the text unsure', async (t) => {
  stt._cooling.clear();
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ text: 'print banana', segments: [seg(-0.1)] }), { status: 200 }));
  const r = await stt.transcribe({ audio: clip(1), mode: 'code', fetchConfig: cfg([{ id: 'g6e', kind: 'groq', key: seal('k') }]) });
  assert.equal(r.unsure, true);
  assert.deepEqual(r.unplaced, ['banana']);
  assert.equal(stt.sameWords('Submit karo.', 'submit  karo'), true);
  assert.equal(stt.sameWords('i++', 'i--'), false);
});
