/*
  Voice: the zero-spend rule and the test sets' shape (docs/voice/BLUEPRINT.md
  §4 "Zero-spend rule", docs/voice/tests/).

  1. No code in the voice feature may call a paid AI service or read a paid
     provider's key. Free tiers (Groq, Gemini, Cerebras, OpenRouter free
     models, Cloudflare Workers AI, Azure Speech free tier) are allowed; paid
     upgrades are an explicit admin choice outside this code.
  2. The Scene Voice and tutor test sets stay well-formed and never shrink.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const VOICE_DIRS = ['client/src/voice', 'src/voice'].map((d) => path.join(ROOT, d));

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(m?[jt]sx?|json)$/.test(e.name) ? [p] : [];
  });
}

// Paid-only services and their keys. A match means the voice feature could spend money.
const PAID = [
  /api\.openai\.com/i, /api\.anthropic\.com/i, /api\.elevenlabs\.io/i, /api\.sarvam\.ai/i, /api\.deepgram\.com/i,
  /api\.assemblyai\.com/i, /api\.cartesia\.ai/i, /api\.play\.ht/i, /api\.ultravox\.ai/i, /texttospeech\.googleapis\.com/i,
  /speech\.googleapis\.com/i, /polly\.[a-z0-9-]+\.amazonaws\.com/i,
  /\b(OPENAI|ANTHROPIC|ELEVENLABS|SARVAM|DEEPGRAM|ASSEMBLYAI|CARTESIA|PLAYHT|ULTRAVOX)_API_KEY\b/,
];

test('zero-spend: the voice feature never calls a paid AI service', () => {
  const hits = [];
  for (const f of VOICE_DIRS.flatMap(files)) {
    const text = fs.readFileSync(f, 'utf8');
    for (const re of PAID) if (re.test(text)) hits.push(`${path.relative(ROOT, f)} matches ${re}`);
  }
  assert.deepEqual(hits, [], `Paid services are not allowed in the voice feature (blueprint: zero-spend rule):\n${hits.join('\n')}`);
});

test('voice test sets are well-formed and keep growing', () => {
  const load = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'voice', 'tests', n), 'utf8'));
  const scene = load('scene.json');
  const VERBS = new Set(['pause', 'play', 'jump', 'step', 'rewind', 'replay', 'whatif', 'why', 'speed', 'predict', 'value']);
  assert.ok(scene.cases.length >= 40, 'scene cases never shrink');
  for (const c of scene.cases) {
    assert.equal(typeof c.say, 'string');
    assert.ok(c.expect === null || VERBS.has(c.expect.verb), `unknown verb in "${c.say}"`);
  }
  assert.ok(scene.cases.some((c) => c.expect === null), 'includes questions that must not drive the player');

  const tutor = load('tutor.json');
  const KINDS = new Set(['hint', 'explain', 'solution', 'refusal', 'action', 'honest', 'exam']);
  assert.ok(tutor.cases.length >= 20, 'tutor cases never shrink');
  const ids = new Set();
  for (const c of tutor.cases) {
    assert.ok(KINDS.has(c.kind), `unknown kind ${c.kind}`);
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(c.say && c.context && Array.isArray(c.must) && Array.isArray(c.mustNot), `case ${c.id} is incomplete`);
  }
  for (const kind of ['hint', 'refusal', 'explain', 'action', 'honest']) assert.ok(tutor.cases.some((c) => c.kind === kind), `covers ${kind}`);
});
