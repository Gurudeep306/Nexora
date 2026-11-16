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

/** Languages the dry run can trace today, and how. */
const TRACERS = {
  python: { wrap: (code) => wrapPython(code), runAs: 'python' },
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
  const res = await run(t.wrap(code), input, t.runAs);
  const { events, errors, capped } = parseTrace(res.stderr);
  const verdict = res.verdict || (res.ok ? 'OK' : 'RE');
  const noTrace = events.length === 0;
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
