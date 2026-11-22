/*
  S8, natural voice for spoken answers (src/voice/tts.js): Azure Speech
  free tier only, capped below the free allowance; when it can't speak, the
  browser's own voice does. Nothing is ever charged.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-tts-'));
process.env.DB_PATH = path.join(tmp, 'tts.db');
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'tts-test-secret-tts-test-secret-0123456789';

const db = require('../src/db');
const { seal } = require('../src/hive/vault');
const tts = require('../src/voice/tts');

const azure = (on = true) => async () => ({ providers: on ? [{ id: 'azure', kind: 'azure', enabled: true, key: seal('azure-key'), region: 'centralindia' }] : [] });
const mp3 = Buffer.from('ID3fake-mp3-bytes');

test.before(async () => {
  await db.run('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT)');
});

test('SSML is escaped and the text is cleaned and cut to one or two sentences', () => {
  const x = tts.ssml('a < b & "c"', 'en-IN-NeerjaNeural', 'en-IN');
  assert.match(x, /a &lt; b &amp; &quot;c&quot;/);
  assert.match(x, /<voice name="en-IN-NeerjaNeural">/);
  assert.equal(tts.speakable('**Bold** `code`  here'), 'Bold code here');
  assert.equal(tts.speakable('x'.repeat(900)).length, 400);
});

test('the monthly cap can be lowered but never removed or raised above the free allowance', () => {
  assert.equal(tts.sanitizeTts({}).monthlyChars, tts.FREE_MONTHLY_CHARS);
  assert.equal(tts.sanitizeTts({ monthlyChars: 10_000_000 }).monthlyChars, tts.FREE_MONTHLY_CHARS);
  assert.equal(tts.sanitizeTts({ monthlyChars: 0 }).monthlyChars, tts.FREE_MONTHLY_CHARS);
  assert.equal(tts.sanitizeTts({ monthlyChars: 100000 }).monthlyChars, 100000);
});

test('no Azure Speech entry: the browser voice speaks', async () => {
  const r = await tts.synthesize({ text: 'Hello there.', loadSttConfig: azure(false), fetchImpl: async () => assert.fail('must not call') });
  assert.deepEqual([r.ok, r.fallback], [false, 'browser']);
});

test('speaks through Azure with the right request, then serves a repeat from the cache for free', async () => {
  tts._cache.clear();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(mp3, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  const r = await tts.synthesize({ text: 'Mid ko update karo.', lang: 'en-IN', username: 'asha', loadSttConfig: azure(), fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(r.voice, 'en-IN-NeerjaNeural');
  assert.deepEqual(r.audio, mp3);
  assert.equal(calls[0].url, 'https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.equal(calls[0].init.headers['Ocp-Apim-Subscription-Key'], 'azure-key');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/ssml+xml');
  assert.match(calls[0].init.body, /Mid ko update karo\./);
  const again = await tts.synthesize({ text: 'Mid ko update karo.', lang: 'en-IN', username: 'asha', loadSttConfig: azure(), fetchImpl });
  assert.equal(again.cached, true);
  assert.equal(calls.length, 1, 'a repeated sentence costs nothing');
  const hindi = await tts.synthesize({ text: 'नमस्ते', lang: 'hi-IN', voice: 'hi-IN-MadhurNeural', loadSttConfig: azure(), fetchImpl });
  assert.equal(hindi.voice, 'hi-IN-MadhurNeural');
  const odd = await tts.synthesize({ text: 'Pick a voice.', lang: 'hi-IN', voice: 'en-US-Someone', loadSttConfig: azure(), fetchImpl });
  assert.equal(odd.voice, 'hi-IN-SwaraNeural', 'unknown voices fall back to the language default');
});

test('stops at 85% of the free month, and at a student\'s daily share; a refused key falls back', async () => {
  tts._cache.clear();
  const ok = async () => new Response(mp3, { status: 200 });
  const m = `M:${new Date().toISOString().slice(0, 7)}`;
  await db.run("INSERT INTO voice_tts_usage(who, period, chars) VALUES('site', ?, ?) ON CONFLICT(who, period) DO UPDATE SET chars=excluded.chars", [m, Math.floor(tts.FREE_MONTHLY_CHARS * tts.SAFE) - 5]);
  const full = await tts.synthesize({ text: 'This sentence is longer than five characters.', loadSttConfig: azure(), fetchImpl: async () => assert.fail('must not call') });
  assert.equal(full.reason, 'monthly free voice used');
  await db.run("UPDATE voice_tts_usage SET chars=0 WHERE who='site'");
  const d = `d:${new Date().toISOString().slice(0, 10)}`;
  await db.run("INSERT INTO voice_tts_usage(who, period, chars) VALUES('user:heavy', ?, 3999)", [d]);
  const share = await tts.synthesize({ text: 'Another sentence.', username: 'heavy', loadSttConfig: azure(), fetchImpl: ok });
  assert.equal(share.reason, 'daily share used');
  const refused = await tts.synthesize({ text: 'Key check.', loadSttConfig: azure(), fetchImpl: async () => new Response('', { status: 401 }) });
  assert.deepEqual([refused.ok, refused.fallback, refused.reason], [false, 'browser', 'key refused']);
});
