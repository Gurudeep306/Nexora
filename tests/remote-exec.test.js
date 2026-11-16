// Verdict classification for the three sandboxes, pinned against real API
// responses captured from wandbox.org, api.kotlinlang.org and godbolt.org.
// Every payload below is verbatim — these are the shapes that used to be
// misread as the wrong verdict.
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyWandbox, classifyKotlin, classifyGodbolt, classifyPaiza, engineFor, hasRemote, injectKotlinStdin, engineChain, orderByHealth, markFailed, markHealthy, resetHealth, runChain } = require('../src/remote-exec');

/* ────────────────────────── Wandbox ────────────────────────── */

test('Wandbox: a -Wall warning is not a compile error', () => {
  // Captured: gcc-13.2.0, a program with an unused variable that still prints 15.
  const r = classifyWandbox({
    status: '0', signal: '',
    compiler_error: "prog.cc:3:16: warning: unused variable 'unused' [-Wunused-variable]\n",
    compiler_message: "prog.cc:3:16: warning: unused variable 'unused'\n",
    program_output: '15\n', program_error: '', program_message: '15\n',
  }, 10);
  assert.equal(r.verdict, null);
  assert.equal(r.stdout, '15');
});

test('Wandbox: a real compile error is CE, not a blank runtime error', () => {
  // Captured: the failure case still returns program_output/error/message as
  // empty strings, so their presence cannot be used to prove the code ran.
  const r = classifyWandbox({
    status: '1', signal: '',
    compiler_error: "prog.cc:1:13: error: invalid use of 'this' in non-member function\n",
    compiler_message: "prog.cc:1:13: error: invalid use of 'this' in non-member function\n",
    program_output: '', program_error: '', program_message: '',
  }, 10);
  assert.equal(r.verdict, 'CE');
  assert.match(r.stderr, /invalid use of 'this'/);
});

test('Wandbox: a non-zero exit from a program that ran is RE', () => {
  const r = classifyWandbox({
    status: '1', signal: '', compiler_error: '',
    program_output: 'partial', program_error: 'terminate called', program_message: 'partial',
  }, 10);
  assert.equal(r.verdict, 'RE');
  assert.equal(r.stdout, 'partial');
  assert.equal(r.exitCode, 1);
});

test('Wandbox: a signal is a crash, even with an empty stderr', () => {
  const r = classifyWandbox({
    status: '', signal: 'Segmentation fault', compiler_error: '',
    program_output: '', program_error: '', program_message: '',
  }, 10);
  assert.equal(r.verdict, 'RE');
  assert.match(r.stderr, /Segmentation fault/);
});

test('Wandbox: a clean silent program is a pass, not a failure', () => {
  const r = classifyWandbox({
    status: '0', signal: '', compiler_error: '',
    program_output: '', program_error: '', program_message: '',
  }, 10);
  assert.equal(r.verdict, null);
});

/* ────────────────────────── Kotlin Playground ────────────────────────── */

test('Kotlin: a WARNING in `errors` does not fail the program', () => {
  // Captured: "Variable is unused" comes back in `errors` alongside real output.
  const r = classifyKotlin({
    errors: { 'File.kt': [{ message: 'Variable is unused.', severity: 'WARNING', className: 'WARNING' }] },
    exception: null,
    text: '<outStream>hi\n</outStream>',
  }, 10);
  assert.equal(r.verdict, null, 'a warning must not be reported as a compile error');
  assert.equal(r.stdout, 'hi');
});

test('Kotlin: severity ERROR is a compile error', () => {
  const r = classifyKotlin({
    errors: { 'File.kt': [
      { message: "'this' is not defined in this context.", severity: 'ERROR' },
      { message: "Unresolved reference 'not'.", severity: 'ERROR' },
    ] },
    exception: null, text: '',
  }, 10);
  assert.equal(r.verdict, 'CE');
  assert.match(r.stderr, /Unresolved reference/);
});

test('Kotlin: an uncaught exception is a runtime error', () => {
  const r = classifyKotlin({
    errors: { 'File.kt': [] },
    exception: { fullName: 'java.lang.ArithmeticException', message: '/ by zero' },
    text: '<outStream>before\n</outStream>',
  }, 10);
  assert.equal(r.verdict, 'RE');
  assert.match(r.stderr, /ArithmeticException/);
});

test('Kotlin: stdout and stderr streams are separated', () => {
  const r = classifyKotlin({
    errors: {}, exception: null,
    text: '<outStream>out\n</outStream><errStream>err\n</errStream>',
  }, 10);
  assert.equal(r.stdout, 'out');
  assert.equal(r.stderr, 'err');
});

/* ────────────────────────── Compiler Explorer ────────────────────────── */

test('Compiler Explorer: a successful run reports the program time, not the round trip', () => {
  // Captured: swift633 executing with stdin.
  const r = classifyGodbolt({
    code: 0, timedOut: false, didExecute: true, execTime: 39,
    stdout: [{ text: '15' }], stderr: [],
    buildResult: { code: 0, stdout: [], stderr: [], execTime: 4353 },
  }, 5200);
  assert.equal(r.verdict, null);
  assert.equal(r.stdout, '15');
  assert.equal(r.timeMs, 39, 'the 4.3s cold compile must not be charged to the program');
});

test('Compiler Explorer: a build failure is CE with the ANSI colours stripped', () => {
  const r = classifyGodbolt({
    didExecute: false, code: 1,
    stdout: [], stderr: [{ text: 'Build failed' }],
    buildResult: { code: 1, stderr: [{ text: '\x1b[31merror: cannot find \'foo\'\x1b[0m' }] },
  }, 100);
  assert.equal(r.verdict, 'CE');
  assert.equal(r.stderr, "error: cannot find 'foo'");
});

test('Compiler Explorer: timedOut is a TLE and a non-zero exit is an RE', () => {
  assert.equal(classifyGodbolt({ didExecute: true, timedOut: true, code: 0, stdout: [], stderr: [] }, 1).verdict, 'TLE');
  assert.equal(classifyGodbolt({ didExecute: true, timedOut: false, code: 134, stdout: [], stderr: [] }, 1).verdict, 'RE');
});

/* ────────────────────────── routing ────────────────────────── */

test('each language starts on its primary sandbox', () => {
  assert.equal(engineFor('cpp'), 'wandbox');
  assert.equal(engineFor('kotlin'), 'kotlin');
  assert.equal(engineFor('swift'), 'godbolt');
  assert.equal(engineFor('nope'), null);
  assert.equal(hasRemote('nope'), false);
  assert.equal(hasRemote('haskell'), true);
});

test('the Kotlin stdin shim escapes dollar signs so templates do not expand', () => {
  const out = injectKotlinStdin('fun main(){}', 'a$b\n');
  assert.ok(out.includes('${"$"}'), 'a raw $ would be read as a string template');
});

test('a Wandbox container failure is a transient sandbox fault, not a compile error', () => {
  const r = classifyWandbox({
    compiler_error: 'Error: OCI runtime error: crun: clone: Resource temporarily unavailable',
    program_output: '', program_error: '', program_message: '', status: '1',
  }, 12);
  assert.equal(r._transient, true);
  assert.equal(r.exitCode, -1, 'marked as our failure, so it is never cached');
  assert.notEqual(r.verdict, 'CE');
  assert.match(r.stderr, /not a problem with your code/);
});

test('a real compile error stays a compile error', () => {
  const r = classifyWandbox({
    compiler_error: "prog.cc:1:1: error: expected ';' before '}' token",
    program_output: '', program_error: '', program_message: '', status: '1',
  }, 12);
  assert.equal(r.verdict, 'CE');
  assert.ok(!r._transient);
});

/* ────────────────────────── backups and failover ────────────────────────── */

test('Paiza.io: shapes captured from api.paiza.io become the right verdicts', () => {
  // Captured (Nov 2026): a clean python3 run.
  const ok = classifyPaiza({ status: 'completed', build_result: null, stdout: '42\n', stderr: '', exit_code: '0', time: '0.01', result: 'success' }, 900);
  assert.equal(ok.verdict, null);
  assert.equal(ok.stdout, '42');
  assert.equal(ok.timeMs, 10, 'the program\'s own time, not the round trip');
  // A C++ build failure.
  const ce = classifyPaiza({ status: 'completed', build_result: 'failure', build_stderr: "Main.cpp:1:20: error: use of undeclared identifier 'x'", stdout: '', exit_code: '1', result: null }, 900);
  assert.equal(ce.verdict, 'CE');
  assert.match(ce.stderr, /undeclared identifier/);
  // An endless loop.
  assert.equal(classifyPaiza({ status: 'completed', build_result: 'success', stdout: '', stderr: '', exit_code: '137', result: 'timeout' }, 3000).verdict, 'TLE');
  // A crash with an empty stderr still says what happened.
  const re = classifyPaiza({ status: 'completed', build_result: 'success', stdout: '', stderr: '', exit_code: '1', result: 'failure' }, 2000);
  assert.equal(re.verdict, 'RE');
  assert.match(re.stderr, /code 1/);
});

test('every common language has at least two independent sandboxes', () => {
  for (const lang of ['cpp', 'c', 'python', 'java', 'javascript', 'typescript', 'go', 'rust', 'kotlin', 'csharp', 'ruby', 'php', 'swift', 'haskell', 'scala']) {
    const chain = engineChain(lang);
    assert.ok(chain.length >= 2, `${lang} has only ${chain.join(', ')}`);
    assert.equal(new Set(chain).size, chain.length, `${lang} lists a sandbox twice`);
  }
  assert.deepEqual(engineChain('cpp'), ['wandbox', 'godbolt', 'paiza']);
  assert.deepEqual(engineChain('elixir'), ['paiza'], 'Elixir runs on Paiza, the one free runner for it');
  assert.deepEqual(engineChain('tcl'), []);
});

test('a sandbox that just failed is tried last, then forgiven', () => {
  resetHealth();
  const now = 1_000_000;
  markFailed('wandbox', now);
  assert.deepEqual(orderByHealth(['wandbox', 'godbolt', 'paiza'], now + 1000), ['godbolt', 'paiza', 'wandbox']);
  assert.deepEqual(orderByHealth(['wandbox', 'godbolt', 'paiza'], now + 31_000), ['wandbox', 'godbolt', 'paiza'], 'back after 30s');
  markFailed('wandbox', now);
  markFailed('wandbox', now);
  assert.deepEqual(orderByHealth(['wandbox', 'godbolt'], now + 100_000), ['godbolt', 'wandbox'], 'the rest doubles while it keeps failing');
  markHealthy('wandbox');
  assert.deepEqual(orderByHealth(['wandbox', 'godbolt'], now), ['wandbox', 'godbolt']);
  resetHealth();
});

test('a busy sandbox moves the run to the next one at once', async () => {
  resetHealth();
  const tried = [];
  const run = async (code, input, lang, engine) => {
    tried.push(engine);
    if (engine === 'wandbox') return { stdout: '', stderr: 'overloaded', exitCode: -1, timeMs: 5, verdict: 'RE', engine, _transient: true };
    return { stdout: '15', stderr: '', exitCode: 0, timeMs: 5, verdict: null, engine };
  };
  const r = await runChain('x', '', 'cpp', ['wandbox', 'godbolt', 'paiza'], Date.now() + 10_000, run, 0);
  assert.equal(r.stdout, '15');
  assert.equal(r.engine, 'godbolt');
  assert.deepEqual(tried, ['wandbox', 'godbolt']);
  // The next run skips the sandbox that just failed.
  tried.length = 0;
  await runChain('y', '', 'cpp', ['wandbox', 'godbolt', 'paiza'], Date.now() + 10_000, run, 0);
  assert.deepEqual(tried, ['godbolt']);
  resetHealth();
});

test('a sandbox that never answers hands the run on; the last one decides', async () => {
  resetHealth();
  const run = async (code, input, lang, engine) =>
    engine === 'wandbox'
      ? { stdout: '', stderr: 'no answer', exitCode: -1, timeMs: 25_000, verdict: 'TLE', engine, _noAnswer: true }
      : { stdout: '', stderr: 'Killed', exitCode: -1, timeMs: 2000, verdict: 'TLE', engine };
  const r = await runChain('loop', '', 'cpp', ['wandbox', 'godbolt'], Date.now() + 10_000, run, 0);
  assert.equal(r.verdict, 'TLE');
  assert.equal(r.engine, 'godbolt', 'the real time-limit verdict comes from a sandbox that ran the program');
  resetHealth();
});

test('a real verdict about the code is never retried elsewhere', async () => {
  resetHealth();
  const tried = [];
  const run = async (code, input, lang, engine) => {
    tried.push(engine);
    return { stdout: '', stderr: "error: expected ';'", exitCode: 1, timeMs: 5, verdict: 'CE', engine };
  };
  const r = await runChain('bad', '', 'cpp', ['wandbox', 'godbolt', 'paiza'], Date.now() + 10_000, run, 0);
  assert.equal(r.verdict, 'CE');
  assert.deepEqual(tried, ['wandbox']);
  resetHealth();
});

test('when every sandbox is down the student is told plainly, never a fake verdict', async () => {
  resetHealth();
  const run = async (code, input, lang, engine) => ({ stdout: '', stderr: 'HTTP 503', exitCode: -1, timeMs: 5, verdict: 'RE', engine, _transient: true });
  const r = await runChain('x', '', 'cpp', ['wandbox', 'godbolt', 'paiza'], Date.now() + 10_000, run, 0);
  assert.equal(r.exitCode, -1, 'our failure: never cached');
  assert.match(r.stderr, /not a problem with your code/);
  assert.notEqual(r.verdict, 'CE');
  assert.notEqual(r.verdict, 'WA');
  resetHealth();
});
