/**
 * Dry run: run a student's program once on an input with a tracer, and return
 * every step it took — the line that just ran, the function and call depth,
 * the variables that changed, and how much output had been printed — so the
 * client can animate the real run (client/src/components/solve/dryrun/).
 *
 * Every language produces the same events, one JSON object per line on
 * stderr after a marker (\x1eNXT). Events:
 *   { e: 'call', f, k, d, l, v?, h?, o }   a function starts (k: its call id, d: depth)
 *   { e: 'line', l, k, v?, x?, h?, o }     line l (in call k) just ran; v: changed
 *                                          variables, x: names gone, h: changed objects
 *   { e: 'ret',  k, l, r?, h?, o }         call k returns r
 *   { e: 'exc',  k, l, m, o }              an error was raised at line l
 *   { e: 'cap' }                           the step limit was reached; tracing stopped
 * `o` is how many characters the program had printed by then.
 * Values: numbers, strings, booleans, null, or { t: 'list'|'tuple'|'set'|'deque',
 * n, i[] }, { t: 'dict', n, k: [[key, value]] }, { t: 'ref', id } (an object
 * in the heap `h`: { id: { c: class, f: { field: value } } }), { t: 'big'|'num'|'str', s }.
 */
const { wrapPython, MARK } = require('./python');
const { instrumentCpp } = require('./cpp');
const { instrumentC } = require('./c');
const { instrumentJava } = require('./java');
const { instrumentJs } = require('./js');
const { instrumentGo } = require('./go');
const { instrumentRust } = require('./rust');
const { instrumentCSharp } = require('./csharp');
const { instrumentKotlin } = require('./kotlin');
const { instrumentSwift } = require('./swift');

/**
 * Languages the dry run can trace today, and how. `wrap` returns the code to
 * run; a compiled language's instrumented copy is checked against the
 * student's own code when it does not compile (see dryRun).
 */
const TRACERS = {
  python: { wrap: async (code) => wrapPython(code), runAs: 'python' },
  cpp: { wrap: async (code) => (await instrumentCpp(code)).code, runAs: 'cpp', compiled: true },
  c: { wrap: async (code) => (await instrumentC(code)).code, runAs: 'c', compiled: true },
  java: { wrap: async (code) => (await instrumentJava(code)).code, runAs: 'java', compiled: true },
  javascript: { wrap: async (code) => (await instrumentJs(code)).code, runAs: 'javascript' },
  typescript: { wrap: async (code) => (await instrumentJs(code, { typescript: true })).code, runAs: 'typescript', compiled: true },
  go: { wrap: async (code) => (await instrumentGo(code)).code, runAs: 'go', compiled: true },
  rust: { wrap: async (code) => (await instrumentRust(code)).code, runAs: 'rust', compiled: true },
  csharp: { wrap: async (code) => (await instrumentCSharp(code)).code, runAs: 'csharp', compiled: true },
  kotlin: { wrap: async (code) => (await instrumentKotlin(code)).code, runAs: 'kotlin', compiled: true },
  swift: { wrap: async (code) => (await instrumentSwift(code)).code, runAs: 'swift', compiled: true },
};

function supported(lang) {
  return Object.prototype.hasOwnProperty.call(TRACERS, lang);
}

/** Split a run's stderr into trace events and the program's own errors. */
function parseTrace(stderr) {
  const events = [];
  const rest = [];
  let capped = false;
  for (const line of String(stderr || '').split('\n')) {
    const at = line.indexOf(MARK);
    if (at < 0) {
      rest.push(line);
      continue;
    }
    if (at > 0) rest.push(line.slice(0, at));
    try {
      const ev = JSON.parse(line.slice(at + MARK.length));
      if (ev && ev.e === 'cap') capped = true;
      else if (ev && typeof ev.e === 'string') events.push(ev);
    } catch {
      /* a line cut off by an output limit: stop here */
      capped = true;
      break;
    }
  }
  const errors = rest
    .join('\n')
    .replace(/File "<nx>"/g, 'your code')
    .trim();
  return { events, errors, capped };
}

/**
 * Trace `code` on `input`. `run(code, input, lang)` is the judge's quickRun.
 * Resolves to { ok, supported, events, stdout, stderr, verdict, timeMs,
 * engine, capped, error }. Never throws.
 */
async function dryRun(code, lang, input, run) {
  const t = TRACERS[lang];
  if (!t) return { ok: false, supported: false, events: [], error: null };
  let wrapped;
  try {
    wrapped = await t.wrap(code);
  } catch (e) {
    return { ok: false, supported: true, events: [], stdout: '', stderr: '', verdict: 'OK', error: `The dry run could not read this program (${e.message}).` };
  }
  const res = await run(wrapped, input, t.runAs);
  if (t.compiled && res.verdict === 'CE') {
    // Is it the student's code that does not compile, or our copy of it?
    const plain = await run(code, input, t.runAs);
    if (plain.verdict === 'CE') {
      return { ok: false, supported: true, events: [], stdout: '', stderr: String(plain.error || plain.stderr || ''), verdict: 'CE', timeMs: null, engine: plain.engine || null, capped: false, error: 'Your code does not compile yet. Fix the error below, then try the dry run again.' };
    }
    return {
      ok: false,
      supported: true,
      events: [],
      stdout: plain.output || '',
      stderr: '',
      verdict: plain.verdict || 'OK',
      timeMs: plain.timeMs ?? null,
      engine: plain.engine || null,
      capped: false,
      error: "The dry run can't follow this program yet: it uses something the step tracer does not understand. Your code itself compiles and runs, so Run still works. Please tell us which program it was.",
    };
  }
  const { events, errors, capped } = parseTrace(res.stderr);
  const verdict = res.verdict || (res.ok ? 'OK' : 'RE');
  const noTrace = events.length === 0;
  // Output the tracer could not count (written straight to the output stream,
  // or flushed only at exit) still appears: by the end, all of it is printed.
  const stdout = res.output || '';
  if (!capped && events.length && stdout) {
    const last = events[events.length - 1];
    if ((last.o ?? 0) < stdout.length) last.o = stdout.length;
  }
  return {
    ok: !noTrace,
    supported: true,
    events,
    stdout: res.output || '',
    stderr: errors || (res.error ? String(res.error) : ''),
    verdict,
    timeMs: res.timeMs ?? null,
    engine: res.engine || null,
    capped,
    error: noTrace ? (verdict === 'OK' ? 'The program ran, but no steps were recorded.' : errors || res.error || 'The program could not run.') : null,
  };
}

module.exports = { TRACERS, supported, parseTrace, dryRun };
