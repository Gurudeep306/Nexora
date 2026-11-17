// Judge0 runners (https://judge0.com), added in Admin → Code runners next to
// our Piston servers. Two ways, both within Judge0's terms:
//   - self-hosted: Judge0 is GPL-3.0 software; running it on our own server
//     is allowed. Its address, plus the X-Auth-Token it is set up with.
//   - Judge0 Cloud / RapidAPI: Judge0's own paid or free-tier API, sold for
//     "competitive programming platforms, e-learning platforms". The key the
//     admin bought there. (*.rapidapi.com gets RapidAPI's headers.)
// Keys are sealed with src/hive/vault.js by src/runners.js and only opened here.
//
// Judge0 numbers its languages; a runner's test reads /languages and keeps,
// for each of our languages, the newest matching one (`map`).
const ENGINE = /^judge0(\d*)$/;

/** Our language → Judge0's language names (newest version wins). */
const JUDGE0_LANG = {
  cpp: /^C\+\+ \((GCC|Clang)/,
  c: /^C \((GCC|Clang)/,
  python: /^Python \(3/,
  java: /^Java \((OpenJDK|JDK)/,
  javascript: /^JavaScript \(Node/,
  typescript: /^TypeScript/,
  go: /^Go \(/,
  rust: /^Rust \(/,
  csharp: /^C# \((\.NET|Mono)/,
  kotlin: /^Kotlin \(/,
  swift: /^Swift \(/,
  ruby: /^Ruby \(/,
  php: /^PHP \(/,
  perl: /^Perl \(/,
  lua: /^Lua \(/,
  haskell: /^Haskell \(/,
  scala: /^Scala \(/,
  r: /^R \(/,
  dart: /^Dart \(/,
  d: /^D \(/,
  pascal: /^Pascal \(/,
  ocaml: /^OCaml \(/,
  elixir: /^Elixir \(/,
  fsharp: /^F# \(/,
  groovy: /^Groovy \(/,
  shell: /^Bash \(/,
  objectivec: /^Objective-C \(/,
  commonlisp: /^Common Lisp \(/,
  clojure: /^Clojure \(/,
  nim: /^Nim \(/,
  zig: /^Zig \(/,
  crystal: /^Crystal \(/,
  julia: /^Julia \(/,
  scheme: /^Scheme \(/,
};

const num = (s) => String(s).split(/[^0-9]+/).filter(Boolean).map(Number);
function newer(a, b) {
  const x = num(a);
  const y = num(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

/** From Judge0's /languages list: our language → { id, name } of its newest match. */
function languageMap(list) {
  const out = {};
  for (const [lang, re] of Object.entries(JUDGE0_LANG)) {
    for (const l of list) {
      if (!l || typeof l.name !== 'string' || !re.test(l.name)) continue;
      // Judge0 marks some old entries "(… (deprecated))"; never pick those first.
      if (/deprecated/i.test(l.name) && out[lang]) continue;
      if (!out[lang] || newer(l.name, out[lang].name) || /deprecated/i.test(out[lang].name)) out[lang] = { id: Number(l.id), name: l.name };
    }
  }
  return out;
}

/** The headers a Judge0 address wants: RapidAPI's own, or X-Auth-Token. */
function headersFor(url, token) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (!token) return h;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* checked when it was added */
  }
  if (/\.rapidapi\.com$/i.test(host)) return { ...h, 'X-RapidAPI-Key': token, 'X-RapidAPI-Host': host };
  return { ...h, 'X-Auth-Token': token };
}

let servers = () => [];
/** src/runners.js tells us the enabled Judge0 runners: [{ url, token, name, map }]. */
function setServers(fn) {
  servers = typeof fn === 'function' ? fn : () => [];
}
function judge0Servers() {
  try {
    return servers() || [];
  } catch {
    return [];
  }
}

const engineName = (i) => (i === 0 ? 'judge0' : `judge0${i + 1}`);
function judge0Index(engine) {
  const m = ENGINE.exec(String(engine || ''));
  if (!m) return -1;
  return m[1] ? Number(m[1]) - 1 : 0;
}
/** Engine names of the Judge0 runners that have this language. */
function judge0Engines(lang) {
  return judge0Servers()
    .map((s, i) => (s.map && s.map[lang] ? engineName(i) : null))
    .filter(Boolean);
}

const b64 = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('base64');
const unb64 = (s) => (s ? Buffer.from(String(s), 'base64').toString('utf8') : '');
const failed = (why, timeMs) => ({ stdout: '', stderr: `Judge0: ${why}`, exitCode: -1, timeMs, verdict: 'RE', engine: 'judge0', _judge0Failed: true });

/**
 * Judge0's answer as a judge result. Status ids: 3 accepted, 5 time limit,
 * 6 compilation error, 7–12 runtime errors, 13 internal error, 14 exec
 * format error (the last two are the runner's fault, not the student's).
 */
function classifyJudge0(d, timeMs = 0) {
  if (!d || typeof d !== 'object' || !d.status) return failed((d && (d.error || d.message)) || 'unexpected answer', timeMs);
  const id = Number(d.status.id);
  const stdout = unb64(d.stdout).trimEnd();
  const stderr = unb64(d.stderr).trim();
  const t = d.time ? Math.round(Number(d.time) * 1000) : timeMs;
  if (id === 1 || id === 2) return failed('the run did not finish in time to answer', timeMs);
  if (id === 13 || id === 14) return failed(unb64(d.message) || d.status.description || 'internal error', timeMs);
  if (id === 6) return { stdout: '', stderr: unb64(d.compile_output).trim() || 'Compilation failed', exitCode: 1, timeMs: t, verdict: 'CE', engine: 'judge0' };
  if (id === 5) return { stdout, stderr: stderr || 'Time limit exceeded', exitCode: -1, timeMs: t, verdict: 'TLE', engine: 'judge0' };
  if (id >= 7 && id <= 12) {
    const why = stderr || unb64(d.message) || d.status.description || 'Runtime error';
    return { stdout, stderr: why, exitCode: Number(d.exit_code) || 1, timeMs: t, verdict: 'RE', engine: 'judge0' };
  }
  return { stdout, stderr, exitCode: 0, timeMs: t, verdict: null, engine: 'judge0' };
}

/** Run once on Judge0 runner `server`. Never throws; `_judge0Failed` lets the chain move on. */
async function runJudge0(code, input, lang, { server = 0, fetchImpl = globalThis.fetch, timeoutMs = 60000 } = {}) {
  const s = judge0Servers()[server];
  if (!s) return failed(`no runner number ${server + 1}`, 0);
  const language = s.map && s.map[lang];
  if (!language) return failed(`no ${lang} on this runner`, 0);
  const start = Date.now();
  try {
    const res = await fetchImpl(`${s.url}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: headersFor(s.url, s.token),
      body: JSON.stringify({ source_code: b64(code), language_id: language.id, stdin: b64(input) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const timeMs = Date.now() - start;
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* not JSON */
    }
    if (res.status === 401 || res.status === 403) return failed('the key was refused', timeMs);
    if (res.status === 429) return failed('the plan’s limit is used up for now', timeMs);
    if (!res.ok) return failed((data && (data.error || data.message)) || `HTTP ${res.status}`, timeMs);
    return classifyJudge0(data, timeMs);
  } catch (e) {
    return failed(e && e.name === 'TimeoutError' ? 'timed out' : (e && e.message) || 'unreachable', Date.now() - start);
  }
}

/**
 * Check a Judge0 runner the way the judge will use it: read its languages,
 * then run a one-line program. Resolves to { ok, ms, error, languages, map }.
 */
async function testJudge0(url, token, { fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const started = Date.now();
  const headers = headersFor(url, token);
  const why = (e) => (e?.name === 'TimeoutError' ? 'Timed out' : 'Could not reach the runner');
  let map = {};
  try {
    const res = await fetchImpl(`${url}/languages`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 401 || res.status === 403) return { ok: false, ms: Date.now() - started, error: 'The key was refused', languages: [], map };
    if (!res.ok) return { ok: false, ms: Date.now() - started, error: `The runner answered ${res.status}`, languages: [], map };
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list)) return { ok: false, ms: Date.now() - started, error: 'That address is not a Judge0 server', languages: [], map };
    map = languageMap(list);
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: why(e), languages: [], map };
  }
  const languages = Object.keys(map).sort();
  if (!languages.length) return { ok: false, ms: Date.now() - started, error: 'None of our languages are installed there', languages, map };
  const probe = map.python ? ['python', 'print(6*7)'] : map.c ? ['c', '#include <stdio.h>\nint main(void){printf("42");return 0;}'] : null;
  if (probe) {
    try {
      const res = await fetchImpl(`${url}/submissions?base64_encoded=true&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_code: b64(probe[1]), language_id: map[probe[0]].id, stdin: '' }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429) return { ok: false, ms: Date.now() - started, error: 'The plan’s limit is used up for now', languages, map };
      const j = await res.json().catch(() => null);
      if (!res.ok || unb64(j?.stdout).trim() !== '42') return { ok: false, ms: Date.now() - started, error: 'It answered, but a test program did not run', languages, map };
    } catch (e) {
      return { ok: false, ms: Date.now() - started, error: why(e), languages, map };
    }
  }
  return { ok: true, ms: Date.now() - started, error: null, languages, map };
}

module.exports = { JUDGE0_LANG, languageMap, headersFor, setServers, judge0Servers, judge0Engines, judge0Index, engineName, classifyJudge0, runJudge0, testJudge0 };
