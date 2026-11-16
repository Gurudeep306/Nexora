/**
 * Self-hosted Piston (https://github.com/engineer-man/piston) judge backend.
 *
 * Enabled with JUDGE_MODE=piston. Code then runs on a Piston instance next to
 * the API (PISTON_URL, default http://127.0.0.1:2000) instead of the public
 * sandboxes. Piston only answers for the languages mapped below that are also
 * listed in PISTON_LANGUAGES (when set — setup.sh writes the ones that passed
 * its smoke test there); everything else, and any run Piston itself fails on
 * (down, unknown runtime, internal error), falls back to Wandbox / Compiler
 * Explorer / Kotlin Playground exactly as JUDGE_MODE=remote does.
 *
 * Results use the same shape as remote-exec.js:
 *   { stdout, stderr, exitCode, timeMs, verdict, engine }
 * plus `_pistonFailed: true` when the run should be retried elsewhere.
 */

/** App language id → Piston language (name or alias) and source file name. */
const PISTON_MAP = {
  cpp:        { language: 'c++',        file: 'main.cpp' },
  c:          { language: 'c',          file: 'main.c' },
  python:     { language: 'python',     file: 'main.py' },
  java:       { language: 'java',       file: 'Main.java' },
  javascript: { language: 'javascript', file: 'main.js' },
  typescript: { language: 'typescript', file: 'main.ts' },
  csharp:     { language: 'csharp',     file: 'main.cs' },
  go:         { language: 'go',         file: 'main.go' },
  rust:       { language: 'rust',       file: 'main.rs' },
  kotlin:     { language: 'kotlin',     file: 'main.kt' },
  ruby:       { language: 'ruby',       file: 'main.rb' },
  php:        { language: 'php',        file: 'main.php' },
  perl:       { language: 'perl',       file: 'main.pl' },
  lua:        { language: 'lua',        file: 'main.lua' },
  shell:      { language: 'bash',       file: 'main.sh' },
  r:          { language: 'rscript',    file: 'main.r' },
  scala:      { language: 'scala',      file: 'main.scala' },
  swift:      { language: 'swift',      file: 'main.swift' },
  dart:       { language: 'dart',       file: 'main.dart' },
  powershell: { language: 'powershell', file: 'main.ps1' },
  julia:      { language: 'julia',      file: 'main.jl' },
  fsharp:     { language: 'fsharp.net', file: 'main.fsx' },
  clojure:    { language: 'clojure',    file: 'main.clj' },
  pascal:     { language: 'pascal',     file: 'main.pas' },
  elixir:     { language: 'elixir',     file: 'main.exs' },
  haskell:    { language: 'haskell',    file: 'main.hs' },
  ocaml:      { language: 'ocaml',      file: 'main.ml' },
  d:          { language: 'd',          file: 'main.d' },
  nim:        { language: 'nim',        file: 'main.nim' },
  zig:        { language: 'zig',        file: 'main.zig' },
  crystal:    { language: 'crystal',    file: 'main.cr' },
  groovy:     { language: 'groovy',     file: 'main.groovy' },
  commonlisp: { language: 'lisp',       file: 'main.lisp' },
};

/** Piston packages setup.sh installs (package name as in /api/v2/packages). */
const PISTON_PACKAGES = [
  'gcc', 'python', 'java', 'node', 'typescript', 'mono', 'go', 'rust',
  'kotlin', 'ruby', 'php', 'perl', 'lua', 'bash',
  // Every other language the judge offers, so our own runner covers them
  // all (Clojure, PowerShell, Groovy and Nim have no free public runner).
  // A name the package index does not list is skipped by setup.sh.
  'rscript', 'scala', 'swift', 'dart', 'pwsh', 'julia', 'dotnet', 'clojure',
  'freepascal', 'elixir', 'haskell', 'ocaml', 'dmd', 'nim', 'zig', 'crystal',
  'groovy', 'sbcl',
];

function pistonEnabled(env = process.env) {
  return env.JUDGE_MODE === 'piston';
}

const splitList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

/**
 * Our own runners, in order. PISTON_URL may list several servers separated by
 * commas (say Oracle, Hetzner and AWS); each one backs up the others, and the
 * free public sandboxes stay behind them all. PISTON_TOKEN may list one token
 * per server in the same order, or a single token shared by every server.
 */
function pistonServers(env = process.env) {
  const urls = splitList(env.PISTON_URL);
  if (!urls.length) urls.push('http://127.0.0.1:2000');
  const tokens = splitList(env.PISTON_TOKEN);
  return urls.map((u, i) => ({
    url: u.replace(/\/+$/, ''),
    token: tokens.length === 1 ? tokens[0] : tokens[i] || '',
  }));
}

/** Engine name of server i: 'piston', then 'piston2', 'piston3', … */
const pistonEngineName = (i) => (i === 0 ? 'piston' : `piston${i + 1}`);

/** Server index of a Piston engine name, or -1. */
function pistonIndex(engine) {
  const m = /^piston(\d*)$/.exec(String(engine || ''));
  if (!m) return -1;
  return m[1] ? Number(m[1]) - 1 : 0;
}

/** The Piston engine names for the current env, in order. */
function pistonEngines(env = process.env) {
  return pistonServers(env).map((_, i) => pistonEngineName(i));
}

function pistonUrl(env = process.env) {
  return pistonServers(env)[0].url;
}

/** The app languages Piston may answer for under the current env. */
function pistonLanguages(env = process.env) {
  const only = (env.PISTON_LANGUAGES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const all = Object.keys(PISTON_MAP);
  return only.length ? all.filter((l) => only.includes(l)) : all;
}

function usesPiston(lang, env = process.env) {
  return pistonEnabled(env) && pistonLanguages(env).includes(lang);
}

/** Request body for POST /api/v2/execute. */
function buildPistonRequest(code, input, lang, env = process.env) {
  const p = PISTON_MAP[lang];
  if (!p) return null;
  return {
    language: p.language,
    version: env.PISTON_VERSION || '*',
    files: [{ name: p.file, content: code }],
    stdin: input || '',
    args: [],
    compile_timeout: Number(env.PISTON_COMPILE_TIMEOUT_MS) || 30000,
    run_timeout: Number(env.PISTON_RUN_TIMEOUT_MS) || 10000,
  };
}

const failed = (msg, timeMs) => ({
  stdout: '', stderr: `Piston: ${msg}`, exitCode: -1, timeMs, verdict: 'RE', engine: 'piston', _pistonFailed: true,
});

/** Turn a Piston /execute response into a verdict. */
function classifyPiston(r, timeMs = 0) {
  if (!r || typeof r !== 'object' || !r.run) {
    return failed((r && r.message) || 'unexpected response', timeMs);
  }
  const c = r.compile;
  if (c && (c.code !== 0 || c.signal || (c.status && c.status !== 'OK'))) {
    if (c.status === 'XX') return failed(c.message || 'internal error while compiling', timeMs);
    if (/Exec format error/i.test(c.stderr || c.output || '')) return failed('this compiler does not run on this server', timeMs);
    const msg = (c.stderr || c.output || c.message || 'Compilation failed').trim();
    if (c.status === 'TO') {
      return { stdout: '', stderr: msg || 'Compilation timed out', exitCode: -1, timeMs, verdict: 'TLE', engine: 'piston' };
    }
    return { stdout: '', stderr: msg, exitCode: 1, timeMs, verdict: 'CE', engine: 'piston' };
  }
  const run = r.run;
  const stdout = (run.stdout || '').trimEnd();
  const stderr = (run.stderr || '').trim();
  const t = Number.isFinite(run.wall_time) ? run.wall_time : timeMs;
  if (run.status === 'XX') return failed(run.message || 'internal error', timeMs);
  // A runtime built for another CPU (an x86-only package on an ARM runner) is
  // the runner's fault, not the student's: let the next runner take it.
  if (/Exec format error/i.test(stderr)) {
    return failed('this runtime does not run on this server', timeMs);
  }
  // Older Piston builds have no `status`; a SIGKILL there is the time limit.
  if (run.status === 'TO' || (!run.status && run.signal === 'SIGKILL')) {
    return { stdout, stderr: stderr || 'Time limit exceeded', exitCode: -1, timeMs: t, verdict: 'TLE', engine: 'piston' };
  }
  if (run.signal || (run.code !== 0 && run.code !== null && run.code !== undefined) || run.status) {
    const why = stderr || run.message || (run.signal ? `Killed by signal ${run.signal}` : '');
    return { stdout, stderr: why, exitCode: run.code || 1, timeMs: t, verdict: 'RE', engine: 'piston' };
  }
  return { stdout, stderr, exitCode: 0, timeMs: t, verdict: null, engine: 'piston' };
}

/**
 * Run on Piston. Never throws; `_pistonFailed` marks "Piston could not do
 * it" (network, HTTP error, unknown runtime) so the caller can fall back.
 */
async function runPiston(code, input, lang, { env = process.env, fetchImpl = globalThis.fetch, server = 0 } = {}) {
  const target = pistonServers(env)[server];
  if (!target) return failed(`no server number ${server + 1}`, 0);
  const body = buildPistonRequest(code, input, lang, env);
  if (!body) return failed(`no runtime mapping for ${lang}`, 0);
  const start = Date.now();
  const timeout = body.compile_timeout + body.run_timeout + 15000;
  try {
    const res = await fetchImpl(`${target.url}/api/v2/execute`, {
      method: 'POST',
      // PISTON_TOKEN: sent as a bearer token when Piston sits on another machine
      // behind a proxy that checks it (docs/ops/fast-judge.md).
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(target.token ? { Authorization: `Bearer ${target.token}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    const timeMs = Date.now() - start;
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) return failed((data && data.message) || `HTTP ${res.status}`, timeMs);
    return classifyPiston(data, timeMs);
  } catch (e) {
    return failed(e && e.name === 'TimeoutError' ? 'timed out' : (e && e.message) || 'unreachable', Date.now() - start);
  }
}

module.exports = {
  PISTON_MAP,
  PISTON_PACKAGES,
  pistonEnabled,
  pistonUrl,
  pistonServers,
  pistonEngines,
  pistonEngineName,
  pistonIndex,
  pistonLanguages,
  usesPiston,
  buildPistonRequest,
  classifyPiston,
  runPiston,
};
