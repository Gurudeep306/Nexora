// Judge0 runners (src/judge0.js) and the dry run's per-runner trace size
// (src/dryrun/index.js). No network: fetch is faked.
const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../src/judge0');
const { withBudget, forRunner, TRACERS, BUDGET_LINE, TRACE_BYTES } = require('../src/dryrun');

const b64 = (s) => Buffer.from(s).toString('base64');
const LANGS = [
  { id: 50, name: 'C (GCC 9.2.0)' },
  { id: 103, name: 'C (GCC 14.1.0)' },
  { id: 54, name: 'C++ (GCC 9.2.0)' },
  { id: 105, name: 'C++ (GCC 14.1.0)' },
  { id: 71, name: 'Python (3.8.1)' },
  { id: 100, name: 'Python (3.12.5)' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)' },
  { id: 91, name: 'Java (JDK 17.0.6)' },
  { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
  { id: 51, name: 'C# (Mono 6.6.0.161)' },
  { id: 60, name: 'Go (1.13.5)' },
  { id: 9999, name: 'Brainfuck (whatever)' },
];

test('Judge0 languages: each of ours maps to its newest matching version', () => {
  const m = J.languageMap(LANGS);
  assert.equal(m.cpp.id, 105);
  assert.equal(m.c.id, 103);
  assert.equal(m.python.id, 100);
  assert.equal(m.java.id, 91);
  assert.equal(m.javascript.id, 63);
  assert.equal(m.csharp.id, 51);
  assert.equal(m.go.id, 60);
  assert.equal(m.rust, undefined, 'a language the server lacks is left out');
});

test('Judge0 auth: RapidAPI gets its own headers; a self-hosted server gets X-Auth-Token', () => {
  const r = J.headersFor('https://judge0-ce.p.rapidapi.com', 'k1');
  assert.equal(r['X-RapidAPI-Key'], 'k1');
  assert.equal(r['X-RapidAPI-Host'], 'judge0-ce.p.rapidapi.com');
  const s = J.headersFor('https://judge.example.org', 'k2');
  assert.equal(s['X-Auth-Token'], 'k2');
  assert.equal(J.headersFor('https://judge.example.org', '')['X-Auth-Token'], undefined);
});

test('Judge0 results: accepted, compile error, time limit, runtime error; its own faults move on', () => {
  const ok = J.classifyJudge0({ status: { id: 3 }, stdout: b64('15\n'), time: '0.012' });
  assert.equal(ok.verdict, null);
  assert.equal(ok.stdout, '15');
  assert.equal(ok.timeMs, 12);
  const ce = J.classifyJudge0({ status: { id: 6 }, compile_output: b64('main.cpp:3: error: x') });
  assert.equal(ce.verdict, 'CE');
  assert.match(ce.stderr, /error: x/);
  assert.equal(J.classifyJudge0({ status: { id: 5 } }).verdict, 'TLE');
  const re = J.classifyJudge0({ status: { id: 11, description: 'Runtime Error (NZEC)' }, stderr: b64('Traceback…'), exit_code: 1 });
  assert.equal(re.verdict, 'RE');
  assert.match(re.stderr, /Traceback/);
  assert.equal(J.classifyJudge0({ status: { id: 13, description: 'Internal Error' } })._judge0Failed, true, 'the runner’s fault, not the student’s');
});

test('Judge0 runner: tested on save, then first in the chain for the languages it has', async () => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push([url, opts.method || 'GET', opts.headers]);
    if (url.endsWith('/languages')) return { ok: true, status: 200, json: async () => LANGS };
    const body = JSON.parse(opts.body);
    assert.equal(Buffer.from(body.source_code, 'base64').toString(), 'print(6*7)');
    return { ok: true, status: 200, json: async () => ({ status: { id: 3 }, stdout: b64('42\n') }) };
  };
  const t = await J.testJudge0('https://judge.example.org', 'tok', { fetchImpl });
  assert.equal(t.ok, true);
  assert.ok(t.languages.includes('cpp'));
  assert.equal(calls[0][2]['X-Auth-Token'], 'tok');

  const R = require('../src/remote-exec');
  J.setServers(() => [{ url: 'https://judge.example.org', token: 'tok', name: 'J', map: t.map }]);
  try {
    assert.equal(R.engineChain('cpp')[0], 'judge0', 'our own runner goes before the public ones');
    assert.ok(!R.engineChain('rust').includes('judge0'), 'only for the languages it has');
    const run = await J.runJudge0('print(1)', '', 'python', {
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: { id: 3 }, stdout: b64('1') }) }),
    });
    assert.equal(run.stdout, '1');
    const busy = await J.runJudge0('print(1)', '', 'python', { fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
    assert.equal(busy._judge0Failed, true, 'a used-up plan lets the next runner take it');
  } finally {
    J.setServers(() => []);
  }
});

test('Judge0 test: a refused key and a server without our languages are said plainly', async () => {
  const refused = await J.testJudge0('https://judge.example.org', 'bad', { fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  assert.equal(refused.error, 'The key was refused');
  const none = await J.testJudge0('https://judge.example.org', '', { fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ id: 1, name: 'Brainfuck' }] }) });
  assert.match(none.error, /None of our languages/);
});

test('dry run: each runner gets a trace sized to its output limit, in every language', async () => {
  const samples = {
    python: 'print(1)',
    cpp: 'int main(){}',
    c: 'int main(void){return 0;}',
    java: 'public class Main{public static void main(String[] a){}}',
    javascript: 'let x = 1',
    typescript: 'let x: number = 1',
    go: 'package main\nfunc main(){}',
    rust: 'fn main(){}',
    csharp: 'class P{static void Main(){}}',
    kotlin: 'fun main(){}',
    swift: 'print(1)',
  };
  assert.deepEqual(Object.keys(BUDGET_LINE).sort(), Object.keys(TRACERS).sort(), 'every traced language has a budget line');
  for (const [lang, code] of Object.entries(samples)) {
    const w = await TRACERS[lang].wrap(code);
    assert.ok(BUDGET_LINE[lang].test(w), `${lang}: the runtime declares its budget`);
    const small = withBudget(lang, w, 8500);
    assert.notEqual(small, w, `${lang}: the budget changes`);
    // Exactly 8500 (not 8500 followed by other digits), on the runtime's own line.
    assert.ok(new RegExp(BUDGET_LINE[lang].source.replace(/1500000|1_500_000/, '8500(?![0-9_])')).test(small), `${lang}: the budget is exactly 8500`);
    assert.equal(forRunner(lang, w)(null), w, `${lang}: a local run keeps the full trace`);
    assert.equal(forRunner(lang, w)('piston2'), w, `${lang}: our own runners keep the full trace`);
    const exact = (n) => new RegExp(BUDGET_LINE[lang].source.replace(/1500000|1_500_000/, `${n}(?![0-9_])`));
    assert.ok(exact(TRACE_BYTES.godbolt).test(forRunner(lang, w)('godbolt')), `${lang}: Compiler Explorer gets a small one`);
    assert.ok(exact(TRACE_BYTES.judge0).test(forRunner(lang, w)('judge02')), `${lang}: any Judge0 runner`);
  }
  // The student's own numbers are never touched.
  const own = 'int main(){ long long x = 1500000; return 0; }';
  assert.match(withBudget('cpp', await TRACERS.cpp.wrap(own), 8500), /x = 1500000/);
});
