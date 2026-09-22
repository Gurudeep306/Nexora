// Judge wiring: language availability on the hosted (remote-only) server and
// the admin-only self-test endpoint. No network calls are made here.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

test('remote-only mode exposes only languages that have a sandbox', () => {
  const env = { ...process.env, JUDGE_MODE: 'remote' };
  const out = require('node:child_process').execFileSync(
    process.execPath,
    ['-e', "const j=require('./src/judge');console.log(JSON.stringify(Object.keys(j.LANG_CONFIG).filter(j.hasRemote)))"],
    { env },
  );
  const langs = JSON.parse(String(out));
  for (const l of ['cpp', 'c', 'python', 'java', 'javascript', 'typescript', 'kotlin', 'swift', 'go', 'rust', 'haskell', 'dart'])
    assert.ok(langs.includes(l), `${l} should run remotely`);
  for (const l of ['elixir', 'powershell', 'tcl']) assert.ok(!langs.includes(l), `${l} has no working sandbox`);
});

let proc;
let base;
test.before(async () => {
  const port = 4100 + Math.floor(Math.random() * 300);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'remote' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server not ready');
});
test.after(() => proc?.kill('SIGKILL'));

test('/api/languages flags unavailable languages', async () => {
  const langs = await (await fetch(`${base}/api/languages`)).json();
  const by = Object.fromEntries(langs.map((l) => [l.id, l]));
  assert.equal(by.cpp.available, true);
  assert.equal(by.elixir.available, false);
  assert.equal(by.swift.available, true);
});

test('judge self-test is admin only', async () => {
  const r = await fetch(`${base}/api/admin/judge-selftest`);
  assert.equal(r.status, 403);
});

/* ── output comparison & verdict rollup (no network) ── */
const judgeMod = require('../src/judge');

test('output comparison tolerates CRLF, trailing blanks and a final newline', () => {
  const { compareOutput } = judgeMod;
  assert.ok(compareOutput('6\n', '6'));
  assert.ok(compareOutput('1 2\r\n3 4\r\n', '1 2\n3 4'));
  assert.ok(compareOutput('hi   \n', 'hi'));
  assert.ok(compareOutput('a\nb\n\n\n', 'a\nb'));
  assert.ok(!compareOutput('6', '7'));
  assert.ok(!compareOutput('a b', 'ab'), 'inner spacing still matters');
});

test('the worst verdict wins the rollup', () => {
  const { overallVerdict } = judgeMod;
  assert.equal(overallVerdict([{ passed: true, verdict: 'AC' }, { passed: true, verdict: 'AC' }]), 'AC');
  assert.equal(overallVerdict([{ passed: true, verdict: 'AC' }, { passed: false, verdict: 'WA' }]), 'WA');
  assert.equal(overallVerdict([{ passed: false, verdict: 'WA' }, { passed: false, verdict: 'TLE' }]), 'TLE');
  assert.equal(overallVerdict([{ passed: false, verdict: 'RE' }, { passed: false, verdict: 'WA' }]), 'RE');
});

test('every runnable language is routed to a named sandbox', () => {
  const { LANG_CONFIG, hasRemote, engineFor } = judgeMod;
  for (const lang of Object.keys(LANG_CONFIG)) {
    if (!hasRemote(lang)) continue;
    assert.ok(['wandbox', 'godbolt', 'kotlin'].includes(engineFor(lang)), `${lang} -> ${engineFor(lang)}`);
  }
  assert.equal(engineFor('kotlin'), 'kotlin');
  assert.equal(engineFor('swift'), 'godbolt');
  assert.equal(engineFor('cpp'), 'wandbox');
  assert.equal(engineFor('tcl'), null);
});

test('Kotlin stdin shim lands after the imports', () => {
  const { injectKotlinStdin } = require('../src/remote-exec');
  const out = injectKotlinStdin('import java.util.*\n\nfun main(){ println(readln()) }', 'hi\n');
  const lines = out.split('\n');
  const importAt = lines.findIndex((l) => l.startsWith('import '));
  const shimAt = lines.findIndex((l) => l.includes('__nxIn'));
  assert.ok(importAt >= 0 && shimAt > importAt, 'Kotlin rejects imports after a declaration');
  assert.ok(out.includes('"hi\\n"'), 'the stdin literal is embedded');
});
