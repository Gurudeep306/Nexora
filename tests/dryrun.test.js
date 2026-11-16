// Dry run: the Python tracer records the real run, step by step, and the
// trace is split cleanly from the program's own output and errors.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { wrapPython } = require('../src/dryrun/python');
const { parseTrace, dryRun, supported } = require('../src/dryrun');

function runPy(code, input) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-dry-'));
  const file = path.join(dir, 'main.py');
  fs.writeFileSync(file, wrapPython(code));
  const r = spawnSync('python3', [file], { input, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}

test('the tracer keeps stdout as the program wrote it', () => {
  const r = runPy('n = int(input())\nprint(n * 2)\n', '21\n');
  assert.equal(r.stdout, '42\n');
  const { events, errors } = parseTrace(r.stderr);
  assert.equal(errors, '');
  assert.ok(events.length >= 3);
});

test('each step records the line that ran and the values that changed', () => {
  const code = 'a = [3, 1, 2]\nfor i in range(len(a) - 1):\n    if a[i] > a[i + 1]:\n        a[i], a[i + 1] = a[i + 1], a[i]\nprint(a)\n';
  const { events } = parseTrace(runPy(code, '').stderr);
  const lines = events.filter((e) => e.e === 'line');
  assert.deepEqual(lines[0].v.a, { t: 'list', n: 3, i: [3, 1, 2] });
  const swap = lines.find((e) => e.l === 4 && e.v && e.v.a);
  assert.deepEqual(swap.v.a.i, [1, 3, 2], 'the swap is recorded after line 4 runs');
  const out = lines.find((e) => e.l === 5);
  assert.equal(out.o, '[1, 2, 3]\n'.length, 'output length after print');
});

test('calls, depth, return values and objects are recorded', () => {
  const code = 'class Node:\n    def __init__(self, v):\n        self.v = v\n        self.next = None\n\ndef f(n):\n    return 1 if n < 2 else n * f(n - 1)\n\nh = Node(5)\nh.next = Node(6)\nprint(f(3))\n';
  const { events } = parseTrace(runPy(code, '').stderr);
  const calls = events.filter((e) => e.e === 'call');
  assert.deepEqual(calls.map((c) => c.f), ['main', 'Node()', 'Node()', 'f', 'f', 'f']);
  assert.deepEqual(calls.filter((c) => c.f === 'f').map((c) => c.d), [1, 2, 3]);
  assert.equal(new Set(calls.map((c) => c.k)).size, calls.length, 'every call has its own id');
  const rets = events.filter((e) => e.e === 'ret' && 'r' in e).map((e) => e.r);
  assert.deepEqual(rets.slice(0, 3), [1, 2, 6]);
  const linked = events.find((e) => e.h && Object.values(e.h).some((o) => o.f && o.f.next && o.f.next.t === 'ref'));
  assert.ok(linked, 'head.next points at the second node');
});

test('an error is recorded at its line, and the traceback names the student\'s code', () => {
  const r = runPy('x = 1\ny = x / 0\n', '');
  const { events, errors } = parseTrace(r.stderr);
  const exc = events.find((e) => e.e === 'exc');
  assert.equal(exc.l, 2);
  assert.match(exc.m, /ZeroDivisionError/);
  assert.match(errors, /your code, line 2/);
  assert.ok(!/_tr|_emit|<nx>/.test(errors), 'no tracer internals in the error');
});

test('a very long run stops tracing at the cap but still finishes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-dry-'));
  const file = path.join(dir, 'main.py');
  fs.writeFileSync(file, wrapPython('s = 0\nfor i in range(100000):\n    s += i\nprint(s)\n', { maxEvents: 50 }));
  const r = spawnSync('python3', [file], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.stdout.trim(), String((99999 * 100000) / 2));
  const t = parseTrace(r.stderr);
  assert.equal(t.capped, true);
  assert.ok(t.events.length <= 50);
});

test('dryRun reports unsupported languages honestly and passes the run through', async () => {
  assert.equal(supported('python'), true);
  const none = await dryRun('x', 'tcl', '', async () => assert.fail('must not run'));
  assert.equal(none.supported, false);
  const r = await dryRun('print(1)', 'python', '', async (code, input, lang) => {
    assert.equal(lang, 'python');
    assert.match(code, /settrace/);
    return { ok: true, verdict: 'OK', output: '1\n', stderr: '\u001eNXT {"e":"line","l":1,"k":1,"o":2}\nwarning: x\n', timeMs: 5, engine: 'godbolt' };
  });
  assert.equal(r.ok, true);
  assert.equal(r.events.length, 1);
  assert.equal(r.stderr, 'warning: x');
  assert.equal(r.stdout, '1\n');
});
