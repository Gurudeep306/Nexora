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
