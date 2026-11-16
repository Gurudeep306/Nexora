/**
 * Remote code execution backends.
 *
 * The hosted server never runs user code on its own box (JUDGE_MODE=remote), so
 * every run goes to a sandbox. Every language has a chain of independent
 * sandboxes, tried in order, so one service being down or overloaded never
 * stops a run:
 *
 *   • Piston            — our own server, first when configured (piston.js)
 *   • Wandbox           — ~25 languages
 *   • Compiler Explorer — ~20 languages (godbolt.org's execution sandbox)
 *   • Kotlin Playground — Kotlin
 *   • Paiza.io          — ~24 languages, through its public "guest" API key
 *
 * A sandbox that just failed (busy, 5xx, container fault, no answer) is set
 * aside for a while — 30s, doubling to 5 minutes while it keeps failing — so
 * the next runs go straight to one that works (see `health` below). Only a
 * real answer from a sandbox (a verdict about the code) ends a run.
 *
 * Everything here returns the same shape so judge.js does not care which one
 * answered:
 *
 *   { stdout, stderr, exitCode, timeMs, verdict, engine }
 *
 * `verdict` is null for a clean run, otherwise 'CE' | 'RE' | 'TLE'.
 *
 * Two things make repeated runs fast:
 *   1. a short-lived result cache keyed on (engine, language, code, stdin) —
 *      pressing Run twice, or judging a testcase that appears twice, is free;
 *   2. in-flight de-duplication — N identical requests issued at once share a
 *      single HTTP round trip instead of stampeding the sandbox.
 */
const https = require('https');
const crypto = require('crypto');
const { usesPiston, runPiston, pistonEngines, pistonIndex } = require('./piston');

/* ────────────────────────── configuration ────────────────────────── */

/**
 * Wall-clock budget for one remote request.
 *
 * Measured end-to-end against the live sandboxes at six-way concurrency
 * (Sep 2026), running the same "sum n numbers" program in every language:
 *
 *   rust 44s · haskell 43s · julia 40s · go 36s · scala 31s · zig 26s
 *   java 24s · groovy 21s · cpp 17s · typescript 17s · crystal 14s · d 13s
 *   …everything else under 13s, most under 5s.
 *
 * Those are cold *compiles*, not slow programs. A flat 60s cap left Rust and
 * Haskell barely 35% headroom, so a busy afternoon on Wandbox would turn a
 * perfectly good submission into a bogus TLE. The slow set gets a longer
 * budget; it still fits inside the client's 180s ceiling for a judge run.
 */
const REQUEST_TIMEOUT = 60000;
const SLOW_REQUEST_TIMEOUT = 120000;
const SLOW_LANGS = new Set(['rust', 'haskell', 'julia', 'go', 'scala', 'zig', 'java', 'groovy', 'crystal', 'd', 'nim']);
const timeoutFor = (lang) => (SLOW_LANGS.has(lang) ? SLOW_REQUEST_TIMEOUT : REQUEST_TIMEOUT);

/** How long a successful run stays cached. */
const CACHE_TTL = 10 * 60 * 1000;
/** Upper bound on cached entries (each is small: two strings + numbers). */
const CACHE_MAX = 400;

const WANDBOX_MAP = {
  cpp:        { compiler: 'gcc-13.2.0',        options: '-O2 -std=c++20' },
  c:          { compiler: 'gcc-13.2.0-c',      options: '-O2 -std=c17 -lm' },
  python:     { compiler: 'cpython-3.12.7' },
  java:       { compiler: 'openjdk-jdk-22+36' },
  javascript: { compiler: 'nodejs-20.17.0' },
  typescript: { compiler: 'typescript-5.6.2' },
  csharp:     { compiler: 'mono-6.12.0.199' },
  go:         { compiler: 'go-1.23.2' },
  rust:       { compiler: 'rust-1.82.0' },
  ruby:       { compiler: 'ruby-3.4.9' },
  php:        { compiler: 'php-8.3.12' },
  perl:       { compiler: 'perl-5.42.0' },
  lua:        { compiler: 'lua-5.4.7' },
  shell:      { compiler: 'bash' },
  r:          { compiler: 'r-4.4.1' },
  scala:      { compiler: 'scala-2.13.15' },
  julia:      { compiler: 'julia-1.10.5' },
  pascal:     { compiler: 'fpc-3.2.2' },
  haskell:    { compiler: 'ghc-9.10.1',        options: '-O2' },
  d:          { compiler: 'dmd-2.109.1',       options: '-O' },
  nim:        { compiler: 'nim-2.2.10',        options: '-d:release --hints:off' },
  zig:        { compiler: 'zig-0.13.0' },
  groovy:     { compiler: 'groovy-4.0.23' },
  commonlisp: { compiler: 'clisp-2.49' },
};

/* Compiler Explorer's execution sandbox. The first six are primary (their
   Wandbox images are broken, checked Sep 2026); the rest are backups, each
   checked with the self-test program and real stdin (Nov 2026). Scala's
   runtime there lacks the standard library and Clojure has no runnable Main,
   so neither is listed. */
const GODBOLT_MAP = {
  swift:      { id: 'swift633',              lang: 'swift',   args: '-O' },
  dart:       { id: 'dart373',               lang: 'dart' },
  fsharp:     { id: 'dotnet90fsharpcoreclr', lang: 'fsharp' },
  ocaml:      { id: 'ocaml5200',             lang: 'ocaml' },
  crystal:    { id: 'crystal192',            lang: 'crystal', args: '--release' },
  objectivec: { id: 'objcg650',              lang: 'objc',    args: '-std=gnu11 -O2' },
  cpp:        { id: 'g142',                  lang: 'c++',     args: '-O2 -std=c++20' },
  c:          { id: 'cg142',                 lang: 'c',       args: '-O2 -std=c17 -lm' },
  python:     { id: 'python312',             lang: 'python' },
  java:       { id: 'java2101',              lang: 'java' },
  csharp:     { id: 'dotnet90csharpcoreclr', lang: 'csharp' },
  go:         { id: 'gl1238',                lang: 'go' },
  rust:       { id: 'r1820',                 lang: 'rust',    args: '-O' },
  ruby:       { id: 'ruby347',               lang: 'ruby' },
  lua:        { id: 'lua547',                lang: 'lua' },
  perl:       { id: 'perl5422',              lang: 'perl' },
  haskell:    { id: 'ghc9102',               lang: 'haskell', args: '-O2' },
  julia:      { id: 'julia_1_11_2',          lang: 'julia' },
  zig:        { id: 'z0140',                 lang: 'zig' },
  kotlin:     { id: 'kotlinc2310',           lang: 'kotlin' },
  d:          { id: 'ldc1_41',               lang: 'd',       args: '-O' },
  pascal:     { id: 'fpc322',                lang: 'pascal' },
};

/* Paiza.io's public API (api_key "guest", documented by Paiza for free use).
   Checked with the self-test program (Nov 2026). Its Objective-C compiles in
   C89 mode and its Clojure times out on JVM start-up, so neither is listed.
   It is the only free runner for Scheme and Elixir. */
const PAIZA_MAP = {
  cpp: 'cpp', c: 'c', java: 'java', kotlin: 'kotlin', scala: 'scala', swift: 'swift',
  csharp: 'csharp', go: 'go', haskell: 'haskell', perl: 'perl', python: 'python3',
  ruby: 'ruby', php: 'php', shell: 'bash', r: 'r', javascript: 'javascript',
  fsharp: 'fsharp', d: 'd', elixir: 'elixir', rust: 'rust', scheme: 'scheme',
  commonlisp: 'commonlisp', typescript: 'typescript',
};

/**
 * The public sandboxes for a language, in the order they are tried (before
 * any reordering by health). Empty when nothing can run it.
 */
function publicChain(lang) {
  const chain = [];
  if (GODBOLT_PRIMARY.has(lang)) chain.push('godbolt');
  if (lang === 'kotlin') chain.push('kotlin');
  if (WANDBOX_MAP[lang]) chain.push('wandbox');
  if (GODBOLT_MAP[lang] && !chain.includes('godbolt')) chain.push('godbolt');
  if (PAIZA_MAP[lang]) chain.push('paiza');
  return chain;
}
const GODBOLT_PRIMARY = new Set(['swift', 'dart', 'fsharp', 'ocaml', 'crystal', 'objectivec']);

/** Every sandbox for a language, our own Piston servers first when they serve it. */
function engineChain(lang) {
  const pub = publicChain(lang);
  return usesPiston(lang) ? [...pistonEngines(process.env, lang), ...pub] : pub;
}

/** The first public sandbox for a language (Piston's fallback), or null. */
function publicEngineFor(lang) {
  return publicChain(lang)[0] || null;
}

/**
 * Which backend owns a language, or null when nothing can run it remotely.
 * JUDGE_MODE=piston puts the self-hosted Piston first (see piston.js).
 */
function engineFor(lang) {
  return engineChain(lang)[0] || null;
}

/** Languages that can run with no local toolchain at all. */
function hasRemote(lang) {
  return engineFor(lang) !== null;
}

/* ────────────────────────── sandbox health ────────────────────────── */

/**
 * Per-sandbox failure memory. A sandbox that fails for reasons outside the
 * user's code is set aside: 30s after the first failure, doubling while it
 * keeps failing, at most 5 minutes. The chain is then tried healthy-first,
 * so a run does not wait on a sandbox that just failed someone else.
 */
const HEALTH_BASE_MS = 30_000;
const HEALTH_MAX_MS = 5 * 60_000;
const health = new Map(); // engine -> { fails, until }

function markFailed(engine, now = Date.now()) {
  const h = health.get(engine) || { fails: 0, until: 0 };
  h.fails += 1;
  h.until = now + Math.min(HEALTH_BASE_MS * 2 ** (h.fails - 1), HEALTH_MAX_MS);
  health.set(engine, h);
}
function markHealthy(engine) {
  health.delete(engine);
}
function isResting(engine, now = Date.now()) {
  const h = health.get(engine);
  return !!h && h.until > now;
}
/** The chain with resting sandboxes moved to the back (soonest-back first). */
function orderByHealth(chain, now = Date.now()) {
  const up = chain.filter((e) => !isResting(e, now));
  const down = chain.filter((e) => isResting(e, now)).sort((a, b) => health.get(a).until - health.get(b).until);
  return [...up, ...down];
}
/** For the admin page: which sandboxes are resting and until when. */
function sandboxHealth(now = Date.now()) {
  const out = {};
  for (const [engine, h] of health) out[engine] = { fails: h.fails, restingFor: Math.max(0, h.until - now) };
  return out;
}
function resetHealth() {
  health.clear();
}

/* Keep-alive agents: a cold TLS handshake per testcase was costing ~300ms each. */
const AGENTS = {
  wandbox: new https.Agent({ keepAlive: true, maxSockets: 12, timeout: SLOW_REQUEST_TIMEOUT }),
  godbolt: new https.Agent({ keepAlive: true, maxSockets: 8, timeout: SLOW_REQUEST_TIMEOUT }),
  kotlin:  new https.Agent({ keepAlive: true, maxSockets: 8, timeout: SLOW_REQUEST_TIMEOUT }),
  paiza:   new https.Agent({ keepAlive: true, maxSockets: 4, timeout: SLOW_REQUEST_TIMEOUT }),
};

/* ────────────────────────── HTTP plumbing ────────────────────────── */

/**
 * POST JSON and resolve `{ ok, status, body, timeMs, error, transient }`.
 * Never rejects: callers branch on `ok`.
 */
function postJson({ hostname, path, payload, agent, headers, timeout = REQUEST_TIMEOUT, method = 'POST' }) {
  return new Promise((resolve) => {
    const body = Buffer.from(payload || '', 'utf8');
    const start = Date.now();
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve({ timeMs: Date.now() - start, ...v }); } };

    const req = https.request({
      hostname,
      path,
      method,
      agent,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        Connection: 'keep-alive',
        Accept: 'application/json',
        'User-Agent': 'Nexora-Judge/2',
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const status = res.statusCode || 0;
        const text = Buffer.concat(chunks).toString('utf8');
        // 429 / 5xx are the sandbox being busy, not the user's fault: retry.
        if (status === 429 || status >= 500) {
          return done({ ok: false, status, error: `sandbox busy (HTTP ${status})`, transient: true });
        }
        if (status >= 400) {
          return done({ ok: false, status, error: `sandbox rejected the request (HTTP ${status})` });
        }
        try {
          done({ ok: true, status, body: JSON.parse(text) });
        } catch {
          // Almost always an HTML error/captcha page in front of the API.
          done({ ok: false, status, error: 'sandbox returned an unreadable response', transient: true });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); done({ ok: false, status: 0, error: 'timeout', timedOut: true }); });
    req.on('error', (e) => done({ ok: false, status: 0, error: e.message, transient: true }));
    req.end(body);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────────── per-engine adapters ────────────────────────── */

/** Small per-language fixups the public sandboxes need. */
function preprocess(code, lang) {
  if (lang === 'java') {
    // Wandbox compiles to a fixed file name, so a `public class` mismatch fails.
    return code.replace(/public\s+class\s+/g, 'class ');
  }
  if (lang === 'typescript' && !/@ts-nocheck/.test(code)) {
    // There is no @types/node on Wandbox: `import fs from "fs"` would not typecheck.
    return '// @ts-nocheck\n' + code;
  }
  return code;
}

async function runWandbox(code, input, lang, budget) {
  const wb = WANDBOX_MAP[lang];
  const res = await postJson({
    hostname: 'wandbox.org',
    path: '/api/compile.json',
    agent: AGENTS.wandbox,
    timeout: budget || timeoutFor(lang),
    payload: JSON.stringify({
      code: preprocess(code, lang),
      compiler: wb.compiler,
      stdin: input || '',
      // Wandbox expects one compiler option per line, not space-separated.
      'compiler-option-raw': (wb.options || '').split(/\s+/).filter(Boolean).join('\n'),
      'runtime-option-raw': '',
    }),
  });
  if (!res.ok) return httpFailure(res, 'wandbox', lang);

  return classifyWandbox(res.body, res.timeMs);
}

/**
 * Turn a Wandbox response into a verdict.
 *
 * This is fiddlier than it looks, and getting it wrong is what made compile
 * errors show up as a blank "runtime error":
 *
 *   • `compiler_error` holds *warnings* too, so a non-empty value does not mean
 *     the build failed — a clean run with `-Wall` fills it in.
 *   • `program_output` / `program_error` / `program_message` are always present,
 *     as empty strings, even when the build failed and nothing ever ran — so
 *     their presence cannot be used to prove the program executed either.
 *
 * What actually distinguishes a build failure is that the compiler reported an
 * *error* and the program produced nothing at all.
 */
/** Messages from a sandbox's own container runtime, never from a user's program. */
const SANDBOX_FAULT = /OCI runtime error|\bcrun: |\brunc\b.*(?:create|init)|Resource temporarily unavailable|fork: retry|cannot fork/i;

function classifyWandbox(r, timeMs) {
  const compilerErr = (r.compiler_error || '').trim();
  const stdout = (r.program_output || '').trimEnd();
  const stderr = (r.program_error || '').trim();
  const programMsg = (r.program_message || '').trim();
  const status = parseInt(r.status, 10) || 0;

  // Wandbox's own machine failing to start the container (it is overloaded)
  // is not the user's compile error: mark it transient so it is retried and
  // never cached, and say plainly what happened if it keeps failing.
  if (SANDBOX_FAULT.test(`${compilerErr}\n${stderr}\n${programMsg}`) && !stdout) {
    return {
      stdout: '',
      stderr: 'The Wandbox sandbox is overloaded right now. This is not a problem with your code — run it again in a moment.',
      exitCode: -1, timeMs, verdict: 'RE', engine: 'wandbox', _transient: true,
    };
  }

  const producedNothing = !stdout && !stderr && !programMsg;
  const looksLikeError = /\b(error|fatal|panic)\b/i.test(compilerErr);
  if (producedNothing && compilerErr && looksLikeError) {
    return { stdout: '', stderr: compilerErr, exitCode: 1, timeMs, verdict: 'CE', engine: 'wandbox' };
  }
  if (r.signal) {
    return {
      stdout, stderr: stderr || `Killed by signal ${r.signal}`,
      exitCode: status || 1, timeMs, verdict: 'RE', engine: 'wandbox',
    };
  }
  if (status !== 0) {
    return { stdout, stderr, exitCode: status, timeMs, verdict: 'RE', engine: 'wandbox' };
  }
  return { stdout, stderr, exitCode: 0, timeMs, verdict: null, engine: 'wandbox' };
}

async function runGodbolt(code, input, lang, budget) {
  const gb = GODBOLT_MAP[lang];
  const res = await postJson({
    hostname: 'godbolt.org',
    path: `/api/compiler/${encodeURIComponent(gb.id)}/compile`,
    agent: AGENTS.godbolt,
    timeout: budget || timeoutFor(lang),
    payload: JSON.stringify({
      // Its Java compiles example.java, so a public class would not compile either.
      source: lang === 'java' ? preprocess(code, lang) : code,
      lang: gb.lang,
      options: {
        userArguments: gb.args || '',
        executeParameters: { args: [], stdin: input || '' },
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
        tools: [],
        libraries: [],
      },
      allowStoreCodeDebug: false,
    }),
  });
  if (!res.ok) return httpFailure(res, 'godbolt', lang);
  return classifyGodbolt(res.body, res.timeMs);
}

/** Turn a Kotlin Playground response into a verdict. */
function classifyKotlin(r, timeMs, shimAt = -1) {
  // `errors` carries warnings too ("Variable is unused", severity WARNING).
  // Treating the array's mere presence as a compile error used to fail
  // perfectly good programs.
  const errors = Object.values(r.errors || {}).flat().filter((e) => !e.severity || e.severity === 'ERROR');
  if (errors.length) {
    // "File.kt:LINE:COL: error: …" (the playground counts from 0), on the
    // student's own lines, so the editor can mark the exact spot.
    const where = (e) => {
      const st = e.interval && e.interval.start;
      if (!st || !Number.isFinite(st.line)) return '';
      return `File.kt:${kotlinLine(st.line + 1, shimAt)}:${(st.ch || 0) + 1}: error: `;
    };
    return {
      stdout: '', stderr: errors.map((e) => where(e) + (e.message || JSON.stringify(e))).join('\n'),
      exitCode: 1, timeMs, verdict: 'CE', engine: 'kotlin',
    };
  }
  const text = r.text || '';
  const stdout = text.replace(/<errStream>[\s\S]*?<\/errStream>/g, '').replace(/<\/?outStream>/g, '').trimEnd();
  const stderr = (text.match(/<errStream>([\s\S]*?)<\/errStream>/)?.[1] || '').trim();
  if (r.exception) {
    const x = r.exception;
    const ex = [x.fullName, x.message].filter(Boolean).join(': ') || 'Runtime exception';
    const frame = (x.stackTrace || []).find((f) => f && f.fileName === 'File.kt' && Number.isFinite(f.lineNumber));
    const at = frame ? `\n    at ${frame.className || 'FileKt'}.${frame.methodName || 'main'}(File.kt:${kotlinLine(frame.lineNumber, shimAt)})` : '';
    return { stdout, stderr: (stderr ? `${stderr}\n` : '') + ex + at, exitCode: 1, timeMs, verdict: 'RE', engine: 'kotlin' };
  }
  return { stdout, stderr, exitCode: 0, timeMs, verdict: null, engine: 'kotlin' };
}

/** Turn a Compiler Explorer response into a verdict. */
function classifyGodbolt(r, timeMs) {
  const join = (arr) => (arr || []).map((x) => x.text).join('\n');
  // Terminal colour and erase codes (\x1b[…m, \x1b[K), and its internal file name.
  const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');
  const strip = (v) => v.replace(ANSI, '').replace(/\/app\/output\.s/g, '<source>');
  if (!r.didExecute) {
    const b = r.buildResult || {};
    const tidy = (v) => strip(v).replace(/^Build failed\n?/, '').trim();
    // Most compilers report on stderr; its C# compiler reports on stdout.
    const msg = tidy(join(b.stderr) || join(r.stderr)) || tidy(join(b.stdout)) || 'The program did not compile.';
    return { stdout: '', stderr: msg, exitCode: 1, timeMs, verdict: 'CE', engine: 'godbolt' };
  }
  const stdout = join(r.stdout).trimEnd();
  const stderr = strip(join(r.stderr)).trim();
  // Julia hit an error while loading the code, then the sandbox killed it
  // while it was still printing the details: not a time limit. Another
  // runner can print the full message.
  if (/^ERROR: LoadError/m.test(stderr) && (r.timedOut || /Killed|SIGKILL/.test(stderr))) {
    return {
      stdout,
      stderr: 'Your program stopped with an error while loading (often a syntax error or a name that does not exist), but this runner was cut off before it printed the details. Check the code near the top, or run again.',
      exitCode: 1, timeMs, verdict: 'RE', engine: 'godbolt', _noAnswer: true,
    };
  }
  if (r.timedOut) return { stdout, stderr, exitCode: -1, timeMs, verdict: 'TLE', engine: 'godbolt' };
  if (r.code !== 0) return { stdout, stderr, exitCode: r.code, timeMs, verdict: 'RE', engine: 'godbolt' };
  // execTime is the program's own runtime, not our round trip — far more useful.
  return { stdout, stderr, exitCode: 0, timeMs: r.execTime ? Number(r.execTime) : timeMs, verdict: null, engine: 'godbolt' };
}

/**
 * The Kotlin Playground sandbox blocks System.setIn, so stdin is fed through a
 * private stream instead: readLine / readln / readlnOrNull and System.`in`
 * (Scanner, BufferedReader, …) all read from it. The declarations must land
 * *after* the import block — Kotlin rejects imports that follow a declaration.
 */
/** How many lines the stdin shim adds, and the 0-based line it goes at. */
const KOTLIN_SHIM_LINES = 5;
function kotlinShimAt(code) {
  const lines = String(code || '').split('\n');
  let i = 0;
  while (i < lines.length && /^\s*(package\s|import\s|@file:|\/\/|$)/.test(lines[i])) i++;
  return i;
}

/** A 1-based line of the shimmed file, as a line of the student's own code. */
function kotlinLine(line1, shimAt) {
  if (shimAt < 0) return line1;
  if (line1 > shimAt + KOTLIN_SHIM_LINES) return line1 - KOTLIN_SHIM_LINES;
  return Math.min(line1, shimAt + 1);
}

function injectKotlinStdin(code, input) {
  const lit = JSON.stringify(input || '').replace(/\$/g, '${"$"}');
  const pre = [
    `private val __nxIn: java.io.InputStream = java.io.ByteArrayInputStream(${lit}.toByteArray())`,
    'private val __nxR by lazy { java.io.BufferedReader(java.io.InputStreamReader(__nxIn)) }',
    'private fun readLine(): String? = __nxR.readLine()',
    'private fun readln(): String = __nxR.readLine() ?: throw RuntimeException("EOF")',
    'private fun readlnOrNull(): String? = __nxR.readLine()',
  ].join('\n');
  const lines = code.split('\n');
  const i = kotlinShimAt(code);
  return [...lines.slice(0, i), pre, ...lines.slice(i)].join('\n').replace(/System\.`in`/g, '__nxIn');
}

async function runKotlin(code, input, budget) {
  const res = await postJson({
    hostname: 'api.kotlinlang.org',
    path: '/api/2.1.20/compiler/run',
    agent: AGENTS.kotlin,
    timeout: budget || timeoutFor('kotlin'),
    payload: JSON.stringify({
      args: '',
      confType: 'java',
      files: [{ name: 'File.kt', text: injectKotlinStdin(code, input), publicId: '' }],
    }),
  });
  if (!res.ok) return httpFailure(res, 'kotlin', 'kotlin');
  return classifyKotlin(res.body, res.timeMs, kotlinShimAt(code));
}

/**
 * Paiza.io runs asynchronously: create a runner, then poll for its result.
 * The poll is quick at first (most programs finish in under two seconds).
 */
async function runPaiza(code, input, lang, limit) {
  const budget = limit || timeoutFor(lang);
  const start = Date.now();
  const created = await postJson({
    hostname: 'api.paiza.io',
    path: '/runners/create',
    agent: AGENTS.paiza,
    timeout: Math.min(budget, 30000),
    payload: JSON.stringify({ source_code: preprocessPaiza(code, lang), language: PAIZA_MAP[lang], input: input || '', api_key: 'guest' }),
  });
  if (!created.ok) return httpFailure(created, 'paiza', lang);
  const id = created.body && created.body.id;
  if (!id) {
    return { stdout: '', stderr: `Remote execution failed: ${(created.body && created.body.error) || 'paiza gave no runner id'}`, exitCode: -1, timeMs: created.timeMs, verdict: 'RE', engine: 'paiza', _transient: true };
  }
  for (let i = 0; ; i++) {
    await sleep(i < 6 ? 350 : 1000);
    const left = budget - (Date.now() - start);
    if (left <= 0) return httpFailure({ timedOut: true, timeMs: Date.now() - start }, 'paiza', lang);
    const res = await postJson({
      hostname: 'api.paiza.io',
      path: `/runners/get_details?id=${encodeURIComponent(id)}&api_key=guest`,
      method: 'GET',
      agent: AGENTS.paiza,
      timeout: Math.min(left, 20000),
    });
    if (!res.ok) return httpFailure(res, 'paiza', lang);
    if (res.body && res.body.status === 'completed') return classifyPaiza(res.body, Date.now() - start);
  }
}

/** Paiza wants a public Main class in Java (Wandbox wants none). */
function preprocessPaiza(code, lang) {
  if (lang === 'java' && !/public\s+class\s+Main\b/.test(code)) return code.replace(/(^|\n)\s*class\s+Main\b/, '$1public class Main');
  return code;
}

/** Turn a Paiza.io runner's details into a verdict. */
function classifyPaiza(r, timeMs) {
  const stdout = (r.stdout || '').trimEnd();
  const stderr = (r.stderr || '').trim();
  if (r.build_result === 'failure') {
    return { stdout: '', stderr: (r.build_stderr || r.build_stdout || 'Build failed').trim(), exitCode: 1, timeMs, verdict: 'CE', engine: 'paiza' };
  }
  const ran = r.time != null && r.time !== '' ? Math.round(Number(r.time) * 1000) : timeMs;
  if (r.result === 'timeout') return { stdout, stderr, exitCode: -1, timeMs: ran, verdict: 'TLE', engine: 'paiza', _ownLimit: true };
  const code = parseInt(r.exit_code, 10);
  if (r.result === 'failure' || (Number.isFinite(code) && code !== 0)) {
    return { stdout, stderr: stderr || `Exited with code ${Number.isFinite(code) ? code : 1}`, exitCode: Number.isFinite(code) && code > 0 ? code : 1, timeMs: ran, verdict: 'RE', engine: 'paiza' };
  }
  return { stdout, stderr, exitCode: 0, timeMs: ran, verdict: null, engine: 'paiza' };
}

/** Turn a failed HTTP exchange into a judge result. */
function httpFailure(res, engine, lang) {
  if (res.timedOut) {
    return {
      stdout: '',
      stderr: `The ${engine} sandbox did not answer within ${Math.round(timeoutFor(lang) / 1000)}s — the program may be stuck in a loop.`,
      exitCode: -1, timeMs: res.timeMs, verdict: 'TLE', engine, _transient: false, _noAnswer: true,
    };
  }
  return {
    stdout: '', stderr: `Remote execution failed: ${res.error}`,
    exitCode: -1, timeMs: res.timeMs, verdict: 'RE', engine,
    _transient: res.transient === true,
  };
}

/* ────────────────────────── cache + de-duplication ────────────────────────── */

/** Insertion-ordered Map used as an LRU. */
const cache = new Map();
/** key → Promise, so concurrent identical runs share one request. */
const inflight = new Map();

function cacheKey(engine, lang, code, input) {
  return crypto.createHash('sha1')
    .update(engine).update('\u0000').update(lang).update('\u0000')
    .update(code).update('\u0000').update(input || '')
    .digest('hex');
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) { cache.delete(key); return null; }
  // Refresh recency.
  cache.delete(key);
  cache.set(key, hit);
  return { ...hit.value, cached: true };
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

function clearCache() { cache.clear(); inflight.clear(); }

/* ────────────────────────── public entry point ────────────────────────── */


/**
 * Process-wide cap on remote executions. judge.js bounds the fan-out of one
 * submission, but many users (or one user with many tabs) submitting at once
 * would otherwise open an unbounded number of sandbox requests. Excess work
 * waits in a bounded queue; past that the run is refused as a transient
 * failure (exitCode -1, so it is never cached).
 */
const MAX_REMOTE_CONCURRENT = Number(process.env.REMOTE_MAX_CONCURRENT) || 16;
const MAX_REMOTE_QUEUED = Number(process.env.REMOTE_MAX_QUEUED) || 200;
let remoteActive = 0;
const remoteWaiters = [];

async function acquireSlot() {
  if (remoteActive < MAX_REMOTE_CONCURRENT) { remoteActive++; return true; }
  if (remoteWaiters.length >= MAX_REMOTE_QUEUED) return false;
  await new Promise((resolve) => remoteWaiters.push(resolve));
  return true; // the releasing run handed its slot straight to us
}

function releaseSlot() {
  const next = remoteWaiters.shift();
  if (next) next();
  else remoteActive--;
}

function remoteLoad() {
  return { active: remoteActive, queued: remoteWaiters.length, max: MAX_REMOTE_CONCURRENT };
}

/** Run once on one sandbox. Never throws. */
async function dispatch(code, input, lang, engine, budget) {
  try {
    const server = pistonIndex(engine);
    if (server >= 0) {
      const r = await runPiston(code, input, lang, { server });
      // Piston down or missing the runtime: let the chain move on.
      if (r._pistonFailed) { delete r._pistonFailed; return { ...r, engine, _transient: true }; }
      return { ...r, engine };
    }
    if (engine === 'wandbox') return await runWandbox(code, input, lang, budget);
    if (engine === 'godbolt') return await runGodbolt(code, input, lang, budget);
    if (engine === 'paiza') return await runPaiza(code, input, lang, budget);
    return await runKotlin(code, input, budget);
  } catch (e) {
    return { stdout: '', stderr: `Remote execution failed: ${e.message}`, exitCode: -1, timeMs: 0, verdict: 'RE', engine, _transient: true };
  }
}

/** Gentle per-sandbox limits, so a burst never hammers one free service. */
const ENGINE_MAX = { wandbox: 12, godbolt: 6, kotlin: 6, paiza: 4, piston: 32 };
const engineActive = new Map();
const engineWaiters = new Map();
async function enterEngine(engine) {
  const max = ENGINE_MAX[pistonIndex(engine) >= 0 ? 'piston' : engine] || 6;
  const n = engineActive.get(engine) || 0;
  if (n < max) { engineActive.set(engine, n + 1); return; }
  await new Promise((resolve) => {
    const q = engineWaiters.get(engine) || [];
    q.push(resolve);
    engineWaiters.set(engine, q);
  });
}
function leaveEngine(engine) {
  const q = engineWaiters.get(engine);
  const next = q && q.shift();
  if (next) next();
  else engineActive.set(engine, Math.max(0, (engineActive.get(engine) || 1) - 1));
}

/** The whole run must answer inside the client's 180s ceiling. */
const RUN_DEADLINE = 165_000;
/**
 * How long one sandbox gets while another is still waiting behind it. A busy
 * sandbox can hang for minutes; the next one runs the same code anyway, so a
 * slow-but-working compile loses nothing but the wait.
 */
const FAILOVER_BUDGET = 25_000;

/**
 * Try every sandbox in the chain (healthy ones first) until one gives a real
 * answer about the code. A sandbox fault, busy reply, network error or a
 * sandbox that never answers moves on to the next one at once; after a full
 * round with no answer, wait a moment and go round once more.
 */
async function runChain(code, input, lang, chain, deadline = Date.now() + RUN_DEADLINE, run = dispatch, pause = 1500) {
  let last = null;
  for (let round = 0; round < 2; round++) {
    const order = orderByHealth(chain);
    for (let i = 0; i < order.length; i++) {
      const engine = order[i];
      if (Date.now() >= deadline) break;
      await enterEngine(engine);
      let r;
      try {
        const isLast = i === order.length - 1 && round === 1;
        const left = deadline - Date.now();
        const budget = Math.max(1000, Math.min(isLast ? timeoutFor(lang) : FAILOVER_BUDGET, left));
        r = await run(code, input, lang, engine, budget);
      } finally {
        leaveEngine(engine);
      }
      const moreToTry = i < order.length - 1 || round === 0;
      // No answer at all is a sandbox problem when another one can still say
      // what the program does; with nothing left, it stands as TLE.
      const failedOver = r._transient || (r._noAnswer && moreToTry);
      if (!failedOver) {
        markHealthy(engine);
        delete r._transient; delete r._noAnswer; delete r._ownLimit;
        return r;
      }
      markFailed(engine);
      last = r;
    }
    if (round === 0 && Date.now() + pause < deadline) await sleep(pause);
  }
  if (last) { delete last._transient; delete last._noAnswer; delete last._ownLimit; }
  return {
    stdout: '',
    stderr: last && last._noAnswer
      ? last.stderr
      : 'Every code runner for this language is busy right now. This is not a problem with your code — run it again in a minute.',
    exitCode: -1,
    timeMs: last ? last.timeMs : 0,
    verdict: last && last.verdict === 'TLE' ? 'TLE' : 'RE',
    engine: last ? last.engine : null,
  };
}

/**
 * Run `code` against `input` on whichever sandbox owns `lang`.
 *
 * Cached results are returned immediately; identical concurrent calls share a
 * single request; transient failures (network blips, 429, 5xx, HTML error
 * pages) are retried with backoff before giving up.
 */
async function remoteRun(code, input, lang, opts = {}) {
  const chain = engineChain(lang);
  if (!chain.length) {
    return {
      stdout: '', stderr: `No sandbox can run ${lang} — pick another language.`,
      exitCode: -1, timeMs: 0, verdict: 'CE', engine: null,
    };
  }

  // One cache across sandboxes: any of them answering is the answer.
  const key = cacheKey('any', lang, code, input);
  if (!opts.noCache) {
    const hit = cacheGet(key);
    if (hit) return hit;
    const pending = inflight.get(key);
    if (pending) return { ...(await pending), cached: true };
  }

  const work = (async () => {
    if (!(await acquireSlot())) {
      return {
        stdout: '', stderr: 'The judge is busy right now — try again in a moment.',
        exitCode: -1, timeMs: 0, verdict: 'RE', engine: chain[0],
      };
    }
    try {
      return await runChain(code, input, lang, chain);
    } finally {
      releaseSlot();
    }
  })();

  inflight.set(key, work);
  try {
    const result = await work;
    // Only cache a real determination. exitCode -1 marks *our* failures — a
    // dead socket, a busy sandbox, a request that never came back — and those
    // must be retried on the next run rather than remembered for ten minutes.
    if (result.exitCode >= 0) cacheSet(key, result);
    return result;
  } finally {
    inflight.delete(key);
  }
}

module.exports = {
  remoteRun,
  runChain,
  classifyWandbox,
  classifyKotlin,
  classifyGodbolt,
  classifyPaiza,
  engineChain,
  publicChain,
  orderByHealth,
  markFailed,
  markHealthy,
  sandboxHealth,
  resetHealth,
  PAIZA_MAP,
  hasRemote,
  engineFor,
  publicEngineFor,
  clearCache,
  remoteLoad,
  MAX_REMOTE_CONCURRENT,
  injectKotlinStdin,
  kotlinShimAt,
  kotlinLine,
  WANDBOX_MAP,
  GODBOLT_MAP,
  REQUEST_TIMEOUT,
  SLOW_REQUEST_TIMEOUT,
  timeoutFor,
};
