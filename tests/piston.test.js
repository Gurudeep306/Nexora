// JUDGE_MODE=piston: language mapping, response parsing and the fallback to
// the public sandboxes — with fetch mocked, no Piston needed.
const test = require('node:test');
const assert = require('node:assert/strict');

const piston = require('../src/piston');
const { LANG_CONFIG } = require('../src/judge');

const ENV = { JUDGE_MODE: 'piston', PISTON_URL: 'http://127.0.0.1:2000/' };

function mockFetch(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = typeof reply === 'function' ? reply(calls.at(-1)) : reply;
    if (r instanceof Error) throw r;
    return {
      ok: (r.status || 200) < 400,
      status: r.status || 200,
      json: async () => r.body,
    };
  };
  return { fetchImpl, calls };
}

test('every mapped language exists in the app, with a file name', () => {
  for (const [lang, p] of Object.entries(piston.PISTON_MAP)) {
    assert.ok(LANG_CONFIG[lang], `${lang} is not an app language`);
    assert.ok(p.language && p.file, lang);
  }
  assert.equal(piston.PISTON_MAP.cpp.language, 'c++');
  assert.equal(piston.PISTON_MAP.shell.language, 'bash');
  assert.equal(piston.PISTON_MAP.java.file, 'Main.java');
});

test('mode + PISTON_LANGUAGES gate which languages use Piston', () => {
  assert.equal(piston.usesPiston('python', {}), false);
  assert.equal(piston.usesPiston('python', { JUDGE_MODE: 'remote' }), false);
  assert.equal(piston.usesPiston('python', ENV), true);
  assert.equal(piston.usesPiston('objectivec', ENV), false, 'no Piston runtime');
  const only = { ...ENV, PISTON_LANGUAGES: 'cpp, python' };
  assert.deepEqual(piston.pistonLanguages(only), ['cpp', 'python']);
  assert.equal(piston.usesPiston('java', only), false);
  assert.equal(piston.pistonUrl(ENV), 'http://127.0.0.1:2000');
});

test('request body', () => {
  const b = piston.buildPistonRequest('print(1)', '5\n', 'python', ENV);
  assert.deepEqual(b.files, [{ name: 'main.py', content: 'print(1)' }]);
  assert.equal(b.language, 'python');
  assert.equal(b.version, '*');
  assert.equal(b.stdin, '5\n');
  assert.equal(b.run_timeout, 10000);
  assert.equal(piston.buildPistonRequest('x', '', 'nope', ENV), null);
});

test('classify: accepted, CE, RE, TLE, internal error', () => {
  const ok = piston.classifyPiston({ run: { stdout: '42\n', stderr: '', code: 0, signal: null, wall_time: 12 } }, 30);
  assert.deepEqual(ok, { stdout: '42', stderr: '', exitCode: 0, timeMs: 12, verdict: null, engine: 'piston' });

  const ce = piston.classifyPiston({
    compile: { stdout: '', stderr: 'main.cpp:1: error: expected ;', code: 1, signal: null },
    run: { stdout: '', stderr: '', code: null, signal: null },
  });
  assert.equal(ce.verdict, 'CE');
  assert.match(ce.stderr, /expected ;/);

  const re = piston.classifyPiston({ run: { stdout: 'partial', stderr: 'Traceback: boom', code: 1, signal: null } });
  assert.equal(re.verdict, 'RE');
  assert.equal(re.stdout, 'partial');
  assert.equal(re.exitCode, 1);

  const seg = piston.classifyPiston({ run: { stdout: '', stderr: '', code: null, signal: 'SIGSEGV', status: 'SG' } });
  assert.equal(seg.verdict, 'RE');
  assert.match(seg.stderr, /SIGSEGV/);

  assert.equal(piston.classifyPiston({ run: { stdout: '', stderr: '', code: null, signal: 'SIGKILL', status: 'TO' } }).verdict, 'TLE');
  assert.equal(piston.classifyPiston({ run: { stdout: '', stderr: '', code: null, signal: 'SIGKILL' } }).verdict, 'TLE');

  const xx = piston.classifyPiston({ run: { status: 'XX', message: 'box error' } });
  assert.equal(xx._pistonFailed, true);
  assert.equal(piston.classifyPiston({ message: 'weird' })._pistonFailed, true);
});

test('runPiston posts to /api/v2/execute and parses the reply', async () => {
  const { fetchImpl, calls } = mockFetch({ body: { language: 'python', version: '3.12.0', run: { stdout: '3\n', stderr: '', code: 0, signal: null } } });
  const r = await piston.runPiston('print(1+2)', '', 'python', { env: ENV, fetchImpl });
  assert.equal(calls[0].url, 'http://127.0.0.1:2000/api/v2/execute');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].body.language, 'python');
  assert.equal(r.verdict, null);
  assert.equal(r.stdout, '3');
  assert.equal(r.engine, 'piston');
});

test('runPiston flags unknown runtime / network errors for fallback', async () => {
  const unknown = mockFetch({ status: 400, body: { message: 'rust-* runtime is unknown' } });
  const a = await piston.runPiston('fn main(){}', '', 'rust', { env: ENV, fetchImpl: unknown.fetchImpl });
  assert.equal(a._pistonFailed, true);
  assert.match(a.stderr, /runtime is unknown/);

  const down = mockFetch(new Error('connect ECONNREFUSED 127.0.0.1:2000'));
  const b = await piston.runPiston('x', '', 'python', { env: ENV, fetchImpl: down.fetchImpl });
  assert.equal(b._pistonFailed, true);
  assert.match(b.stderr, /ECONNREFUSED/);
});

test('remote-exec routes mapped languages to Piston; a dead Piston fails cleanly', async (t) => {
  const saved = { mode: process.env.JUDGE_MODE, url: process.env.PISTON_URL, fetch: globalThis.fetch };
  process.env.JUDGE_MODE = 'piston';
  process.env.PISTON_URL = 'http://127.0.0.1:1';
  const remote = require('../src/remote-exec');
  t.after(() => {
    if (saved.mode === undefined) delete process.env.JUDGE_MODE; else process.env.JUDGE_MODE = saved.mode;
    if (saved.url === undefined) delete process.env.PISTON_URL; else process.env.PISTON_URL = saved.url;
    globalThis.fetch = saved.fetch;
    remote.clearCache();
  });
  assert.equal(remote.engineFor('python'), 'piston');
  assert.equal(remote.engineFor('objectivec'), 'godbolt');
  assert.equal(remote.publicEngineFor('python'), 'wandbox');

  // Piston answers.
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ run: { stdout: 'hi\n', stderr: '', code: 0, signal: null } }) });
  const r = await remote.remoteRun('print("hi")', '', 'python', { noCache: true });
  assert.equal(r.engine, 'piston');
  assert.equal(r.stdout, 'hi');

  // Piston down and no public fallback for this language → a clean failure, not a throw.
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
  const pw = await remote.remoteRun('Write-Output 1', '', 'powershell', { noCache: true });
  assert.equal(pw.engine, 'piston');
  assert.equal(pw.verdict, 'RE');
  assert.equal(pw.exitCode, -1);
  assert.equal('_pistonFailed' in pw, false);
});
