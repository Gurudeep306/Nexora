// The remote judging strategy, with the sandbox stubbed out so no network is
// touched: every input is fired in one wave, identical inputs run once, and a
// compile error is answered without waiting on the rest.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REMOTE_PATH = require.resolve('../src/remote-exec');
const JUDGE_PATH = require.resolve('../src/judge');

/** Load judge.js against a fake sandbox that records every call. */
function judgeWithStub(handler) {
  const calls = [];
  delete require.cache[JUDGE_PATH];
  const real = require.cache[REMOTE_PATH];
  require.cache[REMOTE_PATH] = {
    id: REMOTE_PATH,
    filename: REMOTE_PATH,
    loaded: true,
    paths: [],
    path: path.dirname(REMOTE_PATH),
    exports: {
      hasRemote: () => true,
      engineFor: () => 'stub',
      clearCache: () => {},
      async remoteRun(code, input, lang) {
        calls.push({ input, lang });
        return { engine: 'stub', stdout: '', stderr: '', exitCode: 0, timeMs: 1, verdict: null, ...(await handler(input, calls.length)) };
      },
    },
  };
  process.env.JUDGE_MODE = 'remote';
  const judge = require('../src/judge');
  const restore = () => {
    if (real) require.cache[REMOTE_PATH] = real; else delete require.cache[REMOTE_PATH];
    delete require.cache[JUDGE_PATH];
    delete process.env.JUDGE_MODE;
  };
  return { judge, calls, restore };
}

const tc = (input, expected) => ({ id: input, label: input, input, expected_output: expected });

test('a compile error is answered after one compile, not after all of them', async () => {
  // Each sandbox call takes 100ms here. The old code ran the probe, waited, and
  // only then fanned out; the current code fires everything at once and answers
  // the moment the first result says the build failed.
  const { judge, restore } = judgeWithStub(async () => {
    await new Promise((r) => setTimeout(r, 100));
    return { verdict: 'CE', stderr: 'error: expected ;' };
  });
  try {
    const t0 = Date.now();
    const r = await judge.judge('bad code', ['1', '2', '3', '4', '5'].map((i) => tc(i, 'x')), 'cpp');
    const elapsed = Date.now() - t0;
    assert.equal(r.verdict, 'CE');
    assert.match(r.compileError, /expected ;/);
    assert.ok(elapsed < 1000, `answered in ${elapsed}ms — must not wait on the other compiles`);
  } finally { restore(); }
});

test('a slow language is not made twice as slow by the compile probe', async () => {
  // Four testcases, each a 120ms "compile". Serialising the probe would cost
  // two waves; one wave is the whole point.
  const { judge, restore } = judgeWithStub(async (input) => {
    await new Promise((r) => setTimeout(r, 120));
    return { stdout: input };
  });
  try {
    const t0 = Date.now();
    const r = await judge.judge('code', ['a', 'b', 'c', 'd'].map((i) => tc(i, i)), 'rust');
    const elapsed = Date.now() - t0;
    assert.equal(r.verdict, 'AC');
    assert.ok(elapsed < 1200, `took ${elapsed}ms — that is more than one wave of compiles`);
  } finally { restore(); }
});

test('identical inputs are executed once and the result shared', async () => {
  const { judge, calls, restore } = judgeWithStub(async (input) => ({ stdout: input === '1' ? 'one' : 'two' }));
  try {
    const r = await judge.judge('code', [tc('1', 'one'), tc('2', 'two'), tc('1', 'one')], 'cpp');
    assert.equal(r.verdict, 'AC');
    assert.equal(r.results.length, 3);
    assert.equal(calls.length, 2, 'the duplicate input is not run again');
    assert.ok(r.results.every((x) => x.passed));
  } finally { restore(); }
});

test('every testcase after the probe runs in parallel', async () => {
  let live = 0;
  let peak = 0;
  const { judge, calls, restore } = judgeWithStub(async () => {
    live++; peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 30));
    live--;
    return { stdout: 'x' };
  });
  try {
    const cases = ['a', 'b', 'c', 'd', 'e'].map((i) => tc(i, 'x'));
    const r = await judge.judge('code', cases, 'cpp');
    assert.equal(r.verdict, 'AC');
    assert.equal(calls.length, 5);
    assert.ok(peak >= 4, `expected the fan-out to overlap, peak concurrency was ${peak}`);
  } finally { restore(); }
});

test('results carry the sandbox that produced them and the worst verdict wins', async () => {
  const { judge, restore } = judgeWithStub(async (input) =>
    input === 'slow' ? { verdict: 'TLE', stderr: 'timed out' } : { stdout: 'ok' });
  try {
    const r = await judge.judge('code', [tc('fast', 'ok'), tc('slow', 'ok')], 'cpp');
    assert.equal(r.verdict, 'TLE');
    assert.equal(r.results[0].verdict, 'AC');
    assert.equal(r.results[1].verdict, 'TLE');
    assert.equal(r.results[0].engine, 'stub');
  } finally { restore(); }
});

test('a wrong answer is reported per testcase, not as a whole-run failure', async () => {
  const { judge, restore } = judgeWithStub(async (input) => ({ stdout: input === 'a' ? 'ok' : 'nope' }));
  try {
    const r = await judge.judge('code', [tc('a', 'ok'), tc('b', 'ok')], 'cpp');
    assert.equal(r.verdict, 'WA');
    assert.equal(r.results[0].passed, true);
    assert.equal(r.results[1].passed, false);
    assert.equal(r.results[1].actual, 'nope');
  } finally { restore(); }
});

test('judging with no testcases is a no-op, not a crash', async () => {
  const { judge, calls, restore } = judgeWithStub(async () => ({ stdout: '' }));
  try {
    const r = await judge.judge('code', [], 'cpp');
    assert.equal(r.results.length, 0);
    assert.equal(calls.length, 0);
  } finally { restore(); }
});
