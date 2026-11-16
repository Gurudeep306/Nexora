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

/* ── several of our own servers, each a backup for the others ── */
test('PISTON_URL can list several servers, with one shared or per-server tokens', () => {
  const multi = { JUDGE_MODE: 'piston', PISTON_URL: 'https://a.example/, https://b.example', PISTON_TOKEN: 'one' };
  assert.deepEqual(piston.pistonServers(multi), [
    { url: 'https://a.example', token: 'one', languages: null },
    { url: 'https://b.example', token: 'one', languages: null },
  ]);
  assert.deepEqual(piston.pistonEngines(multi), ['piston', 'piston2']);
  const own = { ...multi, PISTON_TOKEN: 'ta,tb' };
  assert.deepEqual(piston.pistonServers(own).map((s) => s.token), ['ta', 'tb']);
  assert.equal(piston.pistonIndex('piston'), 0);
  assert.equal(piston.pistonIndex('piston3'), 2);
  assert.equal(piston.pistonIndex('wandbox'), -1);
  assert.deepEqual(piston.pistonServers({ JUDGE_MODE: 'piston' }), [{ url: 'http://127.0.0.1:2000', token: '', languages: null }]);
  assert.deepEqual(piston.pistonServers({ JUDGE_MODE: 'remote', PISTON_URL: 'https://x.example' }), [], 'the environment list needs JUDGE_MODE=piston');
});

test('each server gets its own address and token', async () => {
  const env = { JUDGE_MODE: 'piston', PISTON_URL: 'https://a.example,https://b.example', PISTON_TOKEN: 'ta,tb' };
  const seen = [];
  const fetchImpl = async (url, opts) => {
    seen.push([url, opts.headers.Authorization]);
    return { ok: true, status: 200, json: async () => ({ run: { stdout: 'ok', stderr: '', code: 0, signal: null } }) };
  };
  await piston.runPiston('x', '', 'python', { env, fetchImpl, server: 1 });
  assert.deepEqual(seen, [['https://b.example/api/v2/execute', 'Bearer tb']]);
  const none = await piston.runPiston('x', '', 'python', { env, fetchImpl, server: 5 });
  assert.equal(none._pistonFailed, true);
});

test('with several servers, every one comes before the public sandboxes', () => {
  const { execFileSync } = require('node:child_process');
  const out = execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./src/remote-exec').engineChain('cpp')))"], {
    env: { ...process.env, JUDGE_MODE: 'piston', PISTON_URL: 'https://a.example,https://b.example,https://c.example', PISTON_LANGUAGES: '' },
  });
  assert.deepEqual(JSON.parse(String(out)), ['piston', 'piston2', 'piston3', 'wandbox', 'godbolt', 'paiza']);
});

test('a runtime built for another CPU passes the run on instead of blaming the code', () => {
  const r = piston.classifyPiston({ run: { stdout: '', stderr: '/piston/packages/x/run: line 3: ./a.out: cannot execute binary file: Exec format error', code: 126, signal: null } });
  assert.equal(r._pistonFailed, true);
});

test('the runner setup script installs exactly the packages the judge expects', () => {
  const fs = require('node:fs');
  const sh = fs.readFileSync(require('node:path').join(__dirname, '..', 'deploy', 'runner', 'setup.sh'), 'utf8');
  const m = /^PACKAGES="([^"]+)"/m.exec(sh);
  assert.ok(m, 'PACKAGES line present');
  assert.deepEqual(m[1].split(/\s+/), piston.PISTON_PACKAGES);
});

test('a compiler built for another CPU is not a compile error', () => {
  const r = piston.classifyPiston({ compile: { code: 126, stderr: 'g++: Exec format error', signal: null }, run: { stdout: '', stderr: '', code: 0 } });
  assert.equal(r._pistonFailed, true);
});

test('runners added by an admin join the chain, each only for the languages it has', () => {
  piston.setExtraServers(() => [
    { url: 'https://oracle.example', token: 't1', name: 'Oracle', languages: ['c++', 'gcc', 'python'] },
    { url: 'https://other.example', token: 't2', name: 'Other', languages: null },
  ]);
  try {
    const env = { JUDGE_MODE: 'remote' };
    assert.equal(piston.usesPiston('cpp', env), true);
    assert.deepEqual(piston.pistonEngines(env, 'cpp'), ['piston', 'piston2']);
    assert.deepEqual(piston.pistonEngines(env, 'haskell'), ['piston2'], 'Oracle has no Haskell; the unknown one is tried');
    const both = { JUDGE_MODE: 'piston', PISTON_URL: 'https://env.example' };
    assert.deepEqual(piston.pistonServers(both).map((s) => s.url), ['https://env.example', 'https://oracle.example', 'https://other.example']);
  } finally {
    piston.setExtraServers(null);
  }
  assert.equal(piston.usesPiston('cpp', { JUDGE_MODE: 'remote' }), false);
});

test('an admin runner\'s requests go to its own address with its own password', async () => {
  piston.setExtraServers(() => [{ url: 'https://oracle.example', token: 'secret1', languages: null }]);
  try {
    const seen = [];
    const fetchImpl = async (url, opts) => {
      seen.push([url, opts.headers.Authorization]);
      return { ok: true, status: 200, json: async () => ({ run: { stdout: '1', stderr: '', code: 0, signal: null } }) };
    };
    await piston.runPiston('print(1)', '', 'python', { env: { JUDGE_MODE: 'remote' }, fetchImpl, server: 0 });
    assert.deepEqual(seen, [['https://oracle.example/api/v2/execute', 'Bearer secret1']]);
  } finally {
    piston.setExtraServers(null);
  }
});
