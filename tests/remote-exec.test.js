// Verdict classification for the three sandboxes, pinned against real API
// responses captured from wandbox.org, api.kotlinlang.org and godbolt.org.
// Every payload below is verbatim — these are the shapes that used to be
// misread as the wrong verdict.
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyWandbox, classifyKotlin, classifyGodbolt, engineFor, hasRemote, injectKotlinStdin } = require('../src/remote-exec');

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

test('each language is routed to exactly one sandbox', () => {
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
