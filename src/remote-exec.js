/**
 * Remote code execution backends.
 *
 * The hosted server never runs user code on its own box (JUDGE_MODE=remote), so
 * every run goes to a public sandbox. Three are wired up:
 *
 *   • Wandbox           — ~25 languages, the workhorse
 *   • Compiler Explorer — Swift / Dart / F# / OCaml / Crystal / Objective-C,
 *                         whose Wandbox images are broken
 *   • Kotlin Playground — Kotlin only
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

/* ────────────────────────── configuration ────────────────────────── */

/** Wall-clock budget for one remote request. Cold compiles (Go, Rust, Haskell,
 *  Julia) genuinely take 20-40s on a cold sandbox, so this has to be generous;
 *  a tighter cap turned slow-but-correct runs into bogus TLEs. */
const REQUEST_TIMEOUT = 60000;

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

/* Wandbox's Swift, OCaml, Crystal and .NET images are broken (checked Sep 2026),
   so these run on Compiler Explorer's execution sandbox instead. */
const GODBOLT_MAP = {
  swift:      { id: 'swift633',              lang: 'swift',   args: '-O' },
  dart:       { id: 'dart373',               lang: 'dart' },
  fsharp:     { id: 'dotnet90fsharpcoreclr', lang: 'fsharp' },
  ocaml:      { id: 'ocaml5200',             lang: 'ocaml' },
  crystal:    { id: 'crystal192',            lang: 'crystal', args: '--release' },
  objectivec: { id: 'objcg650',              lang: 'objc',    args: '-std=gnu11 -O2' },
};

/** Which backend owns a language, or null when nothing can run it remotely. */
function engineFor(lang) {
  if (WANDBOX_MAP[lang]) return 'wandbox';
  if (lang === 'kotlin') return 'kotlin';
  if (GODBOLT_MAP[lang]) return 'godbolt';
  return null;
}

/** Languages that can run with no local toolchain at all. */
function hasRemote(lang) {
  return engineFor(lang) !== null;
}

/* Keep-alive agents: a cold TLS handshake per testcase was costing ~300ms each. */
const AGENTS = {
  wandbox: new https.Agent({ keepAlive: true, maxSockets: 12, timeout: REQUEST_TIMEOUT }),
  godbolt: new https.Agent({ keepAlive: true, maxSockets: 8, timeout: REQUEST_TIMEOUT }),
  kotlin:  new https.Agent({ keepAlive: true, maxSockets: 8, timeout: REQUEST_TIMEOUT }),
};

/* ────────────────────────── HTTP plumbing ────────────────────────── */

/**
 * POST JSON and resolve `{ ok, status, body, timeMs, error, transient }`.
 * Never rejects: callers branch on `ok`.
 */
function postJson({ hostname, path, payload, agent, headers }) {
  return new Promise((resolve) => {
    const body = Buffer.from(payload, 'utf8');
    const start = Date.now();
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve({ timeMs: Date.now() - start, ...v }); } };

    const req = https.request({
      hostname,
      path,
      method: 'POST',
      agent,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        Connection: 'keep-alive',
        Accept: 'application/json',
        'User-Agent': 'Nexora-Judge/2',
        ...(headers || {}),
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

async function runWandbox(code, input, lang) {
  const wb = WANDBOX_MAP[lang];
  const res = await postJson({
    hostname: 'wandbox.org',
    path: '/api/compile.json',
    agent: AGENTS.wandbox,
    payload: JSON.stringify({
      code: preprocess(code, lang),
      compiler: wb.compiler,
      stdin: input || '',
      // Wandbox expects one compiler option per line, not space-separated.
      'compiler-option-raw': (wb.options || '').split(/\s+/).filter(Boolean).join('\n'),
      'runtime-option-raw': '',
    }),
  });
  if (!res.ok) return httpFailure(res, 'wandbox');

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
function classifyWandbox(r, timeMs) {
  const compilerErr = (r.compiler_error || '').trim();
  const stdout = (r.program_output || '').trim();
  const stderr = (r.program_error || '').trim();
  const programMsg = (r.program_message || '').trim();
  const status = parseInt(r.status, 10) || 0;

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

async function runGodbolt(code, input, lang) {
  const gb = GODBOLT_MAP[lang];
  const res = await postJson({
    hostname: 'godbolt.org',
    path: `/api/compiler/${encodeURIComponent(gb.id)}/compile`,
    agent: AGENTS.godbolt,
    payload: JSON.stringify({
      source: code,
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
  if (!res.ok) return httpFailure(res, 'godbolt');
  return classifyGodbolt(res.body, res.timeMs);
}

/** Turn a Kotlin Playground response into a verdict. */
function classifyKotlin(r, timeMs) {
  // `errors` carries warnings too ("Variable is unused", severity WARNING).
  // Treating the array's mere presence as a compile error used to fail
  // perfectly good programs.
  const errors = Object.values(r.errors || {}).flat().filter((e) => !e.severity || e.severity === 'ERROR');
  if (errors.length) {
    return {
      stdout: '', stderr: errors.map((e) => e.message || JSON.stringify(e)).join('\n'),
      exitCode: 1, timeMs, verdict: 'CE', engine: 'kotlin',
    };
  }
  const text = r.text || '';
  const stdout = text.replace(/<errStream>[\s\S]*?<\/errStream>/g, '').replace(/<\/?outStream>/g, '').trim();
  const stderr = (text.match(/<errStream>([\s\S]*?)<\/errStream>/)?.[1] || '').trim();
  if (r.exception) {
    const ex = r.exception.fullName || r.exception.message || 'Runtime exception';
    return { stdout, stderr: stderr || ex, exitCode: 1, timeMs, verdict: 'RE', engine: 'kotlin' };
  }
  return { stdout, stderr, exitCode: 0, timeMs, verdict: null, engine: 'kotlin' };
}

/** Turn a Compiler Explorer response into a verdict. */
function classifyGodbolt(r, timeMs) {
  const join = (arr) => (arr || []).map((x) => x.text).join('\n');
  const strip = (v) => v.replace(/\x1b\[[0-9;]*m/g, '');
  if (!r.didExecute) {
    const msg = strip(join(r.buildResult && r.buildResult.stderr) || join(r.stderr) || 'Build failed')
      .replace(/^Build failed\n?/, '').trim();
    return { stdout: '', stderr: msg, exitCode: 1, timeMs, verdict: 'CE', engine: 'godbolt' };
  }
  const stdout = join(r.stdout).trim();
  const stderr = strip(join(r.stderr)).trim();
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
  let i = 0;
  while (i < lines.length && /^\s*(package\s|import\s|@file:|\/\/|$)/.test(lines[i])) i++;
  return [...lines.slice(0, i), pre, ...lines.slice(i)].join('\n').replace(/System\.`in`/g, '__nxIn');
}

async function runKotlin(code, input) {
  const res = await postJson({
    hostname: 'api.kotlinlang.org',
    path: '/api/2.1.20/compiler/run',
    agent: AGENTS.kotlin,
    payload: JSON.stringify({
      args: '',
      confType: 'java',
      files: [{ name: 'File.kt', text: injectKotlinStdin(code, input), publicId: '' }],
    }),
  });
  if (!res.ok) return httpFailure(res, 'kotlin');
  return classifyKotlin(res.body, res.timeMs);
}

/** Turn a failed HTTP exchange into a judge result. */
function httpFailure(res, engine) {
  if (res.timedOut) {
    return {
      stdout: '',
      stderr: `The ${engine} sandbox did not answer within ${Math.round(REQUEST_TIMEOUT / 1000)}s — the program may be stuck in a loop.`,
      exitCode: -1, timeMs: res.timeMs, verdict: 'TLE', engine, _transient: false,
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

const RETRY_DELAYS = [400, 1200];

async function dispatch(code, input, lang, engine) {
  if (engine === 'wandbox') return runWandbox(code, input, lang);
  if (engine === 'godbolt') return runGodbolt(code, input, lang);
  return runKotlin(code, input);
}

/**
 * Run `code` against `input` on whichever sandbox owns `lang`.
 *
 * Cached results are returned immediately; identical concurrent calls share a
 * single request; transient failures (network blips, 429, 5xx, HTML error
 * pages) are retried with backoff before giving up.
 */
async function remoteRun(code, input, lang, opts = {}) {
  const engine = engineFor(lang);
  if (!engine) {
    return {
      stdout: '', stderr: `No sandbox can run ${lang} — pick another language.`,
      exitCode: -1, timeMs: 0, verdict: 'CE', engine: null,
    };
  }

  const key = cacheKey(engine, lang, code, input);
  if (!opts.noCache) {
    const hit = cacheGet(key);
    if (hit) return hit;
    const pending = inflight.get(key);
    if (pending) return { ...(await pending), cached: true };
  }

  const work = (async () => {
    let result;
    for (let attempt = 0; ; attempt++) {
      result = await dispatch(code, input, lang, engine);
      if (!result._transient || attempt >= RETRY_DELAYS.length) break;
      await sleep(RETRY_DELAYS[attempt]);
    }
    delete result._transient;
    return result;
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
  classifyWandbox,
  classifyKotlin,
  classifyGodbolt,
  hasRemote,
  engineFor,
  clearCache,
  injectKotlinStdin,
  WANDBOX_MAP,
  GODBOLT_MAP,
  REQUEST_TIMEOUT,
};
