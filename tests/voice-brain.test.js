/*
  Guru on the student's own device (docs/voice/BLUEPRINT.md §4.6): which
  tier a device gets, stepping down after a crash or a slow test, replies
  cleaned for speech, and — the safety rule — the server never hands an
  unsolved question to a device (its answer key must stay on the server).
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../src/voice/guru');

const B = (f) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'brain', f)).href);
const GB = 1024 ** 3;

test('each device gets the biggest tier its GPU can run; no GPU, iPhones and small devices use the server', async () => {
  const { pickTier } = await B('tiers.ts');
  const tier = (d) => pickTier(d)?.id ?? null;
  assert.equal(tier({ webgpu: true, f16: true, memoryGB: 8, maxBufferBytes: 4 * GB }), 'L');
  assert.equal(tier({ webgpu: true, f16: true, memoryGB: 8, maxBufferBytes: 1.5 * GB }), 'M');
  assert.equal(tier({ webgpu: true, f16: true, memoryGB: 4, maxBufferBytes: 1 * GB }), 'S');
  assert.equal(tier({ webgpu: true, f16: true, maxBufferBytes: 4 * GB }), 'S', 'no memory figure (Firefox, Safari): only the small one');
  assert.equal(tier({ webgpu: true, f16: false, memoryGB: 8, maxBufferBytes: 4 * GB }), 'S', 'a GPU without fp16: the small model, plain 4-bit');
  assert.equal(tier({ webgpu: true, f16: false, memoryGB: 2 }), null);
  assert.equal(tier({ webgpu: false, f16: false, memoryGB: 8 }), null, 'no GPU: WebAssembly was measured far too slow');
  assert.equal(tier({ webgpu: false, f16: false }), null);
  assert.equal(tier({ ios: true, webgpu: true, f16: true, memoryGB: 8, maxBufferBytes: 4 * GB }), null, 'iPhone/iPad Safari closes big tabs');
});

test('a tier that crashed or was slow here is not tried again: the next smaller one is', async () => {
  const { pickTier, stepDown } = await B('tiers.ts');
  const big = { webgpu: true, f16: true, memoryGB: 8, maxBufferBytes: 4 * GB };
  assert.equal(pickTier({ ...big, failed: ['L'] }).id, 'M');
  assert.equal(pickTier({ ...big, failed: ['L', 'M'] }).id, 'S');
  assert.equal(pickTier({ ...big, failed: ['L', 'M', 'S'] }), null);
  assert.deepEqual([stepDown('L'), stepDown('M'), stepDown('S')], ['M', 'S', null]);
});

test('every tier is an official Qwen3.5 ONNX export with 4-bit builds', async () => {
  const { TIERS } = await B('tiers.ts');
  for (const t of Object.values(TIERS)) {
    assert.match(t.model, /^onnx-community\/Qwen3\.5-(0\.8B-Text-ONNX|2B-ONNX-OPT|4B-ONNX-OPT)$/);
    assert.equal(t.dtypeF16, 'q4f16');
    assert.equal(t.dtypePlain, 'q4');
  }
  assert.ok(TIERS.S.mb < TIERS.M.mb && TIERS.M.mb < TIERS.L.mb);
});

test('the size shown is the one this device will download', async () => {
  const { TIERS, downloadMb, dtypeFor } = await B('tiers.ts');
  assert.equal(downloadMb(TIERS.S, { f16: true }), 470);
  assert.equal(downloadMb(TIERS.S, { f16: false }), 550, 'no fp16: the plain 4-bit build');
  assert.equal(dtypeFor(TIERS.S, { f16: true }), 'q4f16');
  assert.equal(dtypeFor(TIERS.S, { f16: false }), 'q4');
});

test('the speed test leaves out the warm-up; students are told plainly why the server answers', async () => {
  const { tokensPerSec, unsupportedWhy } = await B('tiers.ts');
  assert.equal(tokensPerSec({ tokens: 33, ms: 4000 }), 8);
  assert.equal(tokensPerSec({ tokens: 1, ms: 0 }), 0);
  assert.match(unsupportedWhy({ ios: true, webgpu: true, f16: true }), /iPhone and iPad/);
  assert.match(unsupportedWhy({ webgpu: false, f16: false }), /graphics chip/);
  assert.match(unsupportedWhy({ webgpu: true, f16: true, failed: ['S'] }), /too slow or couldn’t start/);
  assert.match(unsupportedWhy({ webgpu: true, f16: false, memoryGB: 2 }), /too little memory/);
});

test('device replies are cleaned for speech like the server’s', async () => {
  const { spoken } = await B('spoken.ts');
  assert.equal(spoken('<think>hmm</think>**Binary search** halves the range.'), 'Binary search halves the range.');
  assert.ok(!spoken('Use this:\n```py\nprint(1)\n```\nDone.').includes('print'), 'code is never read aloud');
  for (const s of ['Hello `mid` there', '# Title\n- point', 'Use this:\n```py\nprint(1)\n```\nDone.']) assert.equal(spoken(s), G.spoken(s), s);
});

test('the server hands a turn to the device only when nothing in it must stay hidden', () => {
  assert.equal(G.localAllowed({ kind: 'ask', unsolved: false }), true);
  assert.equal(G.localAllowed({ kind: 'ask', unsolved: true }), false, 'an unsolved question’s answer never leaves the server');
  assert.equal(G.localAllowed({ kind: 'say', say: 'Test chal raha hai' }), false);
});

test('every device combination: never a failed tier, iOS always the server, more memory or GPU never a smaller tier', async (t) => {
  const { pickTier } = await B('tiers.ts');
  const RANK = { null: 0, S: 1, M: 2, L: 3 };
  const tier = (d) => pickTier(d)?.id ?? null;
  const MEM = [undefined, 0.5, 1, 2, 4, 8];
  const BUF = [undefined, 0.25 * GB, 0.5 * GB, 1 * GB, 2 * GB, 4 * GB];
  const FAILED = [[], ['L'], ['M'], ['S'], ['L', 'M'], ['L', 'S'], ['M', 'S'], ['L', 'M', 'S']];
  let n = 0;
  for (const webgpu of [false, true]) for (const f16 of [false, true]) for (const memoryGB of MEM) for (const maxBufferBytes of BUF) for (const failed of FAILED) for (const ios of [false, true]) {
    const d = { webgpu, f16: webgpu && f16, memoryGB, maxBufferBytes, failed, ios };
    const got = tier(d);
    n++;
    if (ios) assert.equal(got, null, JSON.stringify(d));
    if (!webgpu) assert.equal(got, null, 'no GPU: the server');
    if (got) assert.ok(!failed.includes(got), `failed tier offered: ${JSON.stringify(d)}`);
    // More memory never gives a smaller tier (same GPU, same failures).
    const more = MEM[MEM.indexOf(memoryGB) + 1];
    if (more !== undefined && memoryGB !== undefined) assert.ok(RANK[tier({ ...d, memoryGB: more })] >= RANK[got], `memory ${memoryGB}→${more}: ${JSON.stringify(d)}`);
    // A bigger GPU buffer never gives a smaller tier.
    const bigger = BUF[BUF.indexOf(maxBufferBytes) + 1];
    if (bigger !== undefined && maxBufferBytes !== undefined) assert.ok(RANK[tier({ ...d, maxBufferBytes: bigger })] >= RANK[got], `buffer: ${JSON.stringify(d)}`);
    // fp16 never gives a smaller tier than without it.
    if (webgpu && !f16) assert.ok(RANK[tier({ ...d, f16: true })] >= RANK[got], `fp16: ${JSON.stringify(d)}`);
  }
  t.diagnostic(`device combinations: ${n}`);
});
