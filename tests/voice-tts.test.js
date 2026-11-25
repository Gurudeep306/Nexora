/*
  Natural voice for spoken answers (src/voice/tts.js): our own voice server
  first (free, Indian voices, exact mouth shapes); Azure Speech's free tier
  only when an admin turns it on for a non-commercial site, capped below the
  free allowance; when neither can speak, the browser's own voice does.
  Nothing is ever charged.
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
  // These Azure tests are for a non-commercial site that turned its free tier on.
  await tts.saveTtsConfig({ azureFree: true, ownUrl: '', clearOwnKey: true }, 'test');
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

/* ── our own voice server ── */

const wav = () => {
  const b = Buffer.alloc(48);
  b.write('RIFF', 0, 'ascii');
  b.write('WAVE', 8, 'ascii');
  return b;
};
const ownReply = (extra = {}) => ({
  audio: wav().toString('base64'),
  words: ['Mid ', 'is ', 'four.'],
  wtimes: [100, 400, 600],
  wdurations: [280, 180, 500],
  visemes: ['PP', 'I', 'DD', 'I', 'SS', 'FF', 'O'],
  vtimes: [100, 160, 300, 400, 470, 600, 700],
  vdurations: [60, 140, 80, 70, 110, 100, 300],
  ...extra,
});

test('Azure free tier is off by default: Microsoft gives commercial rights only on the paid tier', async () => {
  assert.equal(tts.sanitizeTts({}).azureFree, false);
  await tts.saveTtsConfig({ azureFree: false }, 'test');
  const r = await tts.synthesize({ text: 'Hello.', loadSttConfig: azure(), fetchImpl: async () => assert.fail('must not call Azure') });
  assert.deepEqual([r.ok, r.reason], [false, 'no voice server set up']);
  assert.deepEqual(await tts.statusView(azure()), { available: false, engine: null, voices: {} });
  await tts.saveTtsConfig({ azureFree: true }, 'test');
});

test('the voice server address must be https (http only on this machine), with no path', () => {
  assert.equal(tts.cleanUrl('https://1-2-3-4.sslip.io/v1?x=1'), 'https://1-2-3-4.sslip.io');
  assert.equal(tts.cleanUrl('http://1-2-3-4.sslip.io'), '');
  assert.equal(tts.cleanUrl('http://127.0.0.1:8882'), 'http://127.0.0.1:8882');
  assert.equal(tts.cleanUrl('javascript:alert(1)'), '');
  assert.equal(tts.cleanUrl(''), '');
});

test('our own voice server speaks first, Hindi as sounds, with word times and mouth shapes; the password is sealed', async () => {
  tts._cache.clear();
  await tts.saveTtsConfig({ ownUrl: 'https://voice.example.test/extra', newOwnKey: 'voice-secret-1234' }, 'test');
  const row = await db.get("SELECT value FROM site_settings WHERE key='voice_tts'");
  assert.doesNotMatch(row.value, /voice-secret-1234/, 'the password is never stored in plain text');
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(ownReply()), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const r = await tts.synthesize({ text: 'नमस्ते! Mid is four.', lang: 'hi-IN', voice: 'hm_psi', username: 'ravi', loadSttConfig: azure(), fetchImpl });
  assert.equal(r.ok, true);
  assert.deepEqual([r.engine, r.voice, r.mime], ['own', 'hm_psi', 'audio/wav']);
  assert.equal(calls.length, 1, 'Azure is not asked when our own server answers');
  assert.equal(calls[0].url, 'https://voice.example.test/voice/v1/synthesize');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer voice-secret-1234');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.input[0], { type: 'phonetic', value: 'nəməsteː', subtitles: 'नमस्ते' });
  assert.equal(body.input.at(-1).type, 'text');
  assert.deepEqual(r.timing.visemes, ownReply().visemes);
  // English alone goes as plain text, so the server times every word.
  await tts.synthesize({ text: 'Only English here.', voice: 'hm_psi', loadSttConfig: azure(), fetchImpl });
  assert.equal(JSON.parse(calls.at(-1).init.body).input, 'Only English here.');
  assert.deepEqual(r.timing.words, ownReply().words);
  const status = await tts.statusView(azure());
  assert.equal(status.engine, 'own');
  assert.deepEqual(status.voices['hi-IN'].map((v) => v.id), ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi']);
  // An unknown voice gets a default Indian voice, never an Azure one.
  const odd = await tts.synthesize({ text: 'Another one.', voice: 'en-IN-NeerjaNeural', loadSttConfig: azure(), fetchImpl });
  assert.equal(odd.voice, 'hf_alpha');
});

test('a bad answer from the voice server is never passed on: no audio, odd shapes or a refused password', async () => {
  tts._cache.clear();
  const reply = (j, status = 200) => async () => new Response(JSON.stringify(j), { status });
  const noAudio = await tts.synthesize({ text: 'One.', loadSttConfig: azure(), fetchImpl: reply({ audio: '' }) });
  assert.deepEqual([noAudio.ok, noAudio.reason], [false, 'voice server sent no audio']);
  const notWav = await tts.synthesize({ text: 'Two.', loadSttConfig: azure(), fetchImpl: reply({ audio: Buffer.from('<html>oops</html>'.repeat(4)).toString('base64') }) });
  assert.equal(notWav.ok, false);
  const refused = await tts.synthesize({ text: 'Three.', loadSttConfig: azure(), fetchImpl: reply({}, 401) });
  assert.equal(refused.reason, 'voice server password refused');
  // Unknown mouth shapes or mismatched lengths: the audio plays, the bad timings are dropped.
  const odd = tts.readOwn(ownReply({ visemes: ['PP', '<script>'], vtimes: [0, 1], vdurations: [1, 1], wtimes: [1] }));
  assert.ok(odd.audio.length);
  assert.equal(odd.timing, null);
  const down = await tts.synthesize({ text: 'Four.', loadSttConfig: azure(), fetchImpl: async () => { throw new Error('down'); } });
  assert.deepEqual([down.ok, down.fallback, down.reason], [false, 'browser', "voice server didn't answer"]);
  await tts.saveTtsConfig({ ownUrl: '', clearOwnKey: true }, 'test');
});

test('the in-browser voice gets Hindi as sounds from the server (no AI), and English as it is', async () => {
  const express = require('express');
  const app = express();
  app.use((req, _res, next) => { req.sessionUser = { username: 'stu' }; next(); });
  app.use(tts.createTtsRouter({ requireAuthenticatedUser: (_q, _s, n) => n(), isTrustedOrigin: () => true, loadSttConfig: azure(false) }));
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const hi = await (await fetch(`${base}/api/voice/phonetic`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'नमस्ते! mid देखो।' }) })).json();
    assert.deepEqual(hi.input[0], { type: 'phonetic', value: 'nəməsteː', subtitles: 'नमस्ते' });
    const en = await (await fetch(`${base}/api/voice/phonetic`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '**Mid** is four.' }) })).json();
    assert.equal(en.input, 'Mid is four.');
  } finally {
    srv.close();
  }
});

test('the in-browser voice ships HeadTTS (MIT) at a pinned version, and no GPL phonemizer', () => {
  const dir = path.join(__dirname, '..', 'client', 'public', 'headtts');
  assert.match(fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8'), /MIT License/);
  assert.equal(fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim(), '1.3.0');
  for (const f of ['headtts.mjs', 'worker-tts.mjs', 'language-en-us.mjs']) assert.ok(fs.existsSync(path.join(dir, 'modules', f)), f);
  const speak = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'speak.ts'), 'utf8');
  assert.doesNotMatch(speak, /kokoro-js|phonemizer/, 'the GPL path is gone');
});
